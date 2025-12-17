<template>
  <el-table :data="skeletonData" border stripe>
    <!-- 选择列 -->
    <el-table-column width="55" align="center">
      <template #default>
        <el-skeleton-item variant="circle" style="width: 16px; height: 16px" />
      </template>
    </el-table-column>

    <!-- ID列 -->
    <el-table-column width="80" align="center">
      <template #default>
        <el-skeleton-item variant="text" style="width: 40px" />
      </template>
    </el-table-column>

    <!-- 产品名称列 -->
    <el-table-column min-width="150">
      <template #default>
        <el-skeleton-item variant="text" style="width: 80%" />
      </template>
    </el-table-column>

    <!-- 规格型号列 -->
    <el-table-column min-width="120">
      <template #default>
        <el-skeleton-item variant="text" style="width: 70%" />
      </template>
    </el-table-column>

    <!-- 单位列 -->
    <el-table-column width="80" align="center">
      <template #default>
        <el-skeleton-item variant="text" style="width: 30px" />
      </template>
    </el-table-column>

    <!-- 进价列 -->
    <el-table-column width="120" align="right">
      <template #default>
        <el-skeleton-item variant="text" style="width: 60px" />
      </template>
    </el-table-column>

    <!-- 供应商列 -->
    <el-table-column min-width="150">
      <template #default>
        <el-skeleton-item variant="text" style="width: 75%" />
      </template>
    </el-table-column>

    <!-- 含税类型列 -->
    <el-table-column width="110" align="center">
      <template #default>
        <el-skeleton-item variant="rect" style="width: 60px; height: 24px" />
      </template>
    </el-table-column>

    <!-- 备注列 -->
    <el-table-column min-width="200">
      <template #default>
        <el-skeleton-item variant="text" style="width: 90%" />
      </template>
    </el-table-column>

    <!-- 操作列 -->
    <el-table-column width="100" align="center" fixed="right">
      <template #default>
        <el-skeleton-item variant="rect" style="width: 50px; height: 28px" />
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
defineOptions({
  name: "TableSkeleton"
});

// 生成骨架屏数据
const skeletonData = Array.from({ length: 10 }, (_, index) => ({
  id: index,
  key: `skeleton-${index}`
}));
</script>

<style scoped>
@keyframes loading {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

:deep(.el-skeleton__item) {
  background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

/* 保持表格布局稳定 */
:deep(.el-table__body-wrapper) {
  min-height: 600px;
}

/* 确保骨架屏加载时表格边框显示正常 */
:deep(.el-table) {
  --el-table-border-color: #ebeef5;
}

/* 骨架屏动画效果 */
</style>
