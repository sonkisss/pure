import { getPluginsList } from "./build/plugins";
import { include, exclude } from "./build/optimize";
import { type UserConfigExport, type ConfigEnv, loadEnv } from "vite";
import type { Plugin } from "vite";
import {
  root,
  alias,
  wrapperEnv,
  pathResolve,
  __APP_INFO__
} from "./build/utils";

export default ({ mode }: ConfigEnv): UserConfigExport => {
  const { VITE_CDN, VITE_PORT, VITE_HOST, VITE_COMPRESSION, VITE_PUBLIC_PATH } =
    wrapperEnv(loadEnv(mode, root));

  const plugins: Plugin[] = [...getPluginsList(VITE_CDN, VITE_COMPRESSION)];

  if (mode === "production") {
    const cspContent =
      "default-src 'self'; " +
      "script-src 'self' https://cdn.bootcdn.net 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https://cdn.bootcdn.net; " +
      "img-src 'self' data: blob: http://8.140.31.58:* https://jctmy.xyz https://www.jctmy.xyz https://cdn.bootcdn.net https://*.supabase.co https://*.supabase.in https://*.aliyuncs.com http://oss.jctmy.xyz https://oss.jctmy.xyz; " +
      "font-src 'self' data: https://cdn.bootcdn.net; " +
      "connect-src 'self' http://8.140.31.58:* https://jctmy.xyz https://www.jctmy.xyz https://*.supabase.co https://*.supabase.in https://*.aliyuncs.com http://oss.jctmy.xyz https://oss.jctmy.xyz; " +
      "object-src 'none'; base-uri 'self'; frame-src 'none'; form-action 'self';";

    plugins.push({
      name: "inject-csp-meta",
      enforce: "post",
      transformIndexHtml(html) {
        // 在 build 产物注入 CSP，开发模式不生效，避免 HMR eval 警告
        return html.replace(
          "<head>",
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${cspContent}" />`
        );
      }
    });
  }

  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias
    },
    // 服务端渲染
    server: {
      // 端口号
      port: VITE_PORT,
      host: VITE_HOST || "127.0.0.1",
      // 本地跨域代理 https://cn.vitejs.dev/config/server-options.html#server-proxy
      proxy: {},
      // 预热文件以提前转换和缓存结果，降低启动期间的初始页面加载时长并防止转换瀑布
      warmup: {
        clientFiles: ["./index.html", "./src/{views,components}/*"]
      }
    },
    plugins,
    // https://cn.vitejs.dev/config/dep-optimization-options.html#dep-optimization-options
    optimizeDeps: {
      include,
      exclude
    },
    build: {
      // https://cn.vitejs.dev/guide/build.html#browser-compatibility
      target: "es2015",
      sourcemap: false,
      // 消除打包大小超过500kb警告
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        input: {
          index: pathResolve("./index.html", import.meta.url)
        },
        // 静态资源分类打包
        output: {
          chunkFileNames: "static/js/[name]-[hash].js",
          entryFileNames: "static/js/[name]-[hash].js",
          assetFileNames: "static/[ext]/[name]-[hash].[ext]"
        }
      }
    },
    esbuild: {
      // 生产环境自动移除 console 和 debugger
      drop: mode === "production" ? ["console", "debugger"] : []
    },
    define: {
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__)
    }
  };
};
