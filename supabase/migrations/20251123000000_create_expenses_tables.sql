-- 创建费用类别表
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#409EFF', -- 十六进制颜色值
    icon VARCHAR(50) DEFAULT 'ep:money',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建费用表
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    category VARCHAR(100) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    attachments TEXT[], -- 附件URL数组
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON expenses(amount);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为费用表创建更新时间触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expenses_updated_at') THEN
        CREATE TRIGGER update_expenses_updated_at
            BEFORE UPDATE ON expenses
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 为费用类别表创建更新时间触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expense_categories_updated_at') THEN
        CREATE TRIGGER update_expense_categories_updated_at
            BEFORE UPDATE ON expense_categories
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 插入默认费用类别
INSERT INTO expense_categories (name, description, color, icon) VALUES
    ('办公费用', '日常办公用品、文具等费用', '#409EFF', 'ep:document'),
    ('差旅费用', '出差交通、住宿、餐费等', '#67C23A', 'ep:location'),
    ('通讯费用', '电话、网络、通讯等费用', '#E6A23C', 'ep:phone'),
    ('招待费用', '客户招待、商务宴请等费用', '#F56C6C', 'ep:food'),
    ('交通费用', '车辆加油、维修、保养等费用', '#909399', 'ep:car'),
    ('租金费用', '办公场所、仓库等租金', '#B37FEB', 'ep:house'),
    ('水电费用', '水、电、燃气等费用', '#6F7AD3', 'ep:lightning'),
    ('工资费用', '员工工资、奖金、福利等', '#58D5D8', 'ep:user'),
    ('税费', '各种税费支出', '#FF7979', 'ep:wallet'),
    ('其他费用', '其他未分类费用', '#95A5A6', 'ep:more')
ON CONFLICT (name) DO NOTHING;

-- 启用行级安全策略
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- 创建费用表的RLS策略 - 允许认证用户读取所有费用记录
DROP POLICY IF EXISTS "Allow authenticated users to read expenses" ON expenses;
CREATE POLICY "Allow authenticated users to read expenses" ON expenses
    FOR SELECT USING (auth.role() = 'authenticated');

-- 创建费用表的RLS策略 - 允许认证用户插入费用记录
DROP POLICY IF EXISTS "Allow authenticated users to insert expenses" ON expenses;
CREATE POLICY "Allow authenticated users to insert expenses" ON expenses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 创建费用表的RLS策略 - 允许认证用户更新费用记录
DROP POLICY IF EXISTS "Allow authenticated users to update expenses" ON expenses;
CREATE POLICY "Allow authenticated users to update expenses" ON expenses
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 创建费用表的RLS策略 - 允许认证用户删除费用记录
DROP POLICY IF EXISTS "Allow authenticated users to delete expenses" ON expenses;
CREATE POLICY "Allow authenticated users to delete expenses" ON expenses
    FOR DELETE USING (auth.role() = 'authenticated');

-- 创建费用类别表的RLS策略 - 允许认证用户读取所有类别记录
DROP POLICY IF EXISTS "Allow authenticated users to read expense categories" ON expense_categories;
CREATE POLICY "Allow authenticated users to read expense categories" ON expense_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- 创建费用类别表的RLS策略 - 允许认证用户管理类别记录
DROP POLICY IF EXISTS "Allow authenticated users to manage expense categories" ON expense_categories;
CREATE POLICY "Allow authenticated users to manage expense categories" ON expense_categories
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
