import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  // 允许前端携带 Supabase 默认的认证头，否则预检会被 CORS 拦截
  "Access-Control-Allow-Headers":
    "authorization,apikey,content-type,x-client-info"
};

const percentEncode = (value: string) =>
  encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");

const base64Encode = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const hmacSha1 = async (data: string, key: string) => {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  return base64Encode(signature);
};

const buildAssumeRoleUrl = async () => {
  const accessKeyId = Deno.env.get("OSS_ACCESS_KEY_ID");
  const accessKeySecret = Deno.env.get("OSS_ACCESS_KEY_SECRET");
  const roleArn = Deno.env.get("OSS_ROLE_ARN");
  const roleSessionName =
    Deno.env.get("OSS_ROLE_SESSION_NAME") ?? "supabase-session";
  const durationSeconds = Number(Deno.env.get("OSS_STS_DURATION") ?? "3600");

  if (!accessKeyId || !accessKeySecret || !roleArn) {
    throw new Error(
      "Missing OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_ROLE_ARN"
    );
  }

  const params: Record<string, string | number> = {
    Format: "JSON",
    Version: "2015-04-01",
    AccessKeyId: accessKeyId,
    SignatureMethod: "HMAC-SHA1",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
    Action: "AssumeRole",
    RoleArn: roleArn,
    RoleSessionName: roleSessionName,
    DurationSeconds: durationSeconds
  };

  const canonicalized = Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(String(params[key]))}`)
    .join("&");

  const stringToSign = `GET&%2F&${percentEncode(canonicalized)}`;
  const signingKey = `${accessKeySecret}&`;
  const signature = await hmacSha1(stringToSign, signingKey);

  const finalQuery = `${canonicalized}&Signature=${percentEncode(signature)}`;
  return `https://sts.aliyuncs.com/?${finalQuery}`;
};

const verifyAuth = (_req: Request) => ({ ok: true });

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!["GET", "POST"].includes(req.method)) {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.message }), {
        status: auth.status ?? 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const url = await buildAssumeRoleUrl();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `STS request failed: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    const credentials = data?.Credentials;
    if (
      !credentials?.AccessKeyId ||
      !credentials?.AccessKeySecret ||
      !credentials?.SecurityToken
    ) {
      throw new Error("STS response missing credentials");
    }

    return new Response(
      JSON.stringify({
        accessKeyId: credentials.AccessKeyId,
        accessKeySecret: credentials.AccessKeySecret,
        stsToken: credentials.SecurityToken,
        expiration: credentials.Expiration,
        region: Deno.env.get("OSS_REGION"),
        bucket: Deno.env.get("OSS_BUCKET"),
        endpoint: Deno.env.get("OSS_ENDPOINT"),
        customDomain: Deno.env.get("OSS_CUSTOM_DOMAIN")
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
