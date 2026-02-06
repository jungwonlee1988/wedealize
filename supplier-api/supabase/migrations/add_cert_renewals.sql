-- Migration: Add certificate_number, updated_at to supplier_certifications
-- and create certification_renewals table

ALTER TABLE supplier_certifications ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(100);
ALTER TABLE supplier_certifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS certification_renewals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    certification_id UUID REFERENCES supplier_certifications(id) ON DELETE CASCADE,
    previous_expiry_date DATE,
    new_expiry_date DATE NOT NULL,
    renewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_renewals_cert ON certification_renewals(certification_id);
ALTER TABLE certification_renewals ENABLE ROW LEVEL SECURITY;

-- Use CREATE OR REPLACE to avoid "destructive operation" warning in Supabase
CREATE OR REPLACE TRIGGER update_supplier_certifications_updated_at
    BEFORE UPDATE ON supplier_certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
