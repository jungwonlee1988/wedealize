-- WeDealize Supplier Portal Database Schema
-- Run this in Supabase SQL Editor

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    company_name VARCHAR(255) NOT NULL,
    country VARCHAR(50),
    category TEXT[],
    phone VARCHAR(50),
    website VARCHAR(255),
    description TEXT,
    year_established INTEGER,
    employees VARCHAR(50),
    profile_image VARCHAR(500),
    google_id VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    min_price DECIMAL(10, 2),
    max_price DECIMAL(10, 2),
    moq INTEGER,
    moq_unit VARCHAR(50),
    certifications TEXT[], -- Array of certifications
    images TEXT[], -- Array of image URLs
    specifications JSONB,
    status VARCHAR(50) DEFAULT 'active',
    completeness INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255),
    buyer_contact VARCHAR(255),
    buyer_phone VARCHAR(50),
    buyer_address TEXT,
    buyer_country VARCHAR(50),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    incoterms VARCHAR(20),
    payment_terms VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    shipping_info JSONB,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(50) DEFAULT 'pcs',
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Certifications table
CREATE TABLE IF NOT EXISTS supplier_certifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    issuer VARCHAR(255),
    certificate_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    document_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'valid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certification Renewals table
CREATE TABLE IF NOT EXISTS certification_renewals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    certification_id UUID REFERENCES supplier_certifications(id) ON DELETE CASCADE,
    previous_expiry_date DATE,
    new_expiry_date DATE NOT NULL,
    renewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catalog Uploads table (for tracking file processing)
CREATE TABLE IF NOT EXISTS catalog_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    products_extracted INTEGER DEFAULT 0,
    errors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Team Members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',  -- owner, admin, member, viewer
    status VARCHAR(50) DEFAULT 'pending',  -- pending, active, disabled
    invite_token VARCHAR(500),
    invited_by UUID REFERENCES suppliers(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, email)
);

-- Proforma Invoices table
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pi_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    po_number VARCHAR(50),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255),
    buyer_country VARCHAR(50),
    pi_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    credit_discount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    incoterms VARCHAR(20),
    payment_method VARCHAR(50),
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PI Items table
CREATE TABLE IF NOT EXISTS proforma_invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pi_id UUID REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit VARCHAR(50) DEFAULT 'pcs',
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credits table
CREATE TABLE IF NOT EXISTS credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    credit_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50),
    invoice_id UUID REFERENCES proforma_invoices(id) ON DELETE SET NULL,
    buyer_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255),
    product_sku VARCHAR(100),
    reason VARCHAR(50) NOT NULL,
    affected_quantity INTEGER,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    applied_to_pi_id UUID REFERENCES proforma_invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Applications (tracks which credits are applied to which PIs)
CREATE TABLE IF NOT EXISTS credit_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    credit_id UUID REFERENCES credits(id) ON DELETE CASCADE,
    pi_id UUID REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(credit_id, pi_id)
);

-- Accounts (buyer/trade partner) table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    address TEXT,
    contact_name VARCHAR(255),
    contact_position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'USD',
    incoterms VARCHAR(20),
    payment_terms VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buyer Inquiries table
CREATE TABLE IF NOT EXISTS buyer_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    buyer_company VARCHAR(255) NOT NULL,
    buyer_contact VARCHAR(255),
    buyer_email VARCHAR(255),
    buyer_phone VARCHAR(50),
    buyer_country VARCHAR(50),
    message TEXT,
    status VARCHAR(50) DEFAULT 'active',  -- active, responded, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buyer Inquiry Products (M:N relationship)
CREATE TABLE IF NOT EXISTS buyer_inquiry_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inquiry_id UUID REFERENCES buyer_inquiries(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(inquiry_id, product_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_suppliers_category_gin ON suppliers USING GIN (category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_supplier ON notifications(supplier_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(supplier_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_team_members_supplier ON team_members(supplier_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_invite_token ON team_members(invite_token);
CREATE INDEX IF NOT EXISTS idx_pi_supplier ON proforma_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pi_status ON proforma_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pi_buyer ON proforma_invoices(buyer_name);
CREATE INDEX IF NOT EXISTS idx_pi_items_pi ON proforma_invoice_items(pi_id);
CREATE INDEX IF NOT EXISTS idx_credits_supplier ON credits(supplier_id);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_buyer ON credits(buyer_name);
CREATE INDEX IF NOT EXISTS idx_credit_applications_credit ON credit_applications(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_pi ON credit_applications(pi_id);
CREATE INDEX IF NOT EXISTS idx_accounts_supplier ON accounts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_supplier ON buyer_inquiries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_status ON buyer_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiry_products_inquiry ON buyer_inquiry_products(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiry_products_product ON buyer_inquiry_products(product_id);
CREATE INDEX IF NOT EXISTS idx_cert_renewals_cert ON certification_renewals(certification_id);

-- Enable Row Level Security (RLS)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_inquiry_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_renewals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (suppliers can only access their own data)
-- Note: Service role key bypasses RLS, so backend API can access all data

CREATE POLICY "Suppliers can view own data" ON suppliers
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Suppliers can update own data" ON suppliers
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proforma_invoices_updated_at
    BEFORE UPDATE ON proforma_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credits_updated_at
    BEFORE UPDATE ON credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buyer_inquiries_updated_at
    BEFORE UPDATE ON buyer_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_certifications_updated_at
    BEFORE UPDATE ON supplier_certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
