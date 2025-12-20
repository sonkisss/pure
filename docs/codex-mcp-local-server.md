# Codex / 浏览器 MCP 本地服务启动说明（解决 EPERM 端口监听）

在当前 Codex CLI 沙箱环境中，默认情况下会禁止本机端口监听（`socket.bind` 会报 `EPERM: operation not permitted`），导致：

- `pnpm dev` / `pnpm preview` 无法启动
- `python3 -m http.server` 无法监听端口
- 浏览器 MCP 只能用 `file://` 打开 `dist`，但 SPA 资源会触发 CORS 无法加载

## 结论

需要用“提升权限”的方式启动本地服务（允许监听端口），然后让浏览器 MCP 访问 `http://127.0.0.1:<port>/`。

## 方式 A：直接启动静态服务（推荐用于复现 UI）

从仓库根目录执行：

```bash
python3 -m http.server 4173 --directory pure-admin-thin/dist
```

然后在浏览器 MCP 中打开：

```text
http://127.0.0.1:4173/
```

## 方式 B：启动 Vite dev server（需要 Node 环境）

从 `pure-admin-thin/` 启动：

```bash
pnpm dev --host 127.0.0.1 --port 5173
```

再在浏览器 MCP 中打开：

```text
http://127.0.0.1:5173/
```

## Codex CLI 中怎么“提升权限”

当你让 Codex 执行上述命令时，若环境提示需要授权（on-request），请允许该次命令以获得监听端口权限。
