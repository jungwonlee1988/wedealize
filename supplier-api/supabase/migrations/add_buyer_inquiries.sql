-- Migration: Add Buyer Inquiries tables
-- buyer_inquiries: 구매자 문의 관리
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

-- buyer_inquiry_products: 문의-상품 연결 (M:N)
CREATE TABLE IF NOT EXISTS buyer_inquiry_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inquiry_id UUID REFERENCES buyer_inquiries(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(inquiry_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_supplier ON buyer_inquiries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_status ON buyer_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiry_products_inquiry ON buyer_inquiry_products(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiry_products_product ON buyer_inquiry_products(product_id);

-- Enable RLS
ALTER TABLE buyer_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_inquiry_products ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_buyer_inquiries_updated_at
    BEFORE UPDATE ON buyer_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
