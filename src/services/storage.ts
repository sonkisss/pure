import OSS from "ali-oss";

// OSS 配置
const ossRegion = import.meta.env.VITE_OSS_REGION;
const ossAccessKeyId = import.meta.env.VITE_OSS_ACCESS_KEY_ID;
const ossAccessKeySecret = import.meta.env.VITE_OSS_ACCESS_KEY_SECRET;
const ossStsToken = import.meta.env.VITE_OSS_STS_TOKEN; // 推荐：临时安全令牌
const ossStsEndpoint = import.meta.env.VITE_OSS_STS_ENDPOINT; // 后端/云函数获取 STS
const ossBucket = import.meta.env.VITE_OSS_BUCKET;
const ossCustomDomain = import.meta.env.VITE_OSS_CUSTOM_DOMAIN; // 自定义域名（可选）
const ossEndpoint = import.meta.env.VITE_OSS_ENDPOINT;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAccessToken = import.meta.env.VITE_SUPABASE_ACCESS_TOKEN;

let activeRegion = ossRegion;
let activeBucket = ossBucket;
let activeCustomDomain = ossCustomDomain;
let activeEndpoint = ossEndpoint;

type OssCredentials = {
  accessKeyId: string;
  accessKeySecret: string;
  stsToken?: string;
  expireAt?: number;
  region?: string;
  bucket?: string;
  endpoint?: string;
  customDomain?: string;
};

let cachedCreds: OssCredentials | undefined;
let ossClientPromise: Promise<OSS | undefined> | undefined;

const isExpiring = (creds?: OssCredentials) =>
  !!creds?.expireAt && creds.expireAt - Date.now() < 5 * 60 * 1000; // 提前 5 分钟刷新

const fetchStsCredentialsFromApi = async (): Promise<OssCredentials> => {
  if (!ossStsEndpoint) {
    throw new Error("缺少后端 STS 接口（VITE_OSS_STS_ENDPOINT）");
  }
  const headers: Record<string, string> = {};
  const authToken = supabaseAccessToken || supabaseAnonKey;
  // Supabase Edge Functions 默认需要 apikey/Authorization，缺少会返回 401
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
    headers.apikey = supabaseAnonKey || authToken;
  }
  const resp = await fetch(ossStsEndpoint, {
    method: "GET",
    headers: Object.keys(headers).length ? headers : undefined
  });
  if (!resp.ok) {
    throw new Error(`STS 接口请求失败: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  if (!data?.accessKeyId || !data?.accessKeySecret) {
    throw new Error("STS 接口返回缺少凭证字段");
  }
  const expireAt = data.expiration ? Date.parse(data.expiration) : undefined;
  return {
    accessKeyId: data.accessKeyId,
    accessKeySecret: data.accessKeySecret,
    stsToken: data.stsToken,
    expireAt,
    region: data.region,
    bucket: data.bucket,
    endpoint: data.endpoint,
    customDomain: data.customDomain
  };
};

const initOssClient = async (): Promise<OSS | undefined> => {
  try {
    let creds: OssCredentials | undefined;

    if (ossStsEndpoint) {
      try {
        creds = await fetchStsCredentialsFromApi();
      } catch (err) {
        console.warn("STS 接口调用失败，回退本地环境变量:", err);
      }
    }

    if (!creds) {
      if (!ossAccessKeyId || !ossAccessKeySecret || !ossBucket) {
        console.warn("⚠️ OSS 配置缺失，无法初始化客户端");
        return undefined;
      }
      creds = {
          accessKeyId: ossAccessKeyId,
          accessKeySecret: ossAccessKeySecret,
          stsToken: ossStsToken,
          region: ossRegion,
          bucket: ossBucket,
          endpoint: ossEndpoint,
          customDomain: ossCustomDomain,
          expireAt: Date.now() + 3600 * 1000 // 临时设置 1 小时有效，避免立即刷新
        };
    }

    activeRegion = creds.region || ossRegion;
    activeBucket = creds.bucket || ossBucket;
    activeCustomDomain = creds.customDomain || ossCustomDomain;
    activeEndpoint = creds.endpoint || ossEndpoint;
    cachedCreds = creds;

    const baseOptions: OSS.Options = {
      region: activeRegion || "",
      accessKeyId: creds.accessKeyId,
      accessKeySecret: creds.accessKeySecret,
      bucket: activeBucket || "",
      secure: true,
      ...(creds.stsToken ? { stsToken: creds.stsToken } : {})
    };

    if (activeCustomDomain) {
      const customUrl = activeCustomDomain.startsWith("http")
        ? new URL(activeCustomDomain)
        : new URL(`https://${activeCustomDomain}`);
      baseOptions.endpoint = customUrl.origin;
      baseOptions.cname = true;
      baseOptions.secure = customUrl.protocol === "https:";
    } else if (activeEndpoint) {
      baseOptions.endpoint = activeEndpoint;
    }

    if (ossStsEndpoint) {
      baseOptions.refreshSTSToken = async () => {
        const fresh = await fetchStsCredentialsFromApi();
        cachedCreds = fresh;
        activeRegion = fresh.region || activeRegion;
        activeBucket = fresh.bucket || activeBucket;
        activeCustomDomain = fresh.customDomain || activeCustomDomain;
        activeEndpoint = fresh.endpoint || activeEndpoint;
        console.log("🔄 已自动刷新 OSS STS 凭证");
        return {
          accessKeyId: fresh.accessKeyId,
          accessKeySecret: fresh.accessKeySecret,
          stsToken: fresh.stsToken || ""
        };
      };
      baseOptions.refreshSTSTokenInterval = cachedCreds?.expireAt
        ? Math.max(5 * 60 * 1000, cachedCreds.expireAt - Date.now() - 5 * 60 * 1000)
        : 15 * 60 * 1000;
    }

    const client = new OSS(baseOptions);
    console.log("✅ 阿里云 OSS 客户端初始化成功");
    return client;
  } catch (error) {
    console.error("❌ 阿里云 OSS 客户端初始化失败:", error);
    return undefined;
  }
};

const getOssClient = async (): Promise<OSS | undefined> => {
  if (!ossClientPromise || isExpiring(cachedCreds)) {
    ossClientPromise = initOssClient();
  }
  return ossClientPromise;
};

export interface StorageFile {
  id: string;
  path: string;
  fullPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  fileUrl?: string;
}

const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/octet-stream",
  "image/*",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml"
];

const DEFAULT_FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB

/**
 * 检查存储桶是否存在 (OSS版本无需自动创建Bucket，假设已存在)
 * @param bucket 存储桶名称 (在OSS中对应为文件夹前缀)
 * @returns 检查结果
 */
const ensureBucketExists = async (
  bucket: string
): Promise<{ success: boolean; error?: string }> => {
  const client = await getOssClient();
  if (!client) return { success: false, error: "OSS client not configured" };
  // OSS 中不需要像 Supabase 那样创建 Bucket，我们假设主 Bucket 已经存在
  // 这里的 bucket 参数将作为文件夹处理
  return { success: true };
};

/**
 * 直接上传文件到指定路径 (OSS)
 * @param file 文件对象
 * @param fullPath 完整路径 (objectName)
 * @returns 上传结果
 */
export const uploadFileToPath = async (
  file: File,
  fullPath: string
): Promise<UploadResult> => {
  const client = await getOssClient();
  if (!client) return { success: false, error: "OSS client not available. Check .env configuration." };

  try {
    console.log(`正在上传文件到 OSS (直接路径): ${fullPath}`);

    // 上传文件，显式带上内容类型，方便预览时使用正确的 Content-Type
    const result = await client.put(fullPath, file, {
      headers: {
        "Content-Type": file.type || "application/pdf",
        "Content-Disposition": "inline"
      }
    });

    if (result.res.status === 200) {
      console.log("OSS Upload Success:", result);
      
      let fileUrl = result.url;
      if (!fileUrl && activeBucket && activeRegion) {
        fileUrl = `https://${activeBucket}.${activeRegion}.aliyuncs.com/${fullPath}`;
      }
      
      if (fileUrl.startsWith('http://')) {
        fileUrl = fileUrl.replace('http://', 'https://');
      }

      return {
        success: true,
        filePath: fullPath,
        fileUrl: fileUrl || ""
      };
    } else {
      console.error("OSS Upload Failed:", result);
      return { success: false, error: `Upload failed with status ${result.res.status}` };
    }
  } catch (error) {
    console.error("OSS Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};

/**
 * 上传文件到阿里云 OSS
 * @param file 文件对象
 * @param bucket 逻辑存储桶名称 (在OSS中作为一级目录)
 * @param folder 文件夹路径 (二级目录)
 * @returns 上传结果
 */
export const uploadFileToSupabase = async (
  file: File,
  bucket: string = "invoices",
  folder: string = "pdfs"
): Promise<UploadResult> => {
  try {
    // 生成唯一的文件名
    // 路径格式: bucket/folder/timestamp-random-filename
    // 注意: OSS 不需要开头的 /
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
    const objectName = `${bucket}/${folder}/${fileName}`;

    return await uploadFileToPath(file, objectName);
  } catch (error) {
    console.error("OSS Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};

/**
 * 删除 OSS 中的文件
 * @param filePath 文件路径 (OSS Object Name)
 * @param bucket 存储桶名称 (这里可能已经包含在 filePath 中，或者作为前缀)
 * @returns 删除结果
 */
export const deleteFileFromSupabase = async (
  filePath: string,
  bucket: string = "invoices"
): Promise<{ success: boolean; error?: string }> => {
  const client = await getOssClient();
  if (!client) return { success: false, error: "OSS client not available" };

  try {
    // 如果 filePath 已经包含了 bucket 前缀，直接使用
    // 否则拼接
    let objectName = filePath;
    // 简单检查是否需要拼接 bucket
    // 如果 filePath 看起来已经是一个完整的路径（包含 /），且不以 / 开头，我们假设它是正确的 objectName
    // 这里为了兼容性，如果传入的 path 不包含 bucket，可能需要拼接。
    // 但鉴于 OSS objectKey 的灵活性，最安全的是让调用者传递正确的 fullPath
    // 或者我们假设 Supabase 的 bucket 概念映射为 OSS 的一级目录
    if (!filePath.includes("/")) {
       objectName = `${bucket}/${filePath}`;
    }

    console.log(`正在删除 OSS 文件: ${objectName}`);
    const result = await client.delete(objectName);

    if (result.res.status >= 200 && result.res.status < 300) {
      return { success: true };
    } else {
      return { success: false, error: `Delete failed with status ${result.res.status}` };
    }
  } catch (error) {
    console.error("OSS Deletion error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};

/**
 * 获取文件的公共URL
 * @param filePath 文件路径 (OSS Object Name)
 * @param bucket 存储桶名称
 * @returns 文件URL
 */
export const getPublicFileUrl = (
  filePath: string,
  bucket: string = "invoices"
): string => {
  if (!activeBucket || !activeRegion) {
    console.warn("OSS配置缺失，无法生成公共URL");
    return "";
  }

  if (!filePath) {
    console.warn("文件路径为空，无法生成公共URL");
    return "";
  }
  
  // 简单拼接 URL
  // 如果 filePath 已经包含 http，直接返回
  if (filePath.startsWith("http")) {
    return filePath;
  }

  // 使用自定义域名优先，其次默认域名
  if (activeCustomDomain) {
    try {
      const customUrl = activeCustomDomain.startsWith("http")
        ? new URL(activeCustomDomain)
        : new URL(`https://${activeCustomDomain}`);
      return `${customUrl.origin}/${filePath}`;
    } catch {
      // ignore and fallback
    }
  }

  return `https://${activeBucket}.${activeRegion}.aliyuncs.com/${filePath}`;
};

/**
 * 获取带签名的文件URL (用于私有读文件)
 * @param fullPath 完整路径 (objectName)
 * @param expires 过期时间 (秒)
 * @returns 签名URL
 */
export const getSignedFileUrl = async (
  fullPath: string,
  expires: number = 3600,
  options?: { inline?: boolean; contentType?: string; fileName?: string }
): Promise<string> => {
  const client = await getOssClient();
  if (!client) {
    console.warn("OSS client not available for signed URL");
    return "";
  }
  
  try {
    const fileName =
      options?.fileName || fullPath.split("/").pop() || "file";

    const responseHeaders: Record<string, string> = {};
    const disposition =
      (options?.inline ?? true) === false ? "attachment" : "inline";
    const encodedName = encodeURIComponent(fileName);
    responseHeaders[
      "content-disposition"
    ] = `${disposition}; filename=\"${encodedName}\"; filename*=UTF-8''${encodedName}`;

    const signed = client.signatureUrl(fullPath, {
      expires,
      response: responseHeaders
    });
    return signed;
  } catch (error) {
    console.error("OSS signatureUrl error:", error);
    return "";
  }
};

/** 从完整 URL 中提取对象路径（bucket 下的 object key） */
export const extractOssObjectPath = (url: string): string => {
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
  } catch {
    return url.startsWith("/") ? url.slice(1) : url;
  }
};

/**
 * 列出指定目录下的文件 (OSS)
 * @param bucket 存储桶/一级目录
 * @param path 目录路径
 * @param limit 限制数量
 * @returns 文件列表
 */
export const listFilesFromSupabase = async (
  bucket: string,
  path: string,
  limit: number = 100
): Promise<{ data: any[] | null; error: any }> => {
  const client = await getOssClient();
  if (!client) return { data: null, error: new Error("OSS client not available") };

  try {
    // 构造 prefix: bucket/path/
    let prefix = `${bucket}/${path}`;
    if (!prefix.endsWith("/")) {
      prefix += "/";
    }

    // 去除开头可能的 /
    if (prefix.startsWith("/")) {
      prefix = prefix.substring(1);
    }

    const result = await client.list({
      prefix: prefix,
      "max-keys": limit
    }, {});

    if (!result.objects) {
      return { data: [], error: null };
    }

    // 转换为 Supabase 风格的输出
    const files = result.objects.map((obj: any) => {
      // 获取文件名 (去除 prefix)
      let name = obj.name;
      if (name.startsWith(prefix)) {
        name = name.substring(prefix.length);
      }
      
      // 如果是目录占位符，跳过 (或者 name 为空)
      if (!name) return null;

      return {
        name: name,
        id: obj.etag, // 使用 etag 作为临时 ID
        updated_at: obj.lastModified,
        created_at: obj.lastModified,
        last_accessed_at: obj.lastModified,
        metadata: {
          size: obj.size,
          mimetype: "application/octet-stream" // OSS list 不返回 mimeType
        }
      };
    }).filter((item: any) => item !== null);

    return { data: files, error: null };
  } catch (error) {
    console.error("OSS List error:", error);
    return { data: null, error };
  }
};
