-- =============================================================================
-- Auto-update horse (vehicle) status when assigned to/unassigned from loads
-- =============================================================================

-- Function to update horse status to 'in_use' when assigned to a load
CREATE OR REPLACE FUNCTION update_horse_status_on_load_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- If a horse is being assigned (and wasn't assigned before)
  IF NEW.horse_id IS NOT NULL AND (OLD.horse_id IS NULL OR OLD.horse_id != NEW.horse_id) THEN
    UPDATE ceva_horses
    SET status = 'in_use'
    WHERE id = NEW.horse_id;
  END IF;

  -- If a horse is being unassigned
  IF OLD.horse_id IS NOT NULL AND NEW.horse_id IS NULL THEN
    -- Check if this horse has any other active loads
    PERFORM 1
    FROM ceva_loads
    WHERE horse_id = OLD.horse_id
      AND id != NEW.id
      AND status IN ('assigned', 'in_transit')
    LIMIT 1;

    -- If no other active loads, set status back to 'available'
    IF NOT FOUND THEN
      UPDATE ceva_horses
      SET status = 'available'
      WHERE id = OLD.horse_id;
    END IF;
  END IF;

  -- If load is being delivered or cancelled, check if horse should be set to available
  IF NEW.status IN ('delivered', 'cancelled') AND OLD.status NOT IN ('delivered', 'cancelled') AND NEW.horse_id IS NOT NULL THEN
    -- Check if this horse has any other active loads
    PERFORM 1
    FROM ceva_loads
    WHERE horse_id = NEW.horse_id
      AND id != NEW.id
      AND status IN ('assigned', 'in_transit')
    LIMIT 1;

    -- If no other active loads, set status back to 'available'
    IF NOT FOUND THEN
      UPDATE ceva_horses
      SET status = 'available'
      WHERE id = NEW.horse_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_horse_status ON ceva_loads;

-- Create trigger on ceva_loads table
CREATE TRIGGER trigger_update_horse_status
AFTER INSERT OR UPDATE ON ceva_loads
FOR EACH ROW
EXECUTE FUNCTION update_horse_status_on_load_assignment();

-- Also create a trigger for DELETE
CREATE OR REPLACE FUNCTION update_horse_status_on_load_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.horse_id IS NOT NULL THEN
    -- Check if this horse has any other active loads
    PERFORM 1
    FROM ceva_loads
    WHERE horse_id = OLD.horse_id
      AND id != OLD.id
      AND status IN ('assigned', 'in_transit')
    LIMIT 1;

    -- If no other active loads, set status back to 'available'
    IF NOT FOUND THEN
      UPDATE ceva_horses
      SET status = 'available'
      WHERE id = OLD.horse_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_horse_status_on_delete ON ceva_loads;

CREATE TRIGGER trigger_update_horse_status_on_delete
AFTER DELETE ON ceva_loads
FOR EACH ROW
EXECUTE FUNCTION update_horse_status_on_load_deletion();

-- Comments
COMMENT ON FUNCTION update_horse_status_on_load_assignment() IS 'Automatically updates horse status to in_use when assigned to a load, and back to available when unassigned';
COMMENT ON FUNCTION update_horse_status_on_load_deletion() IS 'Automatically updates horse status to available when load is deleted';
