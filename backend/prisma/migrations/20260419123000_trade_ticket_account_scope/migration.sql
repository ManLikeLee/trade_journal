-- Scope external ticket uniqueness to account to avoid cross-account collisions
DROP INDEX IF EXISTS "trades_external_ticket_key";

CREATE UNIQUE INDEX "trades_account_id_external_ticket_key"
ON "trades"("account_id", "external_ticket");
