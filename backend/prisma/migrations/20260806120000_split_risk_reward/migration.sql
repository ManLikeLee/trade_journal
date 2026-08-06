-- Split the ambiguous `risk_reward` into two named metrics.
--
-- The old column was resolved with `takeProfit ?? exitPrice` on write and
-- `exitPrice ?? takeProfit` on read, so its stored values are a MIX of planned
-- and realised depending on which fields each row happened to have. They are
-- therefore recomputed from the stored prices, not copied: copying would carry
-- the ambiguity forward under a name that asserts it is gone.
--
-- risk      = entry→stop   (direction-aware, must be > 0 or the ratio is undefined)
-- planned   = (entry→take_profit) / risk
-- realised  = (entry→exit_price)  / risk

ALTER TABLE "trades"
  ADD COLUMN "planned_risk_reward"  DECIMAL(10,4),
  ADD COLUMN "realised_risk_reward" DECIMAL(10,4);

UPDATE "trades" SET
  planned_risk_reward = CASE
    WHEN stop_loss IS NULL OR take_profit IS NULL THEN NULL
    WHEN (CASE WHEN direction = 'BUY' THEN entry_price - stop_loss
                                      ELSE stop_loss - entry_price END) <= 0 THEN NULL
    ELSE round(
      (CASE WHEN direction = 'BUY' THEN take_profit - entry_price
                                   ELSE entry_price - take_profit END)
      / (CASE WHEN direction = 'BUY' THEN entry_price - stop_loss
                                     ELSE stop_loss - entry_price END), 4)
  END,
  realised_risk_reward = CASE
    WHEN stop_loss IS NULL OR exit_price IS NULL THEN NULL
    WHEN (CASE WHEN direction = 'BUY' THEN entry_price - stop_loss
                                      ELSE stop_loss - entry_price END) <= 0 THEN NULL
    ELSE round(
      (CASE WHEN direction = 'BUY' THEN exit_price - entry_price
                                   ELSE entry_price - exit_price END)
      / (CASE WHEN direction = 'BUY' THEN entry_price - stop_loss
                                     ELSE stop_loss - entry_price END), 4)
  END;

ALTER TABLE "trades" DROP COLUMN "risk_reward";
