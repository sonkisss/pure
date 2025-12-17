-- Fix: Function Search Path Mutable (Security Vulnerability)
-- Description: Set explicit search_path = '' for security definer functions to prevent path hijacking
-- Date: 2025-12-12

-- 1. Fix public.update_user
CREATE OR REPLACE FUNCTION public.update_user(
    p_user_id integer,
    p_username character varying DEFAULT NULL::character varying,
    p_nickname character varying DEFAULT NULL::character varying,
    p_role character varying DEFAULT NULL::character varying,
    p_permissions text[] DEFAULT NULL::text[],
    p_is_active boolean DEFAULT NULL::boolean,
    p_password_hash character varying DEFAULT NULL::character varying
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_result public.users;
BEGIN
    -- 更新用户信息并返回完整的用户记录
    UPDATE public.users 
    SET 
        username = COALESCE(p_username, username),
        nickname = COALESCE(p_nickname, nickname),
        role = COALESCE(p_role, role),
        permissions = COALESCE(p_permissions, permissions),
        is_active = COALESCE(p_is_active, is_active),
        password_hash = COALESCE(p_password_hash, password_hash),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$function$;

-- 2. Fix public.update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

-- 3. Fix public.create_user
CREATE OR REPLACE FUNCTION public.create_user(
    p_username character varying,
    p_password_hash character varying,
    p_nickname character varying DEFAULT NULL::character varying,
    p_role character varying DEFAULT 'common'::character varying,
    p_permissions text[] DEFAULT NULL::text[],
    p_is_active boolean DEFAULT true
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    user_exists BOOLEAN;
    v_result public.users;
BEGIN
    -- 验证输入参数
    IF p_username IS NULL OR trim(p_username) = '' THEN
        RAISE EXCEPTION '用户名不能为空';
    END IF;
    
    IF p_password_hash IS NULL OR trim(p_password_hash) = '' THEN
        RAISE EXCEPTION '密码哈希不能为空';
    END IF;
    
    -- 只允许创建 'common' 角色的用户，防止权限提升
    IF p_role NOT IN ('common') THEN
        RAISE EXCEPTION '只允许创建普通用户';
    END IF;
    
    -- 检查用户名是否已存在
    SELECT EXISTS (SELECT 1 FROM public.users WHERE public.users.username = p_username) INTO user_exists;
    
    IF user_exists THEN
        RAISE EXCEPTION '用户名已存在';
    END IF;
    
    -- 创建用户并返回完整的用户记录
    INSERT INTO public.users (
        username,
        password_hash,
        nickname,
        role,
        permissions,
        is_active
    ) VALUES (
        p_username,
        p_password_hash,
        COALESCE(p_nickname, p_username),
        p_role,
        p_permissions,
        p_is_active
    )
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$function$;

-- 4. Fix public.get_current_username
CREATE OR REPLACE FUNCTION public.get_current_username()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    current_username TEXT;
BEGIN
    -- 尝试从auth.users获取用户名
    SELECT raw_user_meta_data->>'username' 
    INTO current_username
    FROM auth.users 
    WHERE id = auth.uid();
    
    RETURN COALESCE(current_username, '');
END;
$function$;
