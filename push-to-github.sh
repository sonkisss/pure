#!/bin/bash

# 推送代码到 GitHub 的脚本
# 使用方法：./push-to-github.sh

cd "$(dirname "$0")"

echo "=========================================="
echo "推送代码到 GitHub 仓库"
echo "仓库地址: https://github.com/sonkisss/pure.git"
echo "=========================================="
echo ""

# 检查是否已配置远程仓库
if ! git remote get-url my-repo > /dev/null 2>&1; then
    echo "配置远程仓库..."
    git remote add my-repo https://github.com/sonkisss/pure.git
fi

echo "请选择认证方式："
echo "1. 使用 Personal Access Token (推荐)"
echo "2. 使用 SSH 密钥"
echo ""
read -p "请选择 (1 或 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "请按照以下步骤获取 Token："
    echo "1. 访问: https://github.com/settings/tokens"
    echo "2. 点击 'Generate new token' -> 'Generate new token (classic)'"
    echo "3. 勾选 'repo' 权限"
    echo "4. 生成并复制 token"
    echo ""
    read -p "请输入您的 GitHub Token: " token
    
    if [ -z "$token" ]; then
        echo "错误: Token 不能为空"
        exit 1
    fi
    
    # 使用 token 配置远程仓库
    git remote set-url my-repo https://${token}@github.com/sonkisss/pure.git
    
    echo ""
    echo "正在推送代码..."
    git push -u my-repo main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 代码推送成功！"
        echo "查看仓库: https://github.com/sonkisss/pure"
    else
        echo ""
        echo "❌ 推送失败，请检查："
        echo "1. Token 是否正确"
        echo "2. Token 是否有 'repo' 权限"
        echo "3. 网络连接是否正常"
    fi
    
elif [ "$choice" = "2" ]; then
    echo ""
    echo "请确保您已经："
    echo "1. 将 SSH 公钥添加到 GitHub"
    echo "   访问: https://github.com/settings/keys"
    echo "2. 添加以下公钥："
    echo ""
    if [ -f ~/.ssh/id_ed25519.pub ]; then
        cat ~/.ssh/id_ed25519.pub
    else
        echo "未找到 SSH 公钥，请先运行: ssh-keygen -t ed25519 -C 'your_email@example.com'"
        exit 1
    fi
    echo ""
    read -p "已添加 SSH 密钥？(y/n): " confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "请先添加 SSH 密钥后再运行此脚本"
        exit 1
    fi
    
    # 使用 SSH 配置远程仓库
    git remote set-url my-repo git@github.com:sonkisss/pure.git
    
    echo ""
    echo "正在推送代码..."
    git push -u my-repo main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 代码推送成功！"
        echo "查看仓库: https://github.com/sonkisss/pure"
    else
        echo ""
        echo "❌ 推送失败，请检查："
        echo "1. SSH 密钥是否正确添加到 GitHub"
        echo "2. SSH 连接是否正常"
    fi
else
    echo "无效的选择"
    exit 1
fi

