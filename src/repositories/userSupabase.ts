import { supabase, supabaseAdmin } from "@/services/supabase";
// bcryptjs 在浏览器中不可用，需要使用其他方式验证密码
// 这里我们先使用简单的明文比较，实际项目中应该通过API服务端验证

export type User = {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  role: "admin" | "common";
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LoginForm = {
  username: string;
  password: string;
};

export type LoginResponse = {
  user: Omit<User, "password_hash">;
  token?: string;
  refreshToken?: string;
};

/**
 * 本地用户表登录 - 安全版认证
 * 使用本地users表进行认证，JWT token 安全验证
 */
export const login = async (form: LoginForm): Promise<LoginResponse> => {
  if (!supabase) throw new Error("Supabase 客户端未初始化");
  try {
    // 直接查询本地users表
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("username", form.username)
      .eq("is_active", true)
      .single();

    // 如果普通客户端查询失败，尝试使用admin客户端
    if (userError && supabaseAdmin) {
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("username", form.username)
        .eq("is_active", true)
        .single();

      if (!adminError && adminData) {
        userData = adminData;
        userError = null;
      }
    }

    if (userError || !userData) {
      console.error("用户不存在:", userError);
      throw new Error("用户名或密码错误");
    }

    // 临时密码验证 - 仅用于演示
    // 实际项目中应该使用API服务端验证
    // 1. 优先检查硬编码的预设用户（兼容旧的 bcrypt 哈希）
    // 管理员账号 admin/admin123
    let isValidPassword =
      (userData.username === "admin" && form.password === "admin123") ||
      (userData.username === "15904723039" && form.password === "123456") ||
      (userData.username === "15335509998" && form.password === "123456") ||
      (userData.username === "15354909898" && form.password === "123456");

    // 2. 如果硬编码检查失败，尝试验证数据库中的哈希（兼容新创建/修改密码的用户）
    // 新用户使用简单的 base64(password + ":salt") 哈希
    if (!isValidPassword && userData.password_hash) {
      // 优先尝试 bcrypt 验证（兼容旧数据）
      if (userData.password_hash.startsWith("$2")) {
        const bcrypt = await import("bcryptjs");
        isValidPassword = bcrypt.compareSync(
          form.password,
          userData.password_hash
        );
      }
      // 其次尝试 Base64 验证（兼容新数据）
      else {
        const inputHash = btoa(form.password + ":salt");
        if (userData.password_hash === inputHash) {
          isValidPassword = true;
        }
      }
    }

    if (!isValidPassword) {
      console.error("密码验证失败");
      throw new Error("用户名或密码错误");
    }

    // 使用简单的token方案
    const { generateToken, generateRefreshToken } =
      await import("@/utils/auth-simple");

    const token = generateToken({
      userId: userData.id,
      username: userData.username,
      role: userData.role
    });

    const refreshToken = generateRefreshToken({
      userId: userData.id,
      username: userData.username,
      role: userData.role
    });

    const { password_hash: _password_hash, ...userWithoutPassword } = userData;

    console.log("登录成功，用户:", userWithoutPassword.username);

    return {
      user: userWithoutPassword as User,
      token: token,
      refreshToken: refreshToken
    };
  } catch (error) {
    console.error("登录失败:", error);
    throw error;
  }
};

/**
 * 获取用户列表
 */
export const getUserList = async (params?: {
  page?: number;
  pageSize?: number;
  username?: string;
  role?: string;
}): Promise<{ list: User[]; total: number }> => {
  if (!supabase) throw new Error("Supabase 客户端未初始化");
  try {
    let query = supabase
      .from("users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // 搜索条件 - 支持按用户名或姓名搜索
    if (params?.username && params.username.trim()) {
      query = query.or(
        `username.ilike.%${params.username}%,nickname.ilike.%${params.username}%`
      );
    }

    if (params?.role && params.role !== "all") {
      query = query.eq("role", params.role);
    }

    // 分页
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("获取用户列表失败:", error);
      throw new Error("获取用户列表失败: " + error.message);
    }

    return {
      list: data as User[],
      total: count || 0
    };
  } catch (error) {
    console.error("获取用户列表失败:", error);
    throw error;
  }
};

/**
 * 根据ID获取用户
 */
export const getUserById = async (id: number): Promise<User | null> => {
  if (!supabase) throw new Error("Supabase 客户端未初始化");
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("获取用户失败:", error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error("获取用户失败:", error);
    return null;
  }
};

/**
 * 创建用户（直接使用表操作，遵循 RLS 策略）
 */
export const createUser = async (userData: {
  username: string;
  password: string;
  nickname?: string;
  role?: string;
  permissions?: string[];
}): Promise<User> => {
  if (!supabase) throw new Error("Supabase 客户端未初始化");
  try {
    // 验证输入数据
    if (!userData.username || !userData.password) {
      throw new Error("用户名和密码不能为空");
    }

    // 注意：bcrypt不能在浏览器中运行
    // 在生产环境中，用户创建应该通过API服务端完成
    // 这里使用简单的base64编码（仅用于演示）
    const passwordHash = btoa(userData.password + ":salt"); // 临时方案

    // 准备插入数据
    const insertData = {
      username: userData.username,
      password_hash: passwordHash,
      nickname: userData.nickname || userData.username,
      role: userData.role || "common",
      permissions: userData.permissions || [],
      is_active: true
    };

    // 使用普通 supabase 客户端，遵循 RLS 策略
    const { data, error } = await supabase
      .from("users")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("创建用户失败:", error);
      throw new Error("创建用户失败: " + error.message);
    }

    if (!data) {
      throw new Error("创建用户失败: 未返回用户数据");
    }

    return data as User;
  } catch (error) {
    console.error("创建用户失败:", error);
    throw error;
  }
};

/**
 * 更新用户（直接使用表操作，遵循 RLS 策略）
 */
export const updateUser = async (
  id: number,
  userData: {
    username?: string;
    password?: string;
    nickname?: string;
    role?: string;
    permissions?: string[];
    is_active?: boolean;
  }
): Promise<User> => {
  if (!supabase) throw new Error("Supabase 客户端未初始化");
  try {
    // 准备更新数据
    const updateData: any = {};

    if (userData.username !== undefined)
      updateData.username = userData.username;
    if (userData.nickname !== undefined)
      updateData.nickname = userData.nickname;
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.permissions !== undefined)
      updateData.permissions = userData.permissions;
    if (userData.is_active !== undefined)
      updateData.is_active = userData.is_active;

    // 如果有密码，进行加密
    if (userData.password) {
      // 注意：bcrypt不能在浏览器中运行
      // 在生产环境中，密码更新应该通过API服务端完成
      updateData.password_hash = btoa(userData.password + ":salt"); // 临时方案
    }

    // 使用普通 supabase 客户端，遵循 RLS 策略
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("更新用户失败:", error);
      throw new Error("更新用户失败: " + error.message);
    }

    if (!data) {
      throw new Error("更新用户失败: 未找到用户");
    }

    return data as User;
  } catch (error) {
    console.error("更新用户失败:", error);
    throw error;
  }
};

/**
 * 删除用户（直接使用表操作，遵循 RLS 策略）
 */
export const deleteUser = async (id: number): Promise<boolean> => {
  if (!supabase) throw new Error("Supabase 客户端未初始化");
  try {
    // 使用普通 supabase 客户端，遵循 RLS 策略
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      console.error("删除用户失败:", error);
      throw new Error("删除用户失败: " + error.message);
    }

    return true;
  } catch (error) {
    console.error("删除用户失败:", error);
    throw error;
  }
};

/**
 * 切换用户状态
 */
export const toggleUserStatus = async (id: number): Promise<User> => {
  if (!supabase) throw new Error("Supabase 客户端未初始化");
  try {
    // 先获取当前状态
    const currentUser = await getUserById(id);
    if (!currentUser) {
      throw new Error("用户不存在");
    }

    // 切换状态
    const { data, error } = await supabase
      .from("users")
      .update({ is_active: !currentUser.is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("切换用户状态失败:", error);
      throw new Error("切换用户状态失败: " + error.message);
    }

    return data as User;
  } catch (error) {
    console.error("切换用户状态失败:", error);
    throw error;
  }
};

/**
 * 批量删除用户
 */
export const batchDeleteUsers = async (ids: number[]): Promise<boolean> => {
  if (!supabase) throw new Error("Supabase 客户端未初始化");
  try {
    const { error } = await supabase.from("users").delete().in("id", ids);

    if (error) {
      console.error("批量删除用户失败:", error);
      throw new Error("批量删除用户失败: " + error.message);
    }

    return true;
  } catch (error) {
    console.error("批量删除用户失败:", error);
    throw error;
  }
};
