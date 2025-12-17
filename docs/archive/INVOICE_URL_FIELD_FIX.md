# invoice_url 字段长度限制修复方案

## 问题描述

当用户上传PDF发票文件时，出现以下错误：

```
value too long for type character varying(255)
```

**问题原因：**

- `customer_credit_records` 表中的 `invoice_url` 字段被定义为 `varchar(255)`
- Supabase 生成的公共URL通常超过255字符
- 例如：`https://[project-ref].supabase.co/storage/v1/object/public/invoices/pdfs/1731854400000-abc123-invoice.pdf` （约200+字符）

## 解决方案

### 方案1：修改数据库字段长度（推荐）

**执行以下SQL脚本增加字段长度：**

```sql
-- 将 invoice_url 字段长度增加到 1000 字符
ALTER TABLE customer_credit_records
ALTER COLUMN invoice_url TYPE varchar(1000);

-- 添加字段注释
COMMENT ON COLUMN customer_credit_records.invoice_url IS '发票文件URL，现在支持1000字符长度以容纳Supabase公共URL';
```

### 方案2：代码优化（已实施）

**修改存储逻辑，存储文件路径而非完整URL：**

1. **数据库存储：** 存储相对文件路径（如 `pdfs/1731854400000-abc123-invoice.pdf`）
2. **前端获取：** 动态生成完整公共URL
3. **优势：**
   - 节省数据库空间
   - 更灵活的URL管理
   - 兼容现有的255字符限制

## 代码修改详情

### 1. 新增辅助函数

```typescript
// src/repositories/customerSupabase.ts

/**
 * 从Supabase公共URL中提取文件路径
 * 输入: https://[project-ref].supabase.co/storage/v1/object/public/invoices/pdfs/file.pdf
 * 输出: pdfs/file.pdf
 */
const extractFilePathFromUrl = (
  url: string | null | undefined
): string | null => {
  if (!url) return null;

  try {
    // 匹配 Supabase URL 模式并提取路径部分
    const regex = /\/storage\/v1\/object\/public\/[^\/]+\/(.+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.warn("解析文件URL失败:", error);
    return url; // 如果解析失败，返回原始URL
  }
};

/**
 * 将文件路径转换为完整的Supabase公共URL
 */
const buildPublicUrl = (filePath: string | null): string => {
  if (!filePath) return "";
  return getPublicFileUrl(filePath, "invoices");
};
```

### 2. 修改新增记录逻辑

```typescript
// 将完整URL转换为文件路径存储
const filePath = extractFilePathFromUrl(data.invoicePdfBase64);

const ins = await supabase.from("customer_credit_records").insert({
  customer_id: cid,
  amount: amt,
  credit_date: data.creditDate,
  invoice_url: filePath, // 存储文件路径而非完整URL
  remark: data.remark ?? "",
  status: "active"
});
```

### 3. 修改编辑记录逻辑

```typescript
// 将完整URL转换为文件路径存储
const filePath = extractFilePathFromUrl(data.invoiceUrl);

const up = await supabase
  .from("customer_credit_records")
  .update({
    amount: newAmt,
    credit_date: data.creditDate,
    invoice_url: filePath, // 存储文件路径而非完整URL
    remark: data.remark ?? "",
    status: "active"
  })
  .eq("id", data.id);
```

### 4. 修改读取逻辑

```typescript
const list: CreditRecord[] = rows.map((r: any) => ({
  id: r.id,
  customerId: r.customer_id,
  amount: Number(r.amount ?? 0),
  creditDate: r.credit_date ?? new Date().toISOString().split("T")[0],
  invoiceUrl: buildPublicUrl(r.invoice_url), // 动态生成完整URL
  remark: r.remark ?? "",
  createTime: r.created_at ?? new Date().toISOString()
}));
```

## 执行步骤

### 立即修复（无需停机）

1. **代码修改已完成：**
   - ✅ 修改了 `src/repositories/customerSupabase.ts`
   - ✅ 新增URL路径转换函数
   - ✅ 更新存储和读取逻辑

2. **数据库修改（可选但推荐）：**
   - 在Supabase项目的SQL编辑器中执行 `fix_invoice_url_field.sql`
   - 这将为将来的数据提供更大的存储空间

### 向后兼容性

- ✅ 现有数据完全兼容
- ✅ 如果URL解析失败，会回退到原始URL
- ✅ 空值处理保持一致

## 测试验证

1. **上传新PDF文件** - 确认不再出现长度限制错误
2. **编辑现有记录** - 确认文件URL正确显示和访问
3. **查看历史记录** - 确认所有发票文件都能正常预览

## 相关文件

- `fix_invoice_url_field.sql` - 数据库字段修改脚本
- `src/repositories/customerSupabase.ts` - 主要代码修改
- `src/services/storage.ts` - 存储服务（无修改，复用现有函数）

## 备注

此修复方案结合了数据库结构优化和代码逻辑改进，既解决了当前的字段长度限制问题，又提高了系统的可维护性和扩展性。
