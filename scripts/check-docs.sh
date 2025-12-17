#!/bin/bash

# 检查是否有违反文档规则的新.md文件
# 使用方法: ./scripts/check-docs.sh

# 允许的文档列表（白名单）
ALLOWED_DOCS=(
  "README.md"
  "README.en-US.md"
  "CHANGELOG.md"
  "开发必读.md"
  ".project-rules.md"
  "项目说明.md"
  "快速开始.md"
  "供应商管理模块说明.md"
  "客户管理模块说明.md"
  "产品管理模块说明.md"
  "双击快速修改功能汇总.md"
  "完成清单.md"
  "文档整理说明.md"
)

echo ""
echo "=========================================="
echo "🔍 检查文档规则"
echo "=========================================="
echo ""

# 获取所有.md文件
MD_FILES=$(find . -maxdepth 1 -name "*.md" -type f | sed 's|^\./||')

VIOLATION_FOUND=false

# 检查每个.md文件
for file in $MD_FILES; do
  # 检查是否在白名单中
  if [[ ! " ${ALLOWED_DOCS[@]} " =~ " ${file} " ]]; then
    if [ "$VIOLATION_FOUND" = false ]; then
      echo "❌ 发现违规的.md文件："
      echo ""
      VIOLATION_FOUND=true
    fi
    echo "  • $file"
  fi
done

if [ "$VIOLATION_FOUND" = true ]; then
  echo ""
  echo "=========================================="
  echo "⚠️  违规提醒"
  echo "=========================================="
  echo ""
  echo "请将以上文件的内容迁移到 CHANGELOG.md"
  echo "然后删除这些独立文件。"
  echo ""
  echo "详见: .project-rules.md"
  echo ""
  exit 1
else
  echo "✅ 所有文档符合规则"
  echo ""
  exit 0
fi

