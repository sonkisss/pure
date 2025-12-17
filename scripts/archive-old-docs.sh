#!/bin/bash

# 归档旧的.md文件到 docs/archive/ 目录
# 使用方法: ./scripts/archive-old-docs.sh

# 需要归档的文件列表
OLD_DOCS=(
  "首页功能迁移说明.md"
  "供应商付款功能优化说明.md"
  "产品Excel导入验证规则说明.md"
  "欠款添加时间功能说明.md"
  "供应商欠款FormData问题修复说明.md"
  "解决文件监视限制问题.md"
  "产品列表备注链接功能说明.md"
  "产品备注链接-测试示例.md"
  "仪表盘路由调整说明.md"
  "供应商欠款与付款分离业务逻辑说明.md"
  "客户付款记录功能说明.md"
  "Excel上传功能修复说明.md"
  "清除权限管理缓存步骤.md"
  "Excel上传对话框简化说明.md"
  "欠款金额校验-快速测试指南.md"
  "添加欠款时上传Excel功能说明.md"
  "供应商应付款快速修改功能说明.md"
  "欠款明细优化-更新摘要.md"
  "供应商欠款金额校验功能说明.md"
  "Excel上传UI优化说明.md"
  "图片上传显示问题修复说明.md"
  "供应商详情页标题优化.md"
  "供应商欠款添加调试指南.md"
  "仪表盘功能说明.md"
  "添加欠款同时上传Excel和图片修复说明.md"
  "清理无用模块说明.md"
  "供应商Excel产品明细功能说明.md"
  "客户管理-更新说明.md"
  "时间显示格式优化说明.md"
  "供应商欠款明细优化功能说明.md"
  "产品模块-快速开始.md"
  "欠款明细图片预览功能说明.md"
  "Bug修复-欠款明细功能.md"
  "欠款添加时间-快速测试.md"
  "供应商欠款优化-快速测试指南.md"
  "供应商详情页表单响应性Bug修复说明.md"
  "客户欠款快速修改功能说明.md"
  "客户欠款统计功能说明.md"
)

echo ""
echo "=========================================="
echo "📦 归档旧文档"
echo "=========================================="
echo ""
echo "将38个旧的.md文件移动到 docs/archive/"
echo ""
read -p "请选择操作 [1=归档, 2=删除, 0=取消]: " choice

case $choice in
  1)
    echo ""
    echo "开始归档..."
    
    # 创建归档目录
    mkdir -p docs/archive
    
    # 移动文件
    moved_count=0
    for file in "${OLD_DOCS[@]}"; do
      if [ -f "$file" ]; then
        mv "$file" "docs/archive/"
        echo "  ✓ 已归档: $file"
        ((moved_count++))
      fi
    done
    
    echo ""
    echo "=========================================="
    echo "✅ 归档完成"
    echo "=========================================="
    echo ""
    echo "共归档了 $moved_count 个文件到 docs/archive/"
    echo ""
    echo "这些文件已被移动到归档目录，但未删除。"
    echo "如需删除，可手动删除 docs/archive/ 目录。"
    echo ""
    ;;
    
  2)
    echo ""
    echo "⚠️  警告：此操作将永久删除38个旧的.md文件！"
    echo ""
    read -p "确认删除？[y/N]: " confirm
    
    if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
      echo ""
      echo "开始删除..."
      
      deleted_count=0
      for file in "${OLD_DOCS[@]}"; do
        if [ -f "$file" ]; then
          rm "$file"
          echo "  ✓ 已删除: $file"
          ((deleted_count++))
        fi
      done
      
      echo ""
      echo "=========================================="
      echo "✅ 删除完成"
      echo "=========================================="
      echo ""
      echo "共删除了 $deleted_count 个文件"
      echo ""
      echo "所有内容已整合到 CHANGELOG.md"
      echo ""
    else
      echo ""
      echo "❌ 操作已取消"
      echo ""
    fi
    ;;
    
  0)
    echo ""
    echo "❌ 操作已取消"
    echo ""
    ;;
    
  *)
    echo ""
    echo "❌ 无效的选项"
    echo ""
    ;;
esac


