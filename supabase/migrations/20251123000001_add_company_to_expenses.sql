-- 添加公司相关字段到费用表
-- 添加company_id字段，关联到companies表
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- 添加company_name字段，便于查询和显示
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);

-- 更新现有费用记录，设置默认公司（如果有的话）
UPDATE expenses SET company_name = '未分配' WHERE company_name IS NULL;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_name ON expenses(company_name);

-- 添加新的RLS策略，允许认证用户按公司筛选费用
DROP POLICY IF EXISTS "Allow authenticated users to filter expenses by company" ON expenses;
CREATE POLICY "Allow authenticated users to filter expenses by company" ON expenses
    FOR SELECT USING (auth.role() = 'authenticated');

-- 更新现有策略以包含公司字段
DROP POLICY IF EXISTS "Allow authenticated users to read expenses" ON expenses;
CREATE POLICY "Allow authenticated users to read expenses" ON expenses
    FOR SELECT USING (auth.role() = 'authenticated');

-- 更新现有expenses表的RLS策略
DROP POLICY IF EXISTS "Allow authenticated users to insert expenses" ON expenses;
CREATE POLICY "Allow authenticated users to insert expenses" ON expenses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update expenses" ON expenses;
CREATE POLICY "Allow authenticated users to update expenses" ON expenses
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to delete expenses" ON expenses;
CREATE POLICY "Allow authenticated users to delete expenses" ON expenses
    FOR DELETE USING (auth.role() = 'authenticated');
