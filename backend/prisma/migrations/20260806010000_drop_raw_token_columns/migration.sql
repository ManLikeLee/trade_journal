-- Drop the raw credential columns, now that every value has been hashed into
-- refresh_token_hash / api_key_hash by src/scripts/backfill-token-hashes.ts.
--
-- The guard below aborts the migration if any row still holds a raw value with
-- no corresponding hash. Dropping these columns is irreversible and would
-- silently invalidate a live API key or sign a user out, so it must not run
-- against a database that has not been backfilled.
DO $$
DECLARE
  unhashed_sessions INT;
  unhashed_accounts INT;
BEGIN
  SELECT count(*) INTO unhashed_sessions
    FROM sessions WHERE refresh_token IS NOT NULL AND refresh_token_hash IS NULL;
  SELECT count(*) INTO unhashed_accounts
    FROM accounts WHERE api_key IS NOT NULL AND api_key_hash IS NULL;

  IF unhashed_sessions > 0 OR unhashed_accounts > 0 THEN
    RAISE EXCEPTION
      'Refusing to drop raw token columns: % session(s) and % account(s) are not yet hashed. Run: npx tsx src/scripts/backfill-token-hashes.ts --apply',
      unhashed_sessions, unhashed_accounts;
  END IF;
END $$;

-- DropIndex
DROP INDEX "sessions_refresh_token_key";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "api_key";

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "refresh_token";
