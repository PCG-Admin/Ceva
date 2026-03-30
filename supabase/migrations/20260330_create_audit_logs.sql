-- Create audit logs table for security monitoring
-- This table tracks all security-related events and user actions

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  resource TEXT,
  action TEXT,
  details JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Create composite index for common queries
CREATE INDEX idx_audit_logs_user_event ON audit_logs(user_id, event_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM ceva_profiles
      WHERE ceva_profiles.id = auth.uid()
      AND ceva_profiles.role = 'admin'
    )
  );

-- Policy: System can insert audit logs (service role)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO service_role;

-- Create a view for security dashboard
CREATE OR REPLACE VIEW audit_logs_summary AS
SELECT
  event_type,
  severity,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN success = false THEN 1 END) as failed_attempts,
  MAX(created_at) as last_occurrence
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY event_count DESC;

-- Grant permissions on view
GRANT SELECT ON audit_logs_summary TO authenticated;

-- Create function to clean old audit logs (retention policy)
CREATE OR REPLACE FUNCTION clean_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get security metrics
CREATE OR REPLACE FUNCTION get_security_metrics(time_period INTERVAL DEFAULT '24 hours')
RETURNS TABLE (
  total_events BIGINT,
  failed_events BIGINT,
  critical_events BIGINT,
  unique_users BIGINT,
  suspicious_ips BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_events,
    COUNT(CASE WHEN success = false THEN 1 END)::BIGINT as failed_events,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END)::BIGINT as critical_events,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    COUNT(DISTINCT CASE
      WHEN success = false AND event_type LIKE 'security.%'
      THEN ip_address
    END)::BIGINT as suspicious_ips
  FROM audit_logs
  WHERE created_at >= NOW() - time_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE audit_logs IS 'Security audit log tracking all system events and user actions';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event (e.g., auth.login, user.create, security.sql_injection_attempt)';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level: low, medium, high, or critical';
COMMENT ON COLUMN audit_logs.details IS 'Additional context and metadata in JSON format';
COMMENT ON FUNCTION clean_old_audit_logs IS 'Removes audit logs older than specified days (default 90 days)';
COMMENT ON FUNCTION get_security_metrics IS 'Returns security metrics for the specified time period';
