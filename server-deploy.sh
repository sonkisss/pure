#!/bin/bash

# 阿里云服务器部署脚本
set -e

echo "🚀 开始在阿里云服务器上部署应用..."

# 创建项目目录
mkdir -p /opt/www/pure-admin-thin
cd /opt/www/pure-admin-thin

# 创建生产环境配置文件（请提前通过安全渠道配置环境变量）
cat > .env.production << 'EOF'
# 线上环境平台打包路径
VITE_PUBLIC_PATH = /

# 线上环境路由历史模式（Hash模式传"hash"、HTML5模式传"h5"）
VITE_ROUTER_HISTORY = "hash"

# 是否在打包时使用cdn替换本地库
VITE_CDN = false

# 是否启用压缩
VITE_COMPRESSION = "none"

# Supabase 配置（请替换为自己的，避免硬编码密钥）
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_or_publishable_key
# 仅在服务器侧需要时才填，前端不要暴露 service_role
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_if_needed

# Alibaba Cloud OSS Configuration（使用占位符，务必改成自己的密钥）
VITE_OSS_REGION=oss-cn-your-region
VITE_OSS_ACCESS_KEY_ID=your_oss_access_key_id
VITE_OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
VITE_OSS_BUCKET=your-bucket-name

# 服务器配置
VITE_PORT=8848
EOF

echo "✅ 生产环境配置文件已创建"

# 检查是否已安装 Node.js
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# 检查是否已安装 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 安装 pnpm..."
    npm install -g pnpm
fi

echo "📁 准备同步代码..."
# 这里你需要将本地的代码上传到服务器
# 可以使用 scp 或 git clone 等方式

echo "🔨 开始构建应用..."
# cp .env.production .env
# pnpm install
# pnpm build

echo "📦 创建 Docker 镜像..."
# 检查是否已安装 Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# 创建 Dockerfile（如果不存在）
if [ ! -f "Dockerfile" ]; then
    cat > Dockerfile << 'EOF'
FROM node:20-alpine as build-stage

WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

RUN npm config set registry https://registry.npmmirror.com

COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF
    echo "✅ Dockerfile 已创建"
fi

# 创建 nginx 配置
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # CORS 配置
        location /api/ {
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*';
                add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
                add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain; charset=utf-8';
                add_header 'Content-Length' 0;
                return 204;
            }

            proxy_pass http://localhost:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        }
    }
}
EOF
    echo "✅ Nginx 配置已创建"

# 创建 docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3'
services:
  pure-admin-thin:
    build: .
    container_name: pure-admin-thin
    ports:
      - "8848:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
EOF
    echo "✅ Docker Compose 配置已创建"

echo "📋 部署脚本准备完成！"
echo ""
echo "请按照以下步骤完成部署："
echo "1. 将本地代码上传到服务器 /opt/www/pure-admin-thin 目录"
echo "2. 运行: cd /opt/www/pure-admin-thin"
echo "3. 运行: pnpm install"
echo "4. 运行: pnpm build"
echo "5. 运行: docker-compose up -d"
echo ""
echo "部署完成后，应用将在 http://8.140.31.58:8848 访问"
