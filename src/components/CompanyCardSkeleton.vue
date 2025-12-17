<template>
  <div class="skeleton-card">
    <div class="skeleton-header">
      <el-skeleton-item variant="circle" style="width: 56px; height: 56px" />
      <el-skeleton-item variant="rect" style="width: 60px; height: 24px" />
    </div>

    <div class="skeleton-content">
      <el-skeleton-item variant="h3" style="width: 70%; margin-bottom: 16px" />
      <div class="skeleton-info">
        <el-skeleton-item
          variant="text"
          style="width: 100%; margin-bottom: 12px"
        />
        <el-skeleton-item
          variant="text"
          style="width: 85%; margin-bottom: 12px"
        />
        <el-skeleton-item variant="text" style="width: 75%" />
      </div>
    </div>

    <div class="skeleton-footer">
      <el-skeleton-item variant="text" style="width: 80px" />
      <el-skeleton-item variant="rect" style="width: 80px; height: 32px" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "CompanyCardSkeleton"
});
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

.skeleton-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
}

.skeleton-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.skeleton-content {
  flex: 1;
  margin-bottom: 1.5rem;
}

.skeleton-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

/* 骨架屏动画效果 */
:deep(.el-skeleton__item) {
  background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}
</style>
