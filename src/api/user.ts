import {
  login as supabaseLogin,
  getUserList,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  batchDeleteUsers
} from "@/repositories/userSupabase";

export type UserResult = {
  success: boolean;
  message?: string;
  data: {
    /** 头像 */
    avatar: string;
    /** 用户名 */
    username: string;
    /** 昵称 */
    nickname: string;
    /** 当前登录用户的角色 */
    roles: Array<string>;
    /** 按钮级别权限 */
    permissions: Array<string>;
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

export type RefreshTokenResult = {
  success: boolean;
  data: {
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

/** 登录 - 连接真实数据库 */
export const getLogin = async (data?: {
  username: string;
  password: string;
}) => {
  try {
    const loginData = await supabaseLogin({
      username: data?.username || "",
      password: data?.password || ""
    });

    // 转换数据格式以匹配现有的UserResult接口
    const result: UserResult = {
      success: true,
      data: {
        avatar: loginData.user.avatar || "",
        username: loginData.user.username,
        nickname: loginData.user.nickname || loginData.user.username,
        roles: [loginData.user.role],
        permissions: loginData.user.permissions,
        accessToken: loginData.token || "",
        refreshToken: loginData.refreshToken || "",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
      }
    };

    return result;
  } catch (error) {
    console.error("登录失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "登录失败",
      data: {
        avatar: "",
        username: "",
        nickname: "",
        roles: [],
        permissions: [],
        accessToken: "",
        refreshToken: "",
        expires: new Date()
      }
    };
  }
};

/** 刷新`token` - JWT安全版 */
export const refreshTokenApi = async (data?: { refreshToken: string }) => {
  try {
    if (!data?.refreshToken) {
      throw new Error("缺少refreshToken");
    }

    // 使用简单token验证
    const { verifyRefreshToken, generateToken, generateRefreshToken } =
      await import("@/utils/auth-simple");

    const decoded = verifyRefreshToken(data.refreshToken);

    const { supabase } = await import("@/services/supabase");
    if (!supabase) {
      throw new Error("Supabase 客户端未初始化");
    }

    // 验证用户是否仍然存在且激活
    const { data: userData, error } = await supabase
      .from("users")
      .select("id, username, is_active")
      .eq("id", decoded.userId || decoded.id)
      .eq("is_active", true)
      .single();

    if (error || !userData) {
      throw new Error("用户不存在或已被禁用");
    }

    // 生成新的token
    const newToken = generateToken({
      userId: userData.id,
      username: userData.username,
      role: decoded.role
    });

    const newRefreshToken = generateRefreshToken({
      userId: userData.id,
      username: userData.username,
      role: decoded.role
    });

    return {
      success: true,
      data: {
        accessToken: newToken,
        refreshToken: newRefreshToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
      }
    };
  } catch (error) {
    console.error("Token刷新失败:", error);
    return {
      success: false,
      data: {
        accessToken: "",
        refreshToken: "",
        expires: new Date()
      }
    };
  }
};

// 用户管理API接口
export type UserListParams = {
  page?: number;
  pageSize?: number;
  username?: string;
  role?: string;
};

export type UserListItem = {
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

export type CreateUserData = {
  username: string;
  password: string;
  nickname?: string;
  role?: string;
  permissions?: string[];
};

export type UpdateUserData = {
  username?: string;
  password?: string;
  nickname?: string;
  role?: string;
  permissions?: string[];
  is_active?: boolean;
};

/** 获取用户列表 */
export const getUserListApi = (params?: UserListParams) => {
  return getUserList(params);
};

/** 根据ID获取用户 */
export const getUserByIdApi = (id: number) => {
  return getUserById(id);
};

/** 创建用户 */
export const createUserApi = (userData: CreateUserData) => {
  return createUser(userData);
};

/** 更新用户 */
export const updateUserApi = (id: number, userData: UpdateUserData) => {
  return updateUser(id, userData);
};

/** 删除用户 */
export const deleteUserApi = (id: number) => {
  return deleteUser(id);
};

/** 切换用户状态 */
export const toggleUserStatusApi = (id: number) => {
  return toggleUserStatus(id);
};

/** 批量删除用户 */
export const batchDeleteUsersApi = (ids: number[]) => {
  return batchDeleteUsers(ids);
};
