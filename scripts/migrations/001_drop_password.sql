-- Migration 001: remove vestigial pre-Clerk credential scaffolding.
-- The players.password column is never read (no bcrypt.compare anywhere);
-- Clerk owns identity. Also relax avatar NOT NULL so players created before
-- an image upload are valid (real avatar is set later via the upload flow).
ALTER TABLE players DROP COLUMN IF EXISTS password;
ALTER TABLE players ALTER COLUMN avatar DROP NOT NULL;
