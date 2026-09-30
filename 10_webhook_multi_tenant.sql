-- Add webhook token to companies table for multi-tenant webhook validation
ALTER TABLE companies
ADD COLUMN asaas_webhook_token text;

-- Add company_id to asaas_webhook_events to separate logs per company
ALTER TABLE asaas_webhook_events
ADD COLUMN company_id uuid REFERENCES companies(id);

-- Update RLS policies if necessary (assuming they use company_id for isolation)
-- Optional: if you have RLS on asaas_webhook_events
-- ALTER TABLE asaas_webhook_events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own webhook events" 
-- ON asaas_webhook_events FOR SELECT 
-- USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
