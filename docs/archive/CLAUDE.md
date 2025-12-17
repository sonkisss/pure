# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains **pure-admin-thin**, a Vue 3 admin template project located in the `pure-admin-thin/` subdirectory. This is a production-ready admin system based on Vue 3 + Vite + TypeScript + Element Plus + Tailwind CSS.

## Working Directory

**重要：所有工作应在 `pure-admin-thin/` 子目录中进行** - 主要项目代码和配置都位于此目录中。

## Essential Commands

```bash
# Start dev server (runs on port 8848)
pnpm dev

# Build for production
pnpm build

# Build for staging
pnpm build:staging

# Preview production build
pnpm preview

# Run all linters (ESLint + Prettier + Stylelint)
pnpm lint

# Individual linters
pnpm lint:eslint
pnpm lint:prettier
pnpm lint:stylelint

# Type checking
pnpm typecheck

# Clean cache and reinstall
pnpm clean:cache

# View project rules
pnpm rules

# View changelog
pnpm changelog

# Check documentation status
pnpm docs:check

# Clean cache and reinstall
pnpm clean:cache
```

Navigate to project directory first:

```bash
cd pure-admin-thin
```

## Architecture Overview

### Tech Stack

- **Frontend**: Vue 3.5.22 + TypeScript 5.9.3 + Vite 7.1.12
- **UI Framework**: Element Plus 2.11.5 + Tailwind CSS 4.1.16
- **State Management**: Pinia 3.0.3 with responsive-storage
- **Router**: Vue Router 4.6.3 with automatic route importing
- **HTTP Client**: Axios 1.12.2 with custom wrapper
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth with role-based access control
- **Storage**: Supabase Storage for file management
- **Mock**: vite-plugin-fake-server 2.2.0
- **Build**: Vite with optimized plugin configuration

### Key Features

- **Authentication**: Role-based access control with Supabase Auth integration
- **Database Integration**: Real-time Supabase backend with repository pattern
- **File Storage**: Supabase Storage for attachments and documents
- **Dynamic Routing**: Automatic route importing from `src/router/modules/` with permission filtering
- **Multi-tab Navigation**: Persistent tab state via `multiple-tabs` cookie
- **Permission System**: Fine-grained dual permissions (roles + button-level permissions)
- **Theme Customization**: Dark/light mode with Element Plus theme customization
- **Responsive Design**: Mobile-friendly layout with automatic device detection
- **Mock Data**: Complete mock API with vite-plugin-fake-server for development
- **Code Inspector**: Option+Shift for direct DOM-to-source mapping
- **Type Safety**: Generated TypeScript types from Supabase schema

### Directory Structure

```
pure-admin-thin/
├── src/
│   ├── api/           # API interface definitions
│   ├── components/    # Shared components
│   ├── directives/    # Custom directives (auth, perms, copy, etc.)
│   ├── layout/        # Layout components (navbar, sidebar, tabs)
│   ├── repositories/  # Supabase repository implementations
│   ├── router/        # Route configuration + auto-imported modules/
│   ├── services/      # Supabase client and storage services
│   ├── store/         # Pinia stores (user, permission, multiTags, etc.)
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions including Supabase helpers
│   ├── views/         # Page components
│   └── style/         # Global styles and theme customization
├── build/             # Build configuration and optimization
├── mock/              # Mock API data and endpoints
├── supabase/          # Database migrations and Supabase config
└── public/            # Static assets
```

### Permission System

- **Dual Permission Model**:
  - **Roles**: User roles array (e.g., `["admin", "common"]`)
  - **Permissions**: Fine-grained permissions array (e.g., `["*:*:*"]` for admin, `["permission:btn:add"]`)
- **Permission Checking**:
  - Directive: `v-auth="['permission:btn:edit']"`
  - Component: `<Auth :value="['permission:btn:add']">`
  - Programmatic: `hasAuth(['permission:btn:delete'])`
- **Route Flattening**: Three-level+ routes flattened to two-level for better UX

### Authentication Flow

1. **Hybrid Authentication**: Can use either mock auth (`/mock/login.ts`) or Supabase Auth
2. **Mock Flow**: Login via `/src/api/user.ts` → Mock service at `/mock/login.ts`
3. **Supabase Flow**: Authentication via `src/services/supabase.ts` → Supabase Auth
4. **Dual Storage Strategy**:
   - Cookie: `authorized-token` (accessToken, refreshToken, expires)
   - localStorage: `user-info` (user info, roles, permissions)
   - Supabase: `pure-admin-auth-token` (Supabase session)
5. Router guard checks `multiple-tabs` cookie + `user-info` for authentication
6. Dynamic route generation based on user permissions
7. Route flattening for optimal navigation structure
8. Repository pattern allows seamless switching between mock and Supabase data sources

## Key Development Patterns

### Adding a New Module

1. **Create view**: Add component in `src/views/[module-name]/`
2. **Create API**: Add API functions in `src/api/[module-name].ts`
3. **Create route**: Add route module in `src/router/modules/[module-name].ts`
4. **Add mock data**: (Optional) Add mock in `mock/[module-name].ts`

### Route Module Structure

```typescript
export default {
  path: "/module",
  name: "ModuleName",
  component: Layout,
  redirect: "/module/list",
  meta: {
    icon: "ep/icon-name", // Element Plus icon or custom
    title: "模块名称",
    rank: 10 // Menu order (lower = higher priority)
  },
  children: [
    {
      path: "/module/list",
      name: "ModuleList",
      component: () => import("@/views/module/list.vue"),
      meta: {
        title: "列表",
        auths: ["module:list:view"] // Optional permissions
      }
    }
  ]
} satisfies RouteConfigsTable;
```

### Permission Checks

```vue
<!-- Component-based -->
<Auth :value="['permission:btn:add']">
  <el-button>Add</el-button>
</Auth>

<!-- Directive-based -->
<el-button v-auth="['permission:btn:edit']">Edit</el-button>

<!-- In script -->
import { hasAuth } from "@/router/utils"; if
(hasAuth(['permission:btn:delete'])) { // Do something }
```

### API Pattern

```typescript
import { http } from "@/utils/http";

export const getModuleList = (data?: object) => {
  return http.request<Result>("post", "/module/list", { data });
};
```

### Custom Directives

Available directives in `src/directives/`:

- `v-auth`: Permission-based display
- `v-perms`: Permission-based display (alternative)
- `v-copy`: Click to copy text
- `v-longpress`: Long press detection
- `v-ripple`: Material ripple effect
- `v-optimize`: Optimize rendering

## Important Development Rules

### Communication Rules

- **重要：始终使用中文回复用户** - 在这个仓库中工作时，必须始终使用中文与用户交流

### Task Execution Rules

- **严格遵守用户要求范围** - 用户让我修改哪里，就只修改哪里，绝不擅自做主修改其他地方
- **禁止超出指定范围的操作** - 严格按照用户的具体指示执行，不添加、删除或修改用户未明确要求的内容
- **确认需求范围** - 如果对用户的指示有疑问，必须先询问确认，而不是自行猜测和扩展

### Documentation Management

**CRITICAL**: All development records MUST be written to `CHANGELOG.md`. DO NOT create new standalone .md files for features, bugs, or optimizations.

### Commit Convention

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Example:

```
feat(supplier): 添加欠款金额与Excel明细校验功能

- 添加Excel解析逻辑
- 实现金额对比验证
- 添加错误提示

Closes #123
```

## Build Configuration

### Environment Variables

- `.env` - Base config (port, hide home)
- `.env.development` - Dev-specific (public path, router mode)
- `.env.production` - Production build settings
- `.env.staging` - Staging environment

### Vite Plugins (see `build/plugins.ts`)

- Vue 3 + JSX support
- SVG loader
- Auto-import icons via `unplugin-icons`
- CDN import (optional, configured via `VITE_CDN`)
- Compression (gzip/brotli, via `VITE_COMPRESSION`)
- Mock server (`vite-plugin-fake-server`)
- Console removal in production
- Bundle analyzer

### Path Aliases

```typescript
@/ → src/
```

## Testing & Development Notes

### Login Credentials (Mock)

- **Admin**: username: `admin`, password: `admin123` (full permissions: `*:*:*`)
- **Common**: Any other username, password: `admin123` (limited permissions)
- Password rule: 8-18 characters, must contain 2 of 3 types (number/letter/symbol)

### Development Tools & Features

- **Code Inspector**: Press Option+Shift to map DOM elements directly to source code
- **Automatic Route Importing**: Routes in `src/router/modules/` are automatically loaded
- **Build Optimization**:
  - Route-based code splitting with static assets to `static/` directory
  - Component lazy loading with pre-warming mechanism
  - Icon optimization via unplugin-icons
  - Bundle analysis via rollup-plugin-visualizer
- **Package Manager**: pnpm required (enforced by package.json config)
- **Development Server**: Runs on port 8848, accessible at 0.0.0.0

### Performance Metrics

- Bundle size < 2.3MB (with Element Plus global import)
- < 350KB with brotli compression and CDN mode
- File pre-warming for faster initial load
- Responsive storage management for better performance

### Browser Support

- Target: ES2015+
- Modern browsers recommended (Chrome 90+, Firefox 88+, Safari 14+)

## Common Patterns to Maintain

### Store Hook Pattern

```typescript
import { useUserStoreHook } from "@/store/modules/user";

// In component or utility
const userStore = useUserStoreHook();
```

### Responsive Storage

Uses `responsive-storage` for localStorage management with automatic cleanup based on `multipleTabsKey` cookie lifecycle.

### Tree Structure Utilities

Functions in `@/utils/tree` for hierarchical data (menus, permissions):

- `buildHierarchyTree`: Convert flat array to tree structure
- `filterTree`: Filter tree nodes by condition
- `filterNoPermissionTree`: Remove nodes without permissions

### HTTP Request Wrapper

Centralized in `src/utils/http/index.ts` with interceptors for:

- Token injection
- Response transformation
- Error handling
- Loading state management

### Repository Pattern

Supabase data access organized via repository pattern:

- `src/repositories/*Supabase.ts` - Database-specific implementations
- `src/api/*.ts` - API interfaces that can switch between mock and Supabase
- `src/services/storage.ts` - File storage operations

## Supabase Integration

### Database Configuration

- **Project URL**: https://zflehoeaadcganacwksb.supabase.co
- **Environment**: Development configuration in `.env.development`
- **Client Setup**: Dual client configuration in `src/services/supabase.ts`
  - Standard client for user operations (with auth)
  - Admin client for server-side operations (service role)

### Database Schema

Core business tables managed via Supabase:

- **Users & Auth**: `users` table with role-based permissions
- **Business Entities**: `companies`, `contracts`, `inquiries`, `products`
- **Financial Data**: `supplier_payments`, `customer_payments`, `expenses`
- **Analytics**: `profit_calculations`, `custom_fees`

### Migration Management

- Database migrations in `supabase/migrations/`
- SQL schema files in project root for quick fixes
- Use MCP `mcp__supabase_apply_migration` for schema changes

### MCP Integration

Available Supabase MCP operations:

- `mcp__supabase_execute_sql` - Run queries directly
- `mcp__supabase_apply_migration` - Apply schema changes
- `mcp__supabase_list_tables` - Inspect database structure
- `mcp__supabase_get_logs` - Debug API issues
- `mcp__supabase_generate_typescript_types` - Generate type definitions

### Supabase Development

```bash
# Generate TypeScript types from database schema
npx supabase gen types typescript --project-id zflehoeaadcganacwksb > src/types/supabase.ts

# Start local Supabase development (if needed)
supabase start

# Apply database migrations
supabase db push

# Link to remote project
supabase link --project-ref zflehoeaadcganacwksb
```

### Storage Buckets

- `contracts/` - Contract attachments
- `inquiry-attachments/` - Inquiry files
- `invoices/` - Invoice documents
- File size limit: 50MB per file
