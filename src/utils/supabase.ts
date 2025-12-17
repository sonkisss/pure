import { createClient } from "@supabase/supabase-js";

// Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase配置缺失，请检查.env.development文件");
}

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: "pure-admin-auth-token"
  }
});

// 导出Supabase客户端类型
export type SupabaseClient = ReturnType<typeof createClient>;
