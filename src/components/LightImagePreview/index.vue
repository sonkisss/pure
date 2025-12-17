<template>
  <div
    v-if="modelValue"
    class="light-image-preview-overlay"
    @click="handleClose"
  >
    <div class="light-preview-container" @click.stop>
      <!-- 关闭按钮 -->
      <button class="close-btn" title="关闭 (ESC)" @click="handleClose">
        <el-icon><Close /></el-icon>
      </button>

      <!-- 图片内容 -->
      <div class="image-content">
        <img
          v-if="currentImage"
          :src="currentImage"
          :alt="`图片 ${currentIndex + 1}`"
          class="preview-image"
          @load="handleImageLoad"
          @error="handleImageError"
        />

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <el-icon class="loading-icon" :size="32">
            <Loading />
          </el-icon>
          <p>加载中...</p>
        </div>

        <!-- 错误状态 -->
        <div v-if="error" class="error-state">
          <el-icon :size="32" color="#f56c6c">
            <Picture />
          </el-icon>
          <p>图片加载失败</p>
        </div>
      </div>

      <!-- 导航控制 (多图时显示) -->
      <div v-if="images.length > 1" class="navigation-controls">
        <button
          class="nav-btn prev-btn"
          :disabled="currentIndex === 0"
          title="上一张 (←)"
          @click="prevImage"
        >
          <el-icon><ArrowLeft /></el-icon>
        </button>

        <div class="image-counter">
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>

        <button
          class="nav-btn next-btn"
          :disabled="currentIndex === images.length - 1"
          title="下一张 (→)"
          @click="nextImage"
        >
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>

      <!-- 缩略图 (多图时显示) -->
      <div v-if="images.length > 1" class="thumbnail-strip">
        <button
          v-for="(img, index) in images"
          :key="index"
          class="thumbnail-item"
          :class="{ active: index === currentIndex }"
          :title="`图片 ${index + 1}`"
          @click="goToImage(index)"
        >
          <img :src="img" :alt="`缩略图 ${index + 1}`" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import {
  Close,
  ArrowLeft,
  ArrowRight,
  Loading,
  Picture
} from "@element-plus/icons-vue";

interface Props {
  modelValue: boolean;
  images: string[];
  initialIndex?: number;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0
});

const emit = defineEmits<Emits>();

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value)
});

const currentIndex = ref(props.initialIndex);
const loading = ref(true);
const error = ref(false);

// 计算属性
const currentImage = computed(() => {
  return props.images[currentIndex.value] || "";
});

// 方法
const handleClose = () => {
  visible.value = false;
};

const prevImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    resetLoadingState();
  }
};

const nextImage = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++;
    resetLoadingState();
  }
};

const goToImage = (index: number) => {
  if (
    index !== currentIndex.value &&
    index >= 0 &&
    index < props.images.length
  ) {
    currentIndex.value = index;
    resetLoadingState();
  }
};

const resetLoadingState = () => {
  loading.value = true;
  error.value = false;
};

const handleImageLoad = () => {
  loading.value = false;
  error.value = false;
};

const handleImageError = () => {
  loading.value = false;
  error.value = true;
};

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case "Escape":
      handleClose();
      break;
    case "ArrowLeft":
      prevImage();
      break;
    case "ArrowRight":
      nextImage();
      break;
  }
};

// 监听器
watch(
  () => props.modelValue,
  newVal => {
    if (newVal) {
      currentIndex.value = props.initialIndex;
      resetLoadingState();
      document.addEventListener("keydown", handleKeydown);
      // 防止body滚动
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleKeydown);
      // 恢复body滚动
      document.body.style.overflow = "";
    }
  }
);

watch(
  () => props.initialIndex,
  newIndex => {
    if (newIndex !== undefined) {
      currentIndex.value = newIndex;
      resetLoadingState();
    }
  }
);

// 生命周期
onMounted(() => {
  if (props.modelValue) {
    document.addEventListener("keydown", handleKeydown);
    document.body.style.overflow = "hidden";
  }
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = "";
});
</script>

<style scoped lang="scss">
@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

// 响应式设计
@media (width <= 768px) {
  .light-image-preview-overlay {
    padding: 10px;
  }

  .light-preview-container {
    max-width: 95vw;
    max-height: 90vh;
  }

  .navigation-controls {
    bottom: 100px;
    padding: 0 15px;
  }

  .nav-btn {
    width: 36px;
    height: 36px;
  }

  .image-counter {
    padding: 6px 12px;
    font-size: 12px;
  }

  .thumbnail-strip {
    gap: 6px;
    padding: 10px;
  }

  .thumbnail-item {
    width: 50px;
    height: 50px;
  }
}

@media (width <= 480px) {
  .light-preview-container {
    max-width: 98vw;
    max-height: 95vh;
  }

  .navigation-controls {
    bottom: 120px;
  }

  .thumbnail-strip {
    padding: 8px;
  }

  .thumbnail-item {
    width: 40px;
    height: 40px;
  }
}

.light-image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgb(0 0 0 / 85%);
  backdrop-filter: blur(2px);
}

.light-preview-container {
  position: relative;
  max-width: 90vw;
  max-height: 85vh;
  overflow: hidden;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgb(0 0 0 / 30%);
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: white;
  cursor: pointer;
  background: rgb(0 0 0 / 60%);
  border: none;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: rgb(0 0 0 / 80%);
    transform: scale(1.1);
  }
}

.image-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 300px;
  min-height: 200px;
  background: #f8f9fa;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #666;
  text-align: center;

  .loading-icon {
    animation: spin 1s linear infinite;
  }
}

.navigation-controls {
  position: absolute;
  right: 0;
  bottom: 80px;
  left: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: white;
  cursor: pointer;
  background: rgb(0 0 0 / 70%);
  border: none;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgb(0 0 0 / 90%);
    transform: scale(1.1);
  }

  &:disabled {
    color: rgb(255 255 255 / 50%);
    cursor: not-allowed;
    background: rgb(0 0 0 / 30%);
    transform: none !important;
  }
}

.image-counter {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  user-select: none;
  background: rgb(0 0 0 / 70%);
  border-radius: 20px;
}

.thumbnail-strip {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  display: flex;
  gap: 8px;
  padding: 12px;
  overflow-x: auto;
  scrollbar-width: thin;
  background: rgb(255 255 255 / 95%);
  backdrop-filter: blur(10px);

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgb(0 0 0 / 10%);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgb(0 0 0 / 30%);
    border-radius: 3px;
  }
}

.thumbnail-item {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  overflow: hidden;
  cursor: pointer;
  background: white;
  border: 2px solid transparent;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #409eff;
    transform: scale(1.05);
  }

  &.active {
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgb(64 158 255 / 30%);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
