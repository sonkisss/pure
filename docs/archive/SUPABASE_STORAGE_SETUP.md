# Supabase存储桶设置指南

## 概述

为了使PDF文件上传功能正常工作，需要在Supabase中创建一个公开的存储桶。本指南将说明如何在Supabase Dashboard中手动创建存储桶。

## 步骤一：登录Supabase Dashboard

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 登录您的账户
3. 选择您的项目（`zflehoeaadcganacwksb`）

## 步骤二：创建存储桶

1. 在左侧导航栏中，点击 **"Storage"**
2. 点击 **"Create a new bucket"** 按钮
3. 填写以下信息：
   - **Name**: `invoices`
   - **Public bucket**: ✅ 勾选（非常重要！）
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**:
     ```
     application/pdf
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     application/vnd.ms-excel
     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     application/vnd.ms-powerpoint
     application/vnd.openxmlformats-officedocument.presentationml.presentation
     image/*
     image/jpeg
     image/png
     image/gif
     image/webp
     image/svg+xml
     application/zip
     application/octet-stream
     ```

## 步骤三：设置存储桶权限

创建存储桶后，需要设置适当的权限策略：

1. 在存储桶列表中，点击 `invoices` 存储桶
2. 点击 **"Settings"** 标签页
3. 在 **"Policies"** 部分，创建以下策略：

### 1. 允许匿名用户上传文件

点击 **"New policy"**，选择 **"For full customization"**：

```sql
-- 政策名称: Allow public upload to invoices
-- 允许匿名用户上传文件到invoices存储桶

CREATE POLICY "Allow public upload to invoices" ON "storage.objects"
FOR INSERT
WITH CHECK (
  bucket_id = 'invoices'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);
```

### 2. 允许匿名用户读取文件

```sql
-- 政策名称: Allow public read from invoices
-- 允许匿名用户读取invoices存储桶中的文件

CREATE POLICY "Allow public read from invoices" ON "storage.objects"
FOR SELECT
USING (
  bucket_id = 'invoices'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);
```

### 3. 允许更新和删除（可选）

```sql
-- 政策名称: Allow update delete on invoices
-- 允许用户更新和删除自己的文件

CREATE POLICY "Allow update delete on invoices" ON "storage.objects"
FOR UPDATE
USING (
  bucket_id = 'invoices'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
)
WITH CHECK (
  bucket_id = 'invoices'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow delete on invoices" ON "storage.objects"
FOR DELETE
USING (
  bucket_id = 'invoices'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);
```

## 步骤四：验证设置

1. 返回 **Storage** 页面
2. 确认 `invoices` 存储桶显示为 **Public**
3. 可以尝试上传一个小文件测试权限

## 快速设置SQL

如果您更喜欢使用SQL执行器，可以使用以下完整脚本：

```sql
-- 创建存储桶（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  10485760,
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 设置上传权限
CREATE POLICY "Allow public upload to invoices" ON "storage.objects"
FOR INSERT
WITH CHECK (
  bucket_id = 'invoices'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- 设置读取权限
CREATE POLICY "Allow public read from invoices" ON "storage.objects"
FOR SELECT
USING (
  bucket_id = 'invoices'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);
```

## 行级安全策略（RLS）解决方案

### 问题：API创建存储桶时遇到"row-level security policy"错误

这是因为Supabase默认对storage.buckets表启用了RLS，匿名用户无法创建存储桶。

### 解决方案1：临时禁用RLS（推荐用于开发）

在Supabase Dashboard的SQL Editor中执行：

```sql
-- 临时禁用storage.buckets表的RLS
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  10485760,
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 创建完成后重新启用RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
```

### 解决方案2：创建特定的RLS策略

```sql
-- 允许匿名用户创建存储桶（仅在开发环境使用）
CREATE POLICY "Allow bucket creation for anon users" ON storage.buckets
FOR INSERT
WITH CHECK (
  (auth.role() = 'anon' OR auth.role() = 'authenticated')
);

-- 或者更严格的策略，只允许创建特定名称的存储桶
CREATE POLICY "Allow invoices bucket creation" ON storage.buckets
FOR INSERT
WITH CHECK (
  name = 'invoices' AND
  (auth.role() = 'anon' OR auth.role() = 'authenticated')
);
```

### 解决方案3：使用Service Role密钥（推荐）

Service Role密钥具有更高的权限，可以绕过RLS限制直接创建存储桶。

#### 步骤1：获取Service Role密钥

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入您的项目设置
3. 在 **API** 部分找到 **service_role** 密钥
4. 复制该密钥

#### 步骤2：配置环境变量

在 `.env.development` 文件中添加：

```bash
# Supabase Service Role 密钥（用于创建存储桶）
VITE_SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

**重要：** 请将 `your_actual_service_role_key_here` 替换为您实际的service_role密钥。

#### 步骤3：重启开发服务器

```bash
# 重启开发服务器以加载新的环境变量
pnpm dev
```

#### 步骤4：代码自动创建

代码现在会自动检测并使用Service Role客户端：

```typescript
// 系统会自动执行以下逻辑：
if (supabaseAdmin) {
  console.log("使用Service Role客户端创建存储桶...");
  const { error } = await supabaseAdmin.storage.createBucket("invoices", {
    public: true,
    allowedMimeTypes: ["application/pdf"],
    fileSizeLimit: 10485760
  });
} else {
  console.log("Service Role客户端不可用，使用普通客户端尝试创建...");
  // 回退到普通客户端
}
```

#### 优势

✅ **自动创建**：无需手动干预，存储桶会自动创建
✅ **绕过RLS**：Service Role密钥不受行级安全策略限制
✅ **权限完整**：具有创建、读取、更新、删除存储桶的完整权限
✅ **开发友好**：一次配置，永久使用

#### 安全注意事项

⚠️ **环境隔离**：确保Service Role密钥只在开发环境使用
⚠️ **密钥保护**：不要将Service Role密钥提交到版本控制系统
⚠️ **生产环境**：生产环境中建议通过CI/CD或手动方式创建存储桶

### 生产环境建议

1. **手动创建存储桶**：在生产环境中，建议通过Dashboard手动创建存储桶
2. **使用Service Role**：仅在服务器端使用service_role密钥进行初始化
3. **严格的RLS策略**：确保RLS策略足够严格，只允许必要的操作

## 自动创建存储桶的代码位置

### 主要修改文件：`/src/services/storage.ts`

**关键函数：**

1. **`ensureBucketExists(bucket: string)`**
   - 检查存储桶是否存在
   - 尝试自动创建缺失的存储桶
   - 处理RLS错误并提供指导

2. **`uploadFileToSupabase()`**
   - 在上传前调用 `ensureBucketExists()`
   - 提供详细的错误信息和解决建议

3. **`setupBucketPolicies(bucket: string)`**
   - 记录需要设置的权限策略
   - 提供手动设置指导

### 错误处理逻辑

```typescript
// 检测RLS错误
if (createError.message?.includes("row-level security policy")) {
  return {
    success: false,
    error: `存储桶创建失败：行级安全策略限制。请按照 SUPABASE_STORAGE_SETUP.md 指南手动创建存储桶，或者暂时禁用存储桶的RLS策略。`
  };
}

// 检测存储桶不存在错误
if (error.message?.includes("The resource was not found")) {
  return {
    success: false,
    error: `存储桶 "${bucket}" 不存在或无法访问。请按照 SUPABASE_STORAGE_SETUP.md 指南手动创建存储桶。`
  };
}
```

## 常见问题

### Q: 为什么需要设置为公开存储桶？

A: 因为我们的应用使用匿名密钥访问，公开存储桶允许用户直接访问PDF文件而不需要身份验证。

### Q: 文件大小限制设置为多少？

A: 建议设置为 10MB (10485760 字节)，这足够容纳大多数PDF发票文件。

### Q: 如果遇到权限错误怎么办？

A: 确保所有策略都已正确创建，并且存储桶设置为公开。您可以在 Supabase Dashboard 的 SQL Editor 中执行权限检查查询。

### Q: 如何测试存储桶是否工作正常？

A: 完成设置后，在应用中尝试上传一个小的PDF文件。如果成功，说明配置正确。

### Q: API创建存储桶失败但手动创建成功？

A: 这通常是由于RLS（行级安全策略）限制。请参考上文的"行级安全策略解决方案"部分。

## 完成后

存储桶设置完成后，您的PDF文件上传和预览功能将能够：

- 将PDF文件存储到Supabase云存储
- 生成公共访问URL用于预览
- 在新浏览器窗口中打开PDF文件
- 提供持久化的文件存储

如果在设置过程中遇到任何问题，请检查Supabase项目的权限配置和存储策略。
