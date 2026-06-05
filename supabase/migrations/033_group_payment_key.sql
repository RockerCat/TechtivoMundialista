-- Adds a payment_key column to groups.
-- Organizers set this to their Nequi/Bancolombia transfer key so invited
-- participants know where to send the entry fee before joining.
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS payment_key TEXT;
