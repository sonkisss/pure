import CryptoJS from "crypto-js";

// 使用更简单的token方案 - 基于HMAC签名
const AUTH_KEY = import.meta.env.VITE_JWT_SECRET || "default-secret-change-me";

export interface AuthPayload {
  userId: number;
  username: string;
  role: string;
  timestamp: number;
  /** 兼容历史字段 */
  id?: number;
}

/**
 * 生成安全的token - 使用HMAC签名
 */
export const generateToken = (
  payload: Omit<AuthPayload, "timestamp">
): string => {
  const dataWithTimestamp: AuthPayload = {
    ...payload,
    timestamp: Date.now()
  };

  // Base64编码数据
  const data = btoa(JSON.stringify(dataWithTimestamp));

  // HMAC签名
  const signature = CryptoJS.HmacSHA256(data, AUTH_KEY).toString();

  // 组合token
  return `${data}.${signature}`;
};

/**
 * 验证token
 */
export const verifyToken = (token: string): AuthPayload => {
  try {
    const [data, signature] = token.split(".");

    // 验证格式
    if (!data || !signature) {
      throw new Error("无效的token格式");
    }

    // 验证签名
    const expectedSignature = CryptoJS.HmacSHA256(data, AUTH_KEY).toString();
    if (signature !== expectedSignature) {
      throw new Error("token签名验证失败");
    }

    // 解码数据
    const payload = JSON.parse(atob(data)) as AuthPayload;

    // 检查过期（24小时）
    const now = Date.now();
    const tokenAge = now - payload.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    if (tokenAge > maxAge) {
      throw new Error("token已过期");
    }

    return payload;
  } catch {
    throw new Error("无效的token");
  }
};

/**
 * 生成刷新token（有效期更长）
 */
export const generateRefreshToken = (
  payload: Omit<AuthPayload, "timestamp">
): string => {
  const dataWithTimestamp: AuthPayload = {
    ...payload,
    timestamp: Date.now() - (Date.now() % 86400000) // 按天对齐
  };

  const data = btoa(JSON.stringify(dataWithTimestamp));
  const signature = CryptoJS.HmacSHA256(`${data}_refresh`, AUTH_KEY).toString();

  return `${data}.${signature}`;
};

/**
 * 验证刷新token
 */
export const verifyRefreshToken = (token: string): AuthPayload => {
  try {
    const [data, signature] = token.split(".");

    if (!data || !signature) {
      throw new Error("无效的刷新token格式");
    }

    const expectedSignature = CryptoJS.HmacSHA256(
      `${data}_refresh`,
      AUTH_KEY
    ).toString();
    if (signature !== expectedSignature) {
      throw new Error("刷新token签名验证失败");
    }

    const payload = JSON.parse(atob(data)) as AuthPayload;

    // 刷新token有效期7天
    const now = Date.now();
    const tokenAge = now - payload.timestamp;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天

    if (tokenAge > maxAge) {
      throw new Error("刷新token已过期");
    }

    return payload;
  } catch {
    throw new Error("无效的刷新token");
  }
};
