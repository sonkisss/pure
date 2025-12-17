-- Supabase RLS 加固脚本
-- 此脚本用于加强数据库的安全性，限制对敏感表的访问权限
-- 请在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 1. 确保所有表都启用了 RLS
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contract_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inquiry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;

-- 2. 删除现有的宽松策略 (如果存在)
-- 注意：这里假设可能存在名为 "Enable all operations for all users" 的策略
DROP POLICY IF EXISTS "Enable all operations for all users" ON users;
DROP POLICY IF EXISTS "Enable all operations for all users" ON companies;
DROP POLICY IF EXISTS "Enable all operations for all users" ON contracts;
DROP POLICY IF EXISTS "Enable all operations for all users" ON contract_details;
DROP POLICY IF EXISTS "Enable all operations for all users" ON inquiries;
DROP POLICY IF EXISTS "Enable all operations for all users" ON inquiry_items;
DROP POLICY IF EXISTS "Enable all operations for all users" ON customers;
DROP POLICY IF EXISTS "Enable all operations for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable all operations for all users" ON expenses;

-- 3. 创建新的安全策略

-- Users 表：仅允许已认证用户读取所有用户(用于协作)，但只能修改自己的数据
CREATE POLICY "Allow authenticated read users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update own data" ON users
    FOR UPDATE USING (
        -- 使用 metadata 中的 username 进行匹配 (因为 id 是 int，auth.uid() 是 uuid)
        username = (auth.jwt() -> 'user_metadata' ->> 'username')
    ) WITH CHECK (
        username = (auth.jwt() -> 'user_metadata' ->> 'username')
    );

-- 业务数据表：仅允许已认证用户进行增删改查
-- Companies
CREATE POLICY "Allow authenticated operations on companies" ON companies
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Contracts
CREATE POLICY "Allow authenticated operations on contracts" ON contracts
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Contract Details
CREATE POLICY "Allow authenticated operations on contract_details" ON contract_details
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Inquiries
CREATE POLICY "Allow authenticated operations on inquiries" ON inquiries
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Inquiry Items
CREATE POLICY "Allow authenticated operations on inquiry_items" ON inquiry_items
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Customers
CREATE POLICY "Allow authenticated operations on customers" ON customers
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Suppliers
CREATE POLICY "Allow authenticated operations on suppliers" ON suppliers
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Expenses
CREATE POLICY "Allow authenticated operations on expenses" ON expenses
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. 存储桶策略加固 (Storage)
-- 注意：存储桶策略通常在 storage.objects 表上设置，这里提供 SQL 模板
-- 如果你之前手动设置了 public 访问，可以保持不变，但建议限制上传权限

-- 允许所有认证用户上传文件到 'invoices'
-- CREATE POLICY "Allow authenticated upload to invoices" ON storage.objects
-- FOR INSERT
-- WITH CHECK (
--   bucket_id = 'invoices'
--   AND auth.role() = 'authenticated'
-- );

-- 允许所有认证用户更新/删除 'invoices' 中的文件
-- CREATE POLICY "Allow authenticated update/delete on invoices" ON storage.objects
-- FOR ALL
-- USING (
--   bucket_id = 'invoices'
--   AND auth.role() = 'authenticated'
-- );

-- 允许任何人(包括未登录)读取 'invoices' (因为发票链接可能是公开分享的)
-- CREATE POLICY "Allow public read on invoices" ON storage.objects
-- FOR SELECT
-- USING (bucket_id = 'invoices');
