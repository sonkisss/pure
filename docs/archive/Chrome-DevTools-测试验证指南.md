# Chrome DevTools 测试验证指南 - 业务管理模块

## 准备工作

1. 打开 Chrome 浏览器，访问 `http://localhost:8848/`
2. 打开开发者工具：按 `F12` 或 `Cmd+Option+I` (Mac)
3. 切换到 **Console** 标签页
4. 切换到 **Network** 标签页（可选，用于查看网络请求）

## 测试步骤

### 1. 测试添加公司

#### 操作步骤：

1. 进入"业务管理" → "选择公司"页面
2. 点击"添加公司"卡片
3. 输入公司名称（例如："测试公司A"）
4. 点击"确定"按钮

#### 在 Console 中验证：

**应该看到以下日志：**

```
[添加公司] 准备插入数据: {company_name: "测试公司A", status: 1, ...}
[添加公司] 成功，插入的ID: X
```

**如果失败，会看到：**

```
[添加公司] 失败: {message: "...", code: "...", ...}
[添加公司] 错误详情: {...}
```

#### 验证数据库写入：

在 Console 中执行以下代码（需要先获取 Supabase 客户端）：

```javascript
// 方法1：使用页面中的 Supabase 实例（如果暴露了）
// 方法2：直接查询数据库（使用 Supabase MCP 工具）
```

或者使用 Supabase MCP 工具执行 SQL：

```sql
SELECT * FROM companies ORDER BY created_at DESC LIMIT 5;
```

### 2. 测试编辑公司

#### 操作步骤：

1. 在公司列表中，点击某个公司的"操作"按钮
2. 选择"编辑公司"
3. 修改公司名称
4. 点击"确定"按钮

#### 在 Console 中验证：

**应该看到以下日志：**

```
[更新公司] ID: X 准备更新数据: {company_name: "新名称", ...}
[更新公司] 成功，更新的行数: 1
```

#### 验证数据库：

```sql
SELECT id, company_name, updated_at FROM companies WHERE id = X;
```

### 3. 测试删除公司

#### 操作步骤：

1. 在公司列表中，点击某个公司的"操作"按钮
2. 选择"删除公司"
3. 在确认对话框中点击"确定"

#### 在 Console 中验证：

**应该看到以下日志：**

```
[删除公司] 准备删除ID: X
[删除公司] 成功，删除的行数: 1
```

**如果公司有关联合同，会看到：**

```
[删除公司] 失败: 存在关联合同，无法删除
```

#### 验证数据库：

```sql
SELECT * FROM companies WHERE id = X;
-- 应该返回空结果
```

### 4. 测试添加合同

#### 操作步骤：

1. 点击某个公司卡片，进入合同列表页面
2. 点击"添加合同"按钮
3. 填写合同信息
4. 点击"确定"按钮

#### 在 Console 中验证：

**应该看到日志（如果添加了日志）：**

```
[添加合同] 准备插入数据: {...}
[添加合同] 成功，插入的ID: X
```

#### 验证数据库：

```sql
SELECT * FROM contracts WHERE company_id = X ORDER BY created_at DESC LIMIT 5;
```

### 5. 测试合同明细和费用

#### 操作步骤：

1. 进入合同详情页面
2. 添加合同明细
3. 添加费用
4. 编辑和删除操作

#### 验证数据库：

```sql
-- 查看合同明细
SELECT * FROM contract_details WHERE contract_id = X;

-- 查看费用
SELECT * FROM expenses WHERE contract_id = X;
```

### 6. 测试同步到产品模块

#### 操作步骤：

1. 在合同详情页面，点击"同步到产品模块"按钮
2. 确认同步

#### 在 Console 中验证：

**应该看到详细的同步日志：**

```
[同步产品] 开始同步合同 ID: X
[同步产品] 处理明细: ...
[同步产品] 成功/失败统计: ...
```

#### 验证数据库：

```sql
-- 查看同步状态
SELECT id, product_name, sync_status FROM contract_details WHERE contract_id = X;

-- 查看产品表
SELECT * FROM products ORDER BY created_at DESC LIMIT 10;
```

## 使用 Supabase MCP 工具验证

### 查看所有公司：

```sql
SELECT id, company_name, status, created_at, updated_at
FROM companies
ORDER BY created_at DESC;
```

### 查看所有合同：

```sql
SELECT c.id, c.contract_name, c.contract_amount, c.contract_year,
       co.company_name, c.created_at
FROM contracts c
LEFT JOIN companies co ON c.company_id = co.id
ORDER BY c.created_at DESC;
```

### 查看合同明细：

```sql
SELECT cd.id, cd.product_name, cd.spec_model, cd.purchase_price,
       cd.sale_price, cd.sync_status, c.contract_name
FROM contract_details cd
LEFT JOIN contracts c ON cd.contract_id = c.id
ORDER BY cd.created_at DESC;
```

### 查看费用：

```sql
SELECT e.id, e.expense_name, e.amount, e.payment_date, c.contract_name
FROM expenses e
LEFT JOIN contracts c ON e.contract_id = c.id
ORDER BY e.created_at DESC;
```

## 常见问题排查

### 问题1：添加公司时没有日志输出

- **检查**：确认 Supabase 客户端已正确初始化
- **检查**：查看 Console 是否有其他错误信息
- **检查**：确认代码已保存并重新加载

### 问题2：看到 RLS 权限错误

- **检查**：确认已为表创建了 RLS 策略
- **检查**：确认策略允许 anon 用户操作
- **解决方案**：使用 Supabase MCP 工具检查 RLS 策略

### 问题3：数据没有写入数据库

- **检查 Console 错误**：查看完整的错误堆栈
- **检查 RLS 策略**：确认策略正确配置
- **检查字段映射**：确认数据库字段与代码字段匹配

## 测试检查清单

- [ ] 添加公司功能正常，Console 有日志，数据写入数据库
- [ ] 编辑公司功能正常，Console 有日志，数据更新到数据库
- [ ] 删除公司功能正常，Console 有日志，数据从数据库删除
- [ ] 删除有关联合同的公司时，提示错误信息
- [ ] 添加合同功能正常
- [ ] 添加合同明细功能正常
- [ ] 添加费用功能正常
- [ ] 同步到产品模块功能正常，同步状态正确更新

## 调试技巧

1. **使用 Console 断点**：在代码中添加 `debugger;` 语句
2. **查看网络请求**：在 Network 标签中筛选 Supabase 相关请求
3. **实时查询数据库**：使用 Supabase MCP 工具执行 SQL 查询
4. **检查响应数据**：在 Console 中查看 API 返回的数据结构
5. **过滤日志**：在 Console 中使用过滤器，例如输入 `[添加公司]` 或 `[更新公司]`

## 快速验证命令

在 Supabase MCP 工具中执行以下 SQL 快速验证：

```sql
-- 查看最近添加的公司
SELECT * FROM companies ORDER BY created_at DESC LIMIT 5;

-- 查看最近添加的合同
SELECT * FROM contracts ORDER BY created_at DESC LIMIT 5;

-- 查看最近添加的合同明细
SELECT * FROM contract_details ORDER BY created_at DESC LIMIT 5;

-- 查看最近添加的费用
SELECT * FROM expenses ORDER BY created_at DESC LIMIT 5;

-- 查看同步状态
SELECT id, product_name, sync_status, created_at
FROM contract_details
WHERE sync_status IS NOT NULL
ORDER BY updated_at DESC;
```
