-- ==================================================================================
-- FIX EXISTING LOADS - SET CLIENT_ID BASED ON CLIENT NAME
-- ==================================================================================
-- This script updates existing loads that don't have a client_id set
-- by matching the client text field with the company_name in ceva_clients table
-- ==================================================================================

-- Update loads with matching client names
UPDATE ceva_loads l
SET client_id = c.id
FROM ceva_clients c
WHERE l.client_id IS NULL
  AND l.client = c.name;

-- Verify the update
SELECT
  COUNT(*) as total_loads,
  COUNT(client_id) as loads_with_client_id,
  COUNT(*) - COUNT(client_id) as loads_without_client_id
FROM ceva_loads;

-- Show loads that still don't have a client_id (for manual review)
SELECT
  id,
  load_number,
  order_number,
  client,
  client_contact,
  origin,
  destination,
  status
FROM ceva_loads
WHERE client_id IS NULL
ORDER BY created_at DESC;
