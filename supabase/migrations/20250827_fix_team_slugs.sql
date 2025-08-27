-- Fix team accounts that don't have slugs
-- This is needed for proper URL routing

UPDATE accounts
SET slug = LOWER(
  CONCAT(
    REGEXP_REPLACE(SPLIT_PART(name, ' ', 1), '[^a-zA-Z0-9]', '-', 'g'),
    '-',
    SUBSTRING(id::text, 1, 8)
  )
)
WHERE slug IS NULL 
  AND is_personal_account = false;

-- Add comment to clarify slug requirements
COMMENT ON COLUMN accounts.slug IS 'Unique URL-safe identifier for the account. Required for team accounts to enable proper routing.';