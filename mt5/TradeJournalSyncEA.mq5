//+------------------------------------------------------------------+
//|                                         TradeJournalSyncEA.mq5   |
//|  Syncs MT5 open positions and closed trades to Trade Journal      |
//|  backend in a single batched request per sync cycle.              |
//|                                                                    |
//|  REQUIRED SETUP IN MT5 BEFORE USE:                                |
//|    Tools → Options → Expert Advisors                              |
//|    ☑ Allow WebRequest for listed URL                              |
//|    Add URL: http://127.0.0.1:5000                                  |
//|                                                                    |
//|  Endpoint  : POST /api/mt-sync/trades                             |
//|  Auth      : x-api-key header (copy from Account settings)        |
//+------------------------------------------------------------------+
#property copyright "TradeJournal"
#property link      ""
#property version   "2.00"
#property strict

//--- Inputs
input string ApiBaseUrl          = "http://127.0.0.1:5000"; // Backend base URL
input string ApiKey              = "";                        // x-api-key (Account API key)
input int    SyncIntervalSeconds = 10;                        // Sync interval in seconds
input bool   SyncOpenTrades      = true;                      // Sync open positions
input bool   SyncClosedTrades    = true;                      // Sync closed trades
input int    HistoryDaysBack     = 30;                        // Days of closed trade history to sync

//--- Session state: closed deal tickets already synced this session
ulong g_syncedClosedDealTickets[];

//+------------------------------------------------------------------+
//| Escape special characters for JSON string values                 |
//+------------------------------------------------------------------+
string JsonEscape(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\n", "\\n");
   StringReplace(value, "\r", "\\r");
   StringReplace(value, "\t", "\\t");
   return value;
}

//+------------------------------------------------------------------+
//| Format a datetime as ISO 8601 UTC: 2026-04-18T17:22:06.000Z     |
//+------------------------------------------------------------------+
string ToIso8601(datetime ts)
{
   MqlDateTime dt;
   TimeToStruct(ts, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02d.000Z",
                       dt.year, dt.mon, dt.day,
                       dt.hour, dt.min, dt.sec);
}

//+------------------------------------------------------------------+
//| Check whether a ulong value exists in a dynamic array            |
//+------------------------------------------------------------------+
bool ArrayContainsUlong(ulong &arr[], ulong value)
{
   int n = ArraySize(arr);
   for(int i = 0; i < n; i++)
   {
      if(arr[i] == value) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Append a ulong value to a dynamic array                          |
//+------------------------------------------------------------------+
void ArrayPushUlong(ulong &arr[], ulong value)
{
   int n = ArraySize(arr);
   ArrayResize(arr, n + 1);
   arr[n] = value;
}

//+------------------------------------------------------------------+
//| Build a JSON trade object for an open position                   |
//+------------------------------------------------------------------+
bool BuildOpenTradeJson(ulong positionTicket, string &jsonOut)
{
   if(!PositionSelectByTicket(positionTicket)) return false;

   string symbol     = PositionGetString(POSITION_SYMBOL);
   long   posType    = PositionGetInteger(POSITION_TYPE);
   string direction  = (posType == POSITION_TYPE_BUY) ? "BUY" : "SELL";
   double lotSize    = PositionGetDouble(POSITION_VOLUME);
   double entryPrice = PositionGetDouble(POSITION_PRICE_OPEN);
   double sl         = PositionGetDouble(POSITION_SL);
   double tp         = PositionGetDouble(POSITION_TP);
   double pnl        = PositionGetDouble(POSITION_PROFIT);
   double commission = 0.0; // Commission settled at close; not available on open positions
   double swap       = PositionGetDouble(POSITION_SWAP);
   datetime openTime = (datetime)PositionGetInteger(POSITION_TIME);

   jsonOut  = "{";
   jsonOut += "\"ticket\":\""    + (string)positionTicket         + "\"";
   jsonOut += ",\"symbol\":\""   + JsonEscape(symbol)             + "\"";
   jsonOut += ",\"direction\":\"" + direction                     + "\"";
   jsonOut += ",\"lotSize\":"    + DoubleToString(lotSize, 2);
   jsonOut += ",\"entryPrice\":" + DoubleToString(entryPrice, 8);
   jsonOut += ",\"openTime\":\"" + ToIso8601(openTime)            + "\"";
   jsonOut += ",\"pnl\":"        + DoubleToString(pnl, 2);
   jsonOut += ",\"commission\":" + DoubleToString(commission, 2);
   jsonOut += ",\"swap\":"       + DoubleToString(swap, 2);
   jsonOut += ",\"status\":\"OPEN\"";
   if(sl > 0.0) jsonOut += ",\"stopLoss\":"   + DoubleToString(sl, 8);
   if(tp > 0.0) jsonOut += ",\"takeProfit\":" + DoubleToString(tp, 8);
   jsonOut += "}";

   return true;
}

//+------------------------------------------------------------------+
//| Build a JSON trade object for a closed deal (exit deal only)     |
//| Requires HistorySelect to have been called beforehand.           |
//+------------------------------------------------------------------+
bool BuildClosedTradeJson(ulong dealTicket, string &jsonOut)
{
   long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   if(entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_OUT_BY)
      return false;

   ulong positionId  = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   if(positionId == 0) return false;

   string symbol     = HistoryDealGetString(dealTicket,  DEAL_SYMBOL);
   double exitPrice  = HistoryDealGetDouble(dealTicket,  DEAL_PRICE);
   double volume     = HistoryDealGetDouble(dealTicket,  DEAL_VOLUME);
   double profit     = HistoryDealGetDouble(dealTicket,  DEAL_PROFIT);
   double commission = HistoryDealGetDouble(dealTicket,  DEAL_COMMISSION);
   double swap       = HistoryDealGetDouble(dealTicket,  DEAL_SWAP);
   datetime closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

   // Derive direction from the exit deal type (reversed: SELL exit = BUY position)
   long exitDealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   string direction  = (exitDealType == DEAL_TYPE_SELL) ? "BUY" : "SELL";

   // Defaults – overwritten when we find the matching entry deal below
   double   entryPrice = exitPrice;
   datetime openTime   = closeTime;
   double   sl         = 0.0;
   double   tp         = 0.0;

   // Scan loaded history for the entry deal of this position
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      if((ulong)HistoryDealGetInteger(d, DEAL_POSITION_ID) != positionId) continue;

      long e = HistoryDealGetInteger(d, DEAL_ENTRY);
      if(e == DEAL_ENTRY_IN || e == DEAL_ENTRY_INOUT)
      {
         entryPrice = HistoryDealGetDouble(d, DEAL_PRICE);
         openTime   = (datetime)HistoryDealGetInteger(d, DEAL_TIME);
         sl         = HistoryDealGetDouble(d, DEAL_SL);
         tp         = HistoryDealGetDouble(d, DEAL_TP);
         // Direction from the entry deal type (most reliable)
         long entryDealType = HistoryDealGetInteger(d, DEAL_TYPE);
         direction  = (entryDealType == DEAL_TYPE_BUY) ? "BUY" : "SELL";
         break;
      }
   }

   double totalPnl = profit + commission + swap;

   // Use positionId as the stable ticket so open→closed updates the same row
   jsonOut  = "{";
   jsonOut += "\"ticket\":\""     + (string)positionId             + "\"";
   jsonOut += ",\"symbol\":\""    + JsonEscape(symbol)             + "\"";
   jsonOut += ",\"direction\":\"" + direction                      + "\"";
   jsonOut += ",\"lotSize\":"     + DoubleToString(volume, 2);
   jsonOut += ",\"entryPrice\":"  + DoubleToString(entryPrice, 8);
   jsonOut += ",\"exitPrice\":"   + DoubleToString(exitPrice, 8);
   jsonOut += ",\"openTime\":\""  + ToIso8601(openTime)            + "\"";
   jsonOut += ",\"closeTime\":\"" + ToIso8601(closeTime)           + "\"";
   jsonOut += ",\"pnl\":"         + DoubleToString(totalPnl, 2);
   jsonOut += ",\"commission\":"  + DoubleToString(commission, 2);
   jsonOut += ",\"swap\":"        + DoubleToString(swap, 2);
   jsonOut += ",\"status\":\"CLOSED\"";
   if(sl > 0.0) jsonOut += ",\"stopLoss\":"   + DoubleToString(sl, 8);
   if(tp > 0.0) jsonOut += ",\"takeProfit\":" + DoubleToString(tp, 8);
   jsonOut += "}";

   return true;
}

//+------------------------------------------------------------------+
//| Build full payload and POST to /api/mt-sync/trades               |
//+------------------------------------------------------------------+
bool SendBatch(string tradesJson, int tradeCount)
{
   string accountNumber = (string)AccountInfoInteger(ACCOUNT_LOGIN);
   string url           = ApiBaseUrl + "/api/mt-sync/trades";

   string payload  = "{";
   payload += "\"accountNumber\":\"" + accountNumber + "\"";
   payload += ",\"platform\":\"MT5\"";
   payload += ",\"trades\":[" + tradesJson + "]";
   payload += "}";

   string headers = "Content-Type: application/json\r\nx-api-key: " + ApiKey + "\r\n";

   char postData[];
   StringToCharArray(payload, postData, 0, StringLen(payload));

   char   result[];
   string resultHeaders;

   PrintFormat("[TradeJournal] POST %s  (%d trade(s))", url, tradeCount);

   int status = WebRequest("POST", url, headers, 10000, postData, result, resultHeaders);
   string responseBody = CharArrayToString(result);

   //--- WebRequest failure (returns -1)
   if(status == -1)
   {
      int err = GetLastError();
      if(err == 4014)
      {
         PrintFormat("[TradeJournal] ERROR 4014: WebRequest is blocked for '%s'.", ApiBaseUrl);
         Print("[TradeJournal] Fix: Tools → Options → Expert Advisors → Allow WebRequest for listed URL");
         PrintFormat("[TradeJournal]       Add: %s", ApiBaseUrl);
      }
      else
      {
         PrintFormat("[TradeJournal] ERROR: WebRequest failed. GetLastError() = %d", err);
      }
      return false;
   }

   PrintFormat("[TradeJournal] HTTP %d | %s", status, responseBody);

   if(status == 401)
   {
      Print("[TradeJournal] ERROR: HTTP 401 – Invalid or missing API key. Check the ApiKey input.");
      return false;
   }
   if(status == 400)
   {
      PrintFormat("[TradeJournal] ERROR: HTTP 400 – Validation error: %s", responseBody);
      return false;
   }
   if(status >= 500)
   {
      PrintFormat("[TradeJournal] ERROR: HTTP %d – Backend server error: %s", status, responseBody);
      return false;
   }
   if(status < 200 || status >= 300)
   {
      PrintFormat("[TradeJournal] ERROR: Unexpected HTTP status %d", status);
      return false;
   }

   return true;
}

//+------------------------------------------------------------------+
//| Collect all trades and send them in one batch request            |
//+------------------------------------------------------------------+
void RunSync()
{
   if(StringLen(ApiKey) == 0)
   {
      Print("[TradeJournal] ERROR: ApiKey input is empty. Paste your Account API key into the EA inputs.");
      return;
   }

   // Track closed deal tickets being sent in this batch so we can mark
   // them as synced only after a confirmed successful response.
   ulong pendingClosedTickets[];
   ArrayResize(pendingClosedTickets, 0);

   string tradesArray = "";
   int    count       = 0;

   //--- Open positions
   if(SyncOpenTrades)
   {
      int posTotal = PositionsTotal();
      for(int i = 0; i < posTotal; i++)
      {
         ulong ticket = PositionGetTicket(i);
         if(ticket == 0) continue;

         string tradeJson = "";
         if(!BuildOpenTradeJson(ticket, tradeJson)) continue;

         if(count > 0) tradesArray += ",";
         tradesArray += tradeJson;
         count++;
      }
   }

   //--- Closed deals
   if(SyncClosedTrades)
   {
      datetime fromTime = TimeCurrent() - (datetime)(HistoryDaysBack * 86400);
      if(!HistorySelect(fromTime, TimeCurrent()))
      {
         Print("[TradeJournal] WARNING: HistorySelect failed – closed trades skipped this cycle.");
      }
      else
      {
         int dealTotal = HistoryDealsTotal();
         for(int i = 0; i < dealTotal; i++)
         {
            ulong dealTicket = HistoryDealGetTicket(i);
            if(dealTicket == 0) continue;

            // Already successfully synced this session – skip
            if(ArrayContainsUlong(g_syncedClosedDealTickets, dealTicket)) continue;

            // Only process exit deals (entry deals are not closed trades)
            long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
            if(entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_OUT_BY) continue;

            string tradeJson = "";
            if(!BuildClosedTradeJson(dealTicket, tradeJson)) continue;

            if(count > 0) tradesArray += ",";
            tradesArray += tradeJson;
            count++;
            ArrayPushUlong(pendingClosedTickets, dealTicket);
         }
      }
   }

   if(count == 0)
   {
      Print("[TradeJournal] No trades to sync this cycle.");
      return;
   }

   PrintFormat("[TradeJournal] Prepared %d trade(s). Sending batch…", count);

   if(SendBatch(tradesArray, count))
   {
      // Permanently skip these closed deals for the rest of the session
      int n = ArraySize(pendingClosedTickets);
      for(int i = 0; i < n; i++)
         ArrayPushUlong(g_syncedClosedDealTickets, pendingClosedTickets[i]);

      PrintFormat("[TradeJournal] Sync OK – %d trade(s) delivered.", count);
   }
}

//+------------------------------------------------------------------+
//| EA Initialisation                                                |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("=======================================================");
   Print("[TradeJournal] EA v2.00 started");
   PrintFormat("[TradeJournal] Backend URL  : %s", ApiBaseUrl);
   PrintFormat("[TradeJournal] Account      : %I64d", AccountInfoInteger(ACCOUNT_LOGIN));
   PrintFormat("[TradeJournal] Sync interval: %d seconds", SyncIntervalSeconds);
   PrintFormat("[TradeJournal] Sync open    : %s", SyncOpenTrades   ? "YES" : "NO");
   PrintFormat("[TradeJournal] Sync closed  : %s", SyncClosedTrades ? "YES" : "NO");
   PrintFormat("[TradeJournal] History days : %d", HistoryDaysBack);
   Print("-------------------------------------------------------");
   Print("[TradeJournal] REMINDER: Ensure WebRequest is allowed.");
   Print("[TradeJournal]   Tools → Options → Expert Advisors");
   Print("[TradeJournal]   ☑ Allow WebRequest for listed URL");
   PrintFormat("[TradeJournal]   Add: %s", ApiBaseUrl);
   Print("=======================================================");

   if(StringLen(ApiKey) == 0)
      Print("[TradeJournal] WARNING: ApiKey is empty – sync will not run until it is set.");

   if(SyncIntervalSeconds < 1)
   {
      Print("[TradeJournal] ERROR: SyncIntervalSeconds must be >= 1. EA will not start.");
      return INIT_PARAMETERS_INCORRECT;
   }

   EventSetTimer(SyncIntervalSeconds);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| EA De-initialisation                                             |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("[TradeJournal] EA stopped.");
}

//+------------------------------------------------------------------+
//| Timer – runs every SyncIntervalSeconds                           |
//+------------------------------------------------------------------+
void OnTimer()
{
   RunSync();
}

//+------------------------------------------------------------------+
//| Trade transaction – trigger immediate sync on deal events        |
//+------------------------------------------------------------------+
void OnTradeTransaction(
   const MqlTradeTransaction &trans,
   const MqlTradeRequest     &request,
   const MqlTradeResult      &result)
{
   // Only act on new deal additions (open or close events)
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
   if(trans.deal  == 0) return;

   // Trigger an immediate sync so the backend is updated without waiting
   // for the next timer tick. The regular timer will still run afterwards.
   RunSync();
}
