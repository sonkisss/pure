import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

// 生产环境调试 - 仅用于排查问题
if (import.meta.env.PROD) {
  console.log("Supabase Config Debug:", {
    urlPrefix: url?.substring(0, 20) + "...",
    anonKeyPrefix: anonKey?.substring(0, 20) + "...",
    anonKeyLength: anonKey?.length
  });
}

if (!url || !anonKey) {
  throw new Error("Supabase 环境变量缺失，请检查 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

let supabase: SupabaseClient;
let supabaseAdmin: SupabaseClient | undefined;

// 创建普通的客户端（仅用于数据库操作）
supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// 创建管理员客户端（用于服务器端操作，如创建存储桶）
// 注意：serviceRoleKey 只能在开发环境中使用，生产环境必须禁用，以防密钥泄露
if (
  url &&
  serviceRoleKey &&
  serviceRoleKey !== "YOUR_SERVICE_ROLE_KEY_HERE" &&
  import.meta.env.DEV
) {
  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export { supabase, supabaseAdmin };
