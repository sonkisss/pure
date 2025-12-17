# Service Role 密钥配置指南

## 概述

Service Role 密钥是 Supabase 提供的具有最高权限的密钥，可以绕过行级安全策略（RLS）直接操作数据库和存储。本文档指导您如何配置 Service Role 密钥来自动创建存储桶。

## 🔍 获取 Service Role 密钥

### 方法1：通过 Supabase Dashboard（推荐）

1. **访问 Dashboard**：打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. **选择项目**：进入您的项目 `zflehoeaadcganacwksb`
3. **进入设置**：点击左侧导航栏的 **Settings** 图标
4. **API 配置**：在设置页面中，向下滚动到 **API** 部分
5. **复制密钥**：找到 `service_role` 项目，复制完整的密钥

Service Role 密钥格式类似：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbGVob2VhYWRjZ2FuYWN3a3NiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzEwMTAyNiwiZXhwIjoyMDc4Njg2MTI2fQ.SOME_LONG_KEY_HERE
```

### 方法2：通过 Supabase CLI

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录 Supabase
supabase login

# 链接到项目
supabase link --project-ref zflehoeaadcganacwksb

# 获取 Service Role 密钥
supabase status
```

## ⚙️ 配置环境变量

### 1. 打开环境配置文件

在项目根目录编辑 `.env.development` 文件：

```bash
# 在文件末尾添加以下配置
VITE_SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### 2. 替换密钥

将 `your_actual_service_role_key_here` 替换为您在第1步中获取的实际 Service Role 密钥。

### 3. 验证配置

确保配置看起来像这样：

```bash
# Supabase 配置
VITE_SUPABASE_URL=https://zflehoeaadcganacwksb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 重启开发服务器

配置完成后，重启开发服务器以加载新的环境变量：

```bash
# 在项目根目录执行
pnpm dev
```

或者如果您已经在运行：

```bash
# 停止当前进程（Ctrl+C）
# 然后重新启动
pnpm dev
```

## ✅ 验证配置

### 检查控制台输出

重启开发服务器后，查看控制台输出，应该能看到：

```
✅ Supabase 客户端已初始化
✅ Supabase Admin 客户端已初始化（Service Role）
```

### 检查浏览器控制台

在浏览器开发者工具的 Console 中，尝试上传一个PDF文件，应该能看到：

```
存储桶 invoices 不存在，正在创建...
使用Service Role客户端创建存储桶...
存储桶 invoices 创建成功
```

## 🔒 安全最佳实践

### 开发环境安全

1. **环境变量保护**：将 `.env.development` 添加到 `.gitignore` 文件

```gitignore
# 环境变量
.env
.env.local
.env.*.local
.env.development
.env.production
```

2. **团队协作**：通过安全渠道（如加密消息、企业密码管理器）共享密钥

3. **定期轮换**：定期更换 Service Role 密钥

### 生产环境考虑

1. **CI/CD 配置**：在 CI/CD 流程中配置环境变量
2. **最小权限原则**：生产环境考虑使用权限更有限的密钥
3. **监控访问**：监控 Service Role 密钥的使用情况

## 🛠️ 代码逻辑说明

### 客户端初始化

代码会自动创建两个客户端：

```typescript
// 普通客户端（用于用户操作）
const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// 管理员客户端（用于服务器端操作）
const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
```

### 智能存储桶创建

```typescript
// 优先使用 Service Role 客户端
if (supabaseAdmin) {
  console.log("使用Service Role客户端创建存储桶...");
  const { error } = await supabaseAdmin.storage.createBucket(
    "invoices",
    config
  );
} else {
  console.log("Service Role客户端不可用，使用普通客户端尝试创建...");
  const { error } = await supabase.storage.createBucket("invoices", config);
}
```

## 🔧 故障排除

### 问题1：Service Role 客户端未初始化

**症状**：控制台显示 "Service Role客户端不可用"

**解决方案**：

1. 检查环境变量是否正确配置
2. 确认 Service Role 密钥格式正确
3. 重启开发服务器

### 问题2：密钥格式错误

**症状**：启动时报错 "Invalid JWT token"

**解决方案**：

1. 确保复制完整的密钥（包括开头和结尾）
2. 检查密钥是否有多余的空格或换行符
3. 重新从 Dashboard 复制密钥

### 问题3：权限不足

**症状**：仍然遇到 "row-level security policy" 错误

**解决方案**：

1. 确认使用的是 `service_role` 而不是 `anon` 密钥
2. 检查密钥是否已过期
3. 确认项目权限设置

## 📝 总结

通过配置 Service Role 密钥，您可以：

✅ **自动创建存储桶** - 无需手动操作
✅ **绕过 RLS 限制** - 直接创建存储桶和设置权限
✅ **提升开发效率** - 一次配置，持续使用
✅ **保持代码整洁** - 无需手动创建存储桶

现在您的 PDF 文件上传功能将能够自动创建和管理存储桶！
