#property strict

input string API_URL = "http://localhost:4000/api/trades/sync";
input string API_KEY = "YOUR_API_KEY_HERE";
input bool   ENABLE_DEBUG_LOGS = true;

ulong g_syncedOpenPositionIds[];
ulong g_syncedCloseDealTickets[];

string EscapeJson(string value) {
  string out = value;
  StringReplace(out, "\\", "\\\\");
  StringReplace(out, "\"", "\\\"");
  return out;
}

void AppendStringField(string &json, bool &firstField, string key, string value) {
  if (!firstField) json += ",";
  firstField = false;
  json += "\"" + key + "\":\"" + EscapeJson(value) + "\"";
}

void AppendNumberField(string &json, bool &firstField, string key, double value, int precision = 5) {
  if (!firstField) json += ",";
  firstField = false;
  json += "\"" + key + "\":" + DoubleToString(value, precision);
}

string ToIso8601(datetime ts) {
  MqlDateTime dt;
  TimeToStruct(ts, dt);
  return StringFormat(
    "%04d-%02d-%02dT%02d:%02d:%02dZ",
    dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec
  );
}

bool ContainsUlong(ulong &arr[], ulong value) {
  int n = ArraySize(arr);
  for (int i = 0; i < n; i++) {
    if (arr[i] == value) return true;
  }
  return false;
}

void PushUlong(ulong &arr[], ulong value) {
  int n = ArraySize(arr);
  ArrayResize(arr, n + 1);
  arr[n] = value;
}

bool SendSyncPayload(string payload, string label, ulong ticketForLog) {
  char postData[];
  StringToCharArray(payload, postData, 0, StringLen(payload));

  string headers = "Content-Type: application/json\r\nX-Api-Key: " + API_KEY;
  char result[];
  string resultHeaders;

  int status = WebRequest("POST", API_URL, headers, 7000, postData, result, resultHeaders);
  string body = CharArrayToString(result);

  if (ENABLE_DEBUG_LOGS) {
    PrintFormat("[TradeJournal][%s] ticket=%I64u status=%d payload=%s", label, ticketForLog, status, payload);
    PrintFormat("[TradeJournal][%s] response=%s", label, body);
  }

  if (status < 200 || status >= 300) {
    PrintFormat("[TradeJournal][%s] sync failed: %d (ticket=%I64u)", label, status, ticketForLog);
    return false;
  }

  return true;
}

bool BuildOpenPayload(ulong positionTicket, string &payloadOut) {
  if (!PositionSelectByTicket(positionTicket)) return false;

  string symbol = PositionGetString(POSITION_SYMBOL);
  long type = PositionGetInteger(POSITION_TYPE);
  string direction = (type == POSITION_TYPE_BUY) ? "BUY" : "SELL";
  double volume = PositionGetDouble(POSITION_VOLUME);
  double entryPrice = PositionGetDouble(POSITION_PRICE_OPEN);
  double sl = PositionGetDouble(POSITION_SL);
  double tp = PositionGetDouble(POSITION_TP);
  datetime openTs = (datetime)PositionGetInteger(POSITION_TIME);

  bool firstField = true;
  string json = "{";

  // Use position ticket as external ticket for open + close updates.
  AppendStringField(json, firstField, "ticket", (string)positionTicket);
  AppendStringField(json, firstField, "source", "MT5");
  AppendStringField(json, firstField, "symbol", symbol);
  AppendStringField(json, firstField, "direction", direction);
  AppendNumberField(json, firstField, "lotSize", volume, 2);
  AppendNumberField(json, firstField, "entryPrice", entryPrice, 5);
  AppendStringField(json, firstField, "openTime", ToIso8601(openTs));

  if (sl > 0.0) AppendNumberField(json, firstField, "stopLoss", sl, 5);
  if (tp > 0.0) AppendNumberField(json, firstField, "takeProfit", tp, 5);

  json += "}";
  payloadOut = json;
  return true;
}

bool BuildClosePayload(ulong dealTicket, string &payloadOut, ulong &positionIdOut) {
  if (!HistoryDealSelect(dealTicket)) return false;

  long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
  if (entryType != DEAL_ENTRY_OUT && entryType != DEAL_ENTRY_OUT_BY) return false;

  ulong positionId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
  if (positionId == 0) return false;

  string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
  long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
  string direction = (dealType == DEAL_TYPE_BUY) ? "BUY" : "SELL";
  double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
  double exitPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
  double dealProfit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
  double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
  double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
  double realizedPnl = dealProfit + commission + swap;
  datetime closeTs = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

  // Best-effort open/deal context from position history when available.
  double entryPrice = exitPrice;
  datetime openTs = closeTs;
  double sl = 0.0;
  double tp = 0.0;

  if (HistorySelect(TimeCurrent() - 86400 * 30, TimeCurrent())) {
    int total = HistoryDealsTotal();
    for (int i = 0; i < total; i++) {
      ulong d = HistoryDealGetTicket(i);
      if (d == 0) continue;
      if ((ulong)HistoryDealGetInteger(d, DEAL_POSITION_ID) != positionId) continue;

      long e = HistoryDealGetInteger(d, DEAL_ENTRY);
      if (e == DEAL_ENTRY_IN || e == DEAL_ENTRY_INOUT) {
        entryPrice = HistoryDealGetDouble(d, DEAL_PRICE);
        openTs = (datetime)HistoryDealGetInteger(d, DEAL_TIME);
        sl = HistoryDealGetDouble(d, DEAL_SL);
        tp = HistoryDealGetDouble(d, DEAL_TP);
        break;
      }
    }
  }

  bool firstField = true;
  string json = "{";

  // Keep same external ticket so backend updates existing row.
  AppendStringField(json, firstField, "ticket", (string)positionId);
  AppendStringField(json, firstField, "source", "MT5");
  AppendStringField(json, firstField, "symbol", symbol);
  AppendStringField(json, firstField, "direction", direction);
  AppendNumberField(json, firstField, "lotSize", volume, 2);
  AppendNumberField(json, firstField, "entryPrice", entryPrice, 5);
  AppendNumberField(json, firstField, "exitPrice", exitPrice, 5);
  AppendStringField(json, firstField, "openTime", ToIso8601(openTs));
  AppendStringField(json, firstField, "closeTime", ToIso8601(closeTs));
  AppendNumberField(json, firstField, "pnl", realizedPnl, 2);

  if (sl > 0.0) AppendNumberField(json, firstField, "stopLoss", sl, 5);
  if (tp > 0.0) AppendNumberField(json, firstField, "takeProfit", tp, 5);

  AppendNumberField(json, firstField, "commission", commission, 2);
  AppendNumberField(json, firstField, "swap", swap, 2);

  json += "}";
  payloadOut = json;
  positionIdOut = positionId;
  return true;
}

void SyncOpenPositionIfNeeded(ulong positionTicket) {
  if (ContainsUlong(g_syncedOpenPositionIds, positionTicket)) return;

  string payload = "";
  if (!BuildOpenPayload(positionTicket, payload)) return;
  if (SendSyncPayload(payload, "OPEN", positionTicket)) {
    PushUlong(g_syncedOpenPositionIds, positionTicket);
  }
}

void SyncClosedDealIfNeeded(ulong dealTicket) {
  if (ContainsUlong(g_syncedCloseDealTickets, dealTicket)) return;

  string payload = "";
  ulong positionId = 0;
  if (!BuildClosePayload(dealTicket, payload, positionId)) return;
  if (SendSyncPayload(payload, "CLOSE", positionId)) {
    PushUlong(g_syncedCloseDealTickets, dealTicket);
  }
}

int OnInit() {
  if (ENABLE_DEBUG_LOGS) {
    Print("[TradeJournal] MT5 sync EA initialized");
  }
  return INIT_SUCCEEDED;
}

void OnTick() {
  // Catch open positions that may not have triggered OnTradeTransaction yet.
  for (int i = 0; i < PositionsTotal(); i++) {
    ulong positionTicket = PositionGetTicket(i);
    if (positionTicket > 0) {
      SyncOpenPositionIfNeeded(positionTicket);
    }
  }
}

void OnTradeTransaction(
  const MqlTradeTransaction &trans,
  const MqlTradeRequest &request,
  const MqlTradeResult &result
) {
  if (trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
  if (trans.deal == 0) return;

  if (!HistoryDealSelect(trans.deal)) return;

  long entry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
  ulong positionId = (ulong)HistoryDealGetInteger(trans.deal, DEAL_POSITION_ID);

  if (entry == DEAL_ENTRY_IN || entry == DEAL_ENTRY_INOUT) {
    if (positionId > 0) SyncOpenPositionIfNeeded(positionId);
    return;
  }

  if (entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY) {
    SyncClosedDealIfNeeded(trans.deal);
  }
}
