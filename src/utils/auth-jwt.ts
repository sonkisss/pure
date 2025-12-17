import jwt from "jsonwebtoken";

// JWT 密钥 - 从环境变量获取，如果没有则使用默认值
const JWT_SECRET =
  import.meta.env.VITE_JWT_SECRET ||
  "your-secret-key-change-this-in-production";
const JWT_EXPIRES_IN = import.meta.env.VITE_JWT_EXPIRES_IN || "24h";

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * 生成 JWT token
 */
export const generateToken = (
  payload: Omit<JWTPayload, "iat" | "exp">
): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * 验证 JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    throw new Error("无效的token");
  }
};

/**
 * 生成刷新token
 */
export const generateRefreshToken = (
  payload: Omit<JWTPayload, "iat" | "exp">
): string => {
  // 刷新token有效期更长
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

/**
 * 验证刷新token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    throw new Error("无效的刷新token");
  }
};
