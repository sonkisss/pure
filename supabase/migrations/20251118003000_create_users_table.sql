-- Migration: Create users table for user management
-- Created by: Supabase CLI
-- Date: 2025-11-18 00:30:00

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  avatar TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'common',
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Add comments
COMMENT ON TABLE users IS '用户管理表';
COMMENT ON COLUMN users.username IS '用户名（登录账户）';
COMMENT ON COLUMN users.password_hash IS '密码哈希';
COMMENT ON COLUMN users.nickname IS '用户昵称';
COMMENT ON COLUMN users.avatar IS '头像URL';
COMMENT ON COLUMN users.role IS '用户角色：admin-管理员，common-普通用户';
COMMENT ON COLUMN users.permissions IS '用户权限列表';
COMMENT ON COLUMN users.is_active IS '是否启用：true-启用，false-禁用';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user
INSERT INTO users (username, password_hash, nickname, role, permissions)
VALUES (
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO', -- 5822645a
  '系统管理员',
  'admin',
  ARRAY['*:*:*'] -- 全权限
);

-- Insert default common users
INSERT INTO users (username, password_hash, nickname, role, permissions) VALUES
('15904723039', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO', '用户1', 'common', ARRAY['permission:btn:add', 'permission:btn:edit', 'permission:btn:view']),
('15335509998', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO', '用户2', 'common', ARRAY['permission:btn:add', 'permission:btn:edit', 'permission:btn:view']),
('15354909898', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO', '用户3', 'common', ARRAY['permission:btn:add', 'permission:btn:edit', 'permission:btn:view']);