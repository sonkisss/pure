<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="dialogWidth"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    class="image-preview-dialog"
    :show-close="false"
    :align-center="true"
    :modal-class="'image-preview-modal'"
    @closed="handleClose"
  >
    <div class="simple-image-preview">
      <!-- 图片显示区域 -->
      <div ref="imageContainerRef" class="image-container">
        <img
          ref="imageRef"
          :src="currentImage"
          class="preview-image"
          :style="{ visibility: loaded ? 'visible' : 'hidden' }"
          @load="handleImageLoad"
          @error="handleImageError"
        />

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-overlay">
          <el-icon class="is-loading" :size="40">
            <Loading />
          </el-icon>
          <p class="mt-2">加载中...</p>
        </div>

        <!-- 错误状态 -->
        <div v-if="error" class="error-overlay">
          <el-icon :size="40" color="#f56c6c">
            <Picture />
          </el-icon>
          <p class="mt-2">图片加载失败</p>
        </div>

        <!-- 图片导航 (多图片时显示) -->
        <div v-if="images.length > 1" class="image-navigation">
          <el-button
            :icon="ArrowLeft"
            :disabled="currentIndex === 0"
            circle
            class="nav-button nav-prev"
            @click="prevImage"
          />
          <div class="image-info">
            {{ currentIndex + 1 }} / {{ images.length }}
          </div>
          <el-button
            :icon="ArrowRight"
            :disabled="currentIndex === images.length - 1"
            circle
            class="nav-button nav-next"
            @click="nextImage"
          />
        </div>

        <!-- 关闭按钮 -->
        <el-button
          class="close-button"
          :icon="Close"
          circle
          @click="visible = false"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import {
  ArrowLeft,
  ArrowRight,
  Loading,
  Picture,
  Close
} from "@element-plus/icons-vue";

interface Props {
  modelValue: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "close"): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0,
  title: "图片查看"
});

const emit = defineEmits<Emits>();

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value)
});

const currentIndex = ref(props.initialIndex);
const loading = ref(false);
const error = ref(false);
const loaded = ref(false);
const imageDimensions = ref({ width: 0, height: 0 });

// DOM 引用
const imageRef = ref<HTMLImageElement>();
const imageContainerRef = ref<HTMLElement>();

// 计算对话框宽度
const dialogWidth = computed(() => {
  // 固定使用90vw的宽度，让图片在容器内自适应
  return "90vw";
});

// 计算属性
const currentImage = computed(() => {
  return props.images[currentIndex.value] || "";
});

// 方法
const handleClose = () => {
  emit("close");
};

const prevImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    loading.value = true;
    error.value = false;
    loaded.value = false;
    imageDimensions.value = { width: 0, height: 0 };
  }
};

const nextImage = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++;
    loading.value = true;
    error.value = false;
    loaded.value = false;
    imageDimensions.value = { width: 0, height: 0 };
  }
};

const handleImageLoad = () => {
  loading.value = false;
  error.value = false;
  loaded.value = true;

  // 获取图片的实际显示尺寸
  if (imageRef.value) {
    // 等待下一帧确保图片完全渲染
    nextTick(() => {
      if (imageRef.value) {
        imageDimensions.value = {
          width: imageRef.value.naturalWidth,
          height: imageRef.value.naturalHeight
        };
      }
    });
  }
};

const handleImageError = () => {
  loading.value = false;
  error.value = true;
  loaded.value = false;
};

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case "Escape":
      visible.value = false;
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
      loading.value = true;
      error.value = false;
      loaded.value = false;
      imageDimensions.value = { width: 0, height: 0 };
      document.addEventListener("keydown", handleKeydown);
    } else {
      document.removeEventListener("keydown", handleKeydown);
    }
  }
);

watch(
  () => props.initialIndex,
  newIndex => {
    currentIndex.value = newIndex;
    loading.value = true;
    error.value = false;
    loaded.value = false;
    imageDimensions.value = { width: 0, height: 0 };
  }
);
</script>

<style scoped lang="scss">
// 响应式设计
@media (width <= 768px) {
  .image-preview-dialog {
    :deep(.el-dialog) {
      width: 98vw !important;
      max-width: 98vw;
      margin: 0;
    }
  }

  .preview-image {
    max-width: 95vw;
    max-height: 85vh;
  }

  .image-container {
    padding: 15px;
  }

  .image-navigation {
    padding: 0 5px;

    .nav-button {
      width: 32px;
      height: 32px;
    }

    .image-info {
      padding: 4px 8px;
      font-size: 11px;
    }
  }

  .close-button {
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
  }
}

.image-preview-dialog {
  :deep(.el-dialog) {
    margin: 0 auto;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgb(0 0 0 / 15%);
  }

  :deep(.el-dialog__header) {
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
  }

  :deep(.el-dialog__body) {
    padding: 0;
    background: #f8f9fa;
  }

  :deep(.el-dialog__headerbtn) {
    display: none;
  }
}

.simple-image-preview {
  display: inline-block;
  min-width: 200px;
  background: #f8f9fa;
}

.image-container {
  position: relative;
  display: inline-block;
  min-width: 100px;

  // 容器大小根据图片内容自适应
  min-height: 100px;
  padding: 20px;
  text-align: center;
}

.preview-image {
  display: block;
  width: auto;
  max-width: 90vw;
  height: auto;
  max-height: 80vh;

  // 保持图片比例，适应视窗大小
  object-fit: contain;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.loading-overlay,
.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 200px;
  min-height: 150px;
  font-size: 14px;
  color: #666;
  background: rgb(255 255 255 / 90%);
}

.image-navigation {
  position: absolute;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 10px;
  pointer-events: none;
  transform: translateY(-50%);

  .nav-button {
    width: 36px;
    height: 36px;
    color: white;
    pointer-events: auto;
    background: rgb(0 0 0 / 60%);
    border: none;

    &:hover {
      background: rgb(0 0 0 / 80%);
    }

    &.is-disabled {
      color: rgb(255 255 255 / 50%);
      background: rgb(0 0 0 / 30%);
    }
  }

  .image-info {
    position: absolute;
    top: 10px;
    left: 50%;
    padding: 6px 12px;
    font-size: 12px;
    color: white;
    white-space: nowrap;
    pointer-events: auto;
    background: rgb(0 0 0 / 70%);
    border-radius: 16px;
    transform: translateX(-50%);
  }
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  width: 32px;
  height: 32px;
  color: white;
  background: rgb(0 0 0 / 60%);
  border: none;

  &:hover {
    background: rgb(0 0 0 / 80%);
  }
}

// 模态层样式
:global(.image-preview-modal) {
  background: rgb(0 0 0 / 80%);
}

// 对于小图片的最小尺寸保证
.preview-image[style*="visibility: hidden"] {
  min-width: 100px;
  min-height: 100px;
  background: #f0f0f0;
  border: 1px dashed #ddd;
}

// 加载状态的占位尺寸
.loading-overlay {
  &::before {
    display: block;
    width: 100px;
    height: 100px;
    margin-bottom: 10px;
    content: "";
    background: #f0f0f0;
    border: 1px dashed #ddd;
    border-radius: 4px;
  }
}
</style>
