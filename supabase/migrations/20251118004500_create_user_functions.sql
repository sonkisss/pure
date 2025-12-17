-- Migration: Create user management functions
-- Created by: Supabase CLI
-- Date: 2025-11-18 00:45:00

-- 密码验证函数
CREATE OR REPLACE FUNCTION verify_user_password(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- 获取用户信息
  SELECT id, username, password_hash, is_active
  INTO user_record
  FROM users
  WHERE username = p_username AND is_active = true;

  -- 用户不存在或已禁用
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 验证密码 (使用crypt函数)
  IF user_record.password_hash = crypt(p_password, user_record.password_hash) THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建用户函数
CREATE OR REPLACE FUNCTION create_user(
  p_username TEXT,
  p_password TEXT,
  p_nickname TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'common',
  p_permissions TEXT[] DEFAULT '{}'
)
RETURNS users AS $$
DECLARE
  new_user users;
  hashed_password TEXT;
BEGIN
  -- 生成密码哈希
  hashed_password := crypt(p_password, gen_salt('bf', 12));

  -- 创建用户
  INSERT INTO users (
    username,
    password_hash,
    nickname,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_username,
    hashed_password,
    COALESCE(p_nickname, p_username),
    p_role,
    p_permissions,
    true,
    NOW(),
    NOW()
  ) RETURNING * INTO new_user;

  RETURN new_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新用户密码函数
CREATE OR REPLACE FUNCTION update_user_password(p_user_id INTEGER, p_new_password TEXT)
RETURNS users AS $$
DECLARE
  updated_user users;
  hashed_password TEXT;
BEGIN
  -- 生成新密码哈希
  hashed_password := crypt(p_new_password, gen_salt('bf', 12));

  -- 更新密码
  UPDATE users
  SET
    password_hash = hashed_password,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO updated_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在';
  END IF;

  RETURN updated_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 切换用户状态函数
CREATE OR REPLACE FUNCTION toggle_user_status(p_user_id INTEGER)
RETURNS users AS $$
DECLARE
  updated_user users;
BEGIN
  UPDATE users
  SET
    is_active = NOT is_active,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO updated_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在';
  END IF;

  RETURN updated_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户信息（排除密码哈希）函数
CREATE OR REPLACE FUNCTION get_user_info(p_user_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  username TEXT,
  nickname TEXT,
  avatar TEXT,
  role TEXT,
  permissions TEXT[],
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    username,
    nickname,
    avatar,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
  FROM users
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户权限列表函数
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id INTEGER)
RETURNS TEXT[] AS $$
DECLARE
  user_permissions TEXT[];
  user_role TEXT;
BEGIN
  -- 获取用户角色和权限
  SELECT role, permissions INTO user_role, user_permissions
  FROM users
  WHERE id = p_user_id AND is_active = true;

  -- 如果用户不存在或已禁用，返回空数组
  IF NOT FOUND THEN
    RETURN '{}';
  END IF;

  -- 如果是管理员，返回全权限
  IF user_role = 'admin' THEN
    RETURN ARRAY['*:*:*'];
  END IF;

  -- 返回用户特定权限
  RETURN COALESCE(user_permissions, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户权限函数
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id INTEGER,
  p_required_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions TEXT[];
BEGIN
  -- 获取用户权限
  user_permissions := get_user_permissions(p_user_id);

  -- 检查是否有全权限
  IF '*:*:*' = ANY(user_permissions) THEN
    RETURN TRUE;
  END IF;

  -- 检查特定权限
  RETURN p_required_permission = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active) WHERE is_active = true;

-- 添加函数注释
COMMENT ON FUNCTION verify_user_password IS '验证用户密码';
COMMENT ON FUNCTION create_user IS '创建新用户并自动加密密码';
COMMENT ON FUNCTION update_user_password IS '更新用户密码并自动加密';
COMMENT ON FUNCTION toggle_user_status IS '切换用户启用/禁用状态';
COMMENT ON FUNCTION get_user_info IS '获取用户基本信息（排除密码）';
COMMENT ON FUNCTION get_user_permissions IS '获取用户权限列表';
COMMENT ON FUNCTION check_user_permission IS '检查用户是否有特定权限';