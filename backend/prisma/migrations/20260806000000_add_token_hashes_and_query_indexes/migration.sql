-- DropIndex
DROP INDEX "trades_status_idx";

-- DropIndex
DROP INDEX "trades_symbol_idx";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "api_key_hash" TEXT,
ADD COLUMN     "api_key_last4" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "refresh_token_hash" TEXT,
ALTER COLUMN "refresh_token" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_api_key_hash_key" ON "accounts"("api_key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "trades_account_id_status_close_time_idx" ON "trades"("account_id", "status", "close_time");

-- CreateIndex
CREATE INDEX "trades_account_id_open_time_idx" ON "trades"("account_id", "open_time" DESC);

