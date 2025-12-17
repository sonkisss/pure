-- Vue 3 Admin 数据库表结构
-- 创建日期: 2025-11-13
-- 描述: 管理系统核心数据表结构

-- 创建数据库扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 用户表 (users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    real_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    roles TEXT[] DEFAULT ARRAY['common'],
    permissions TEXT[] DEFAULT ARRAY['view'],
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 供应商表 (suppliers)
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    bank_account VARCHAR(100),
    bank_name VARCHAR(100),
    tax_number VARCHAR(50),
    total_payable DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. 客户表 (customers)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    bank_account VARCHAR(100),
    bank_name VARCHAR(100),
    tax_number VARCHAR(50),
    total_debt DECIMAL(15,2) DEFAULT 0.00,
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. 产品表 (products)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(100) UNIQUE,
    specification VARCHAR(200),
    category VARCHAR(100),
    unit VARCHAR(20) NOT NULL,
    purchase_price DECIMAL(12,2) DEFAULT 0.00,
    selling_price DECIMAL(12,2) DEFAULT 0.00,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    tax_type VARCHAR(50) DEFAULT '含税' CHECK (tax_type IN ('含税', '普票', '不含')),
    stock_quantity DECIMAL(10,2) DEFAULT 0.00,
    min_stock DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    remark TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. 询价单表 (inquiries)
-- ============================================
CREATE TABLE IF NOT EXISTS inquiries (
    id SERIAL PRIMARY KEY,
    inquiry_no VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'quoted', 'won', 'lost', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    expected_date DATE,
    quoted_amount DECIMAL(15,2),
    delivery_terms TEXT,
    payment_terms TEXT,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    -- 兼容前端字段
    name VARCHAR(200),
    date DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. 询价单明细表 (inquiry_items)
-- ============================================
CREATE TABLE IF NOT EXISTS inquiry_items (
    id SERIAL PRIMARY KEY,
    inquiry_id INTEGER REFERENCES inquiries(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    specification VARCHAR(200),
    unit VARCHAR(20) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    sale_price DECIMAL(12,2) DEFAULT 0,
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    sale_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * sale_price) STORED,
    tax_rate DECIMAL(5,4) DEFAULT 0.13,
    tax_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_price * tax_rate) STORED,
    amount_with_tax DECIMAL(15,2) GENERATED ALWAYS AS (total_price + tax_amount) STORED,
    delivery_time VARCHAR(100),
    remark TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'unmatched', 'multiple')),
    match_status VARCHAR(20) CHECK (match_status IN ('matched', 'unmatched', 'multiple')),
    matched_product_id INTEGER REFERENCES products(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. 供应商欠款明细表 (supplier_debts)
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_debts (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    debt_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
    excel_url VARCHAR(255),
    image_url VARCHAR(255),
    has_excel_data BOOLEAN DEFAULT FALSE,
    excel_item_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. 供应商欠款Excel明细表 (supplier_debt_items)
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_debt_items (
    id SERIAL PRIMARY KEY,
    debt_id INTEGER REFERENCES supplier_debts(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    specification VARCHAR(200),
    unit VARCHAR(20) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    supplier VARCHAR(200),
    tax_type VARCHAR(50) DEFAULT '含税',
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. 供应商付款记录表 (supplier_payments)
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_payments (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_type VARCHAR(50) DEFAULT '现金' CHECK (payment_type IN ('现金', '转账', '承兑', '支票', '其他')),
    voucher_url VARCHAR(255),
    remark TEXT,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. 客户付款记录表 (customer_payments)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_time TIMESTAMP NOT NULL,
    payment_type VARCHAR(50) DEFAULT '现金' CHECK (payment_type IN ('现金', '转账', '承兑', '支票', '其他')),
    remark TEXT,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. 客户挂账记录表 (customer_credit_records)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_credit_records (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    credit_date DATE NOT NULL,
    invoice_url VARCHAR(255),
    remark TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
    settled_amount DECIMAL(15,2) DEFAULT 0.00,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 12. 系统日志表 (system_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    request_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 创建索引
-- ============================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 供应商表索引
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

-- 客户表索引
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- 产品表索引
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 询价单索引
CREATE INDEX IF NOT EXISTS idx_inquiries_no ON inquiries(inquiry_no);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer_id ON inquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);

-- 询价单明细索引
CREATE INDEX IF NOT EXISTS idx_inquiry_items_inquiry_id ON inquiry_items(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_items_product_id ON inquiry_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_items_status ON inquiry_items(status);

-- 欠款明细索引
CREATE INDEX IF NOT EXISTS idx_supplier_debts_supplier_id ON supplier_debts(supplier_id);
-- supplier_debts表没有status列，移除索引创建
-- CREATE INDEX IF NOT EXISTS idx_supplier_debts_status ON supplier_debts(status);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_date ON supplier_debts(debt_date);

-- 付款记录索引
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_time ON customer_payments(payment_time);

-- 挂账记录索引
CREATE INDEX IF NOT EXISTS idx_customer_credit_records_customer_id ON customer_credit_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_credit_records_date ON customer_credit_records(credit_date);

-- 系统日志索引
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- ============================================
-- 创建触发器函数和触发器
-- ============================================

-- 更新 updated_at 字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建 updated_at 触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inquiry_items_updated_at BEFORE UPDATE ON inquiry_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_debts_updated_at BEFORE UPDATE ON supplier_debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_payments_updated_at BEFORE UPDATE ON supplier_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_payments_updated_at BEFORE UPDATE ON customer_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_credit_records_updated_at BEFORE UPDATE ON customer_credit_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 创建视图
-- ============================================

-- 供应商统计视图
CREATE OR REPLACE VIEW supplier_stats AS
SELECT
    s.id,
    s.name,
    s.total_payable,
    COALESCE(SUM(sd.amount), 0) as total_debt,
    COALESCE(SUM(sp.amount), 0) as total_paid,
    COALESCE(SUM(sd.amount), 0) - COALESCE(SUM(sp.amount), 0) as current_balance,
    COUNT(sd.id) as debt_count,
    COUNT(sp.id) as payment_count
FROM suppliers s
LEFT JOIN supplier_debts sd ON s.id = sd.supplier_id -- 移除status条件，因为supplier_debts表没有status列
LEFT JOIN supplier_payments sp ON s.id = sp.supplier_id AND sp.status = 'confirmed'
GROUP BY s.id, s.name, s.total_payable;

-- 客户统计视图
CREATE OR REPLACE VIEW customer_stats AS
SELECT
    c.id,
    c.name,
    c.total_debt,
    COALESCE(SUM(ccr.amount), 0) as total_credit,
    COALESCE(SUM(cp.amount), 0) as total_payment,
    COALESCE(SUM(ccr.amount), 0) - COALESCE(SUM(cp.amount), 0) as current_debt,
    COUNT(ccr.id) as credit_count,
    COUNT(cp.id) as payment_count
FROM customers c
LEFT JOIN customer_credit_records ccr ON c.id = ccr.customer_id AND ccr.status = 'active'
LEFT JOIN customer_payments cp ON c.id = cp.customer_id AND cp.status = 'confirmed'
GROUP BY c.id, c.name, c.total_debt;

-- ============================================
-- 初始化默认管理员用户
-- ============================================
INSERT INTO users (username, password_hash, real_name, roles, permissions)
VALUES ('admin', '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ012345', '系统管理员', ARRAY['admin'], ARRAY['*:*:*'])
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 添加注释
-- ============================================

COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE suppliers IS '供应商表';
COMMENT ON TABLE customers IS '客户表';
COMMENT ON TABLE products IS '产品表';
COMMENT ON TABLE inquiries IS '询价单表';
COMMENT ON TABLE inquiry_items IS '询价单明细表';
COMMENT ON TABLE supplier_debts IS '供应商欠款明细表';
COMMENT ON TABLE supplier_debt_items IS '供应商欠款Excel明细表';
COMMENT ON TABLE supplier_payments IS '供应商付款记录表';
COMMENT ON TABLE customer_payments IS '客户付款记录表';
COMMENT ON TABLE customer_credit_records IS '客户挂账记录表';
COMMENT ON TABLE system_logs IS '系统日志表';

COMMENT ON VIEW supplier_stats IS '供应商统计视图';
COMMENT ON VIEW customer_stats IS '客户统计视图';
-- ============================================
-- 6. 公司表 (companies) - Added manually
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    company_code VARCHAR(50),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    address TEXT,
    status INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. 合同表 (contracts) - Added manually
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    contract_name VARCHAR(200) NOT NULL,
    contract_amount DECIMAL(15,2) DEFAULT 0,
    contract_year INTEGER NOT NULL,
    contract_date DATE,
    remark TEXT,
    status INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. 费用表 (expenses) - Added manually
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    category VARCHAR(100),
    expense_date DATE,
    year INTEGER,
    description TEXT,
    company_id INTEGER REFERENCES companies(id),
    contract_id INTEGER REFERENCES contracts(id),
    payer_id INTEGER,
    payer_name VARCHAR(100),
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
