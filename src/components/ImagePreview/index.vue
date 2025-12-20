<template>
  <el-image-viewer
    v-if="visible"
    :url-list="images"
    :initial-index="currentIndex"
    :zoom-rate="1.2"
    :infinite="true"
    :hide-on-click-modal="true"
    @close="handleClose"
    @switch="handleSwitch"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

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

// 方法
const handleClose = () => {
  emit("update:modelValue", false);
  emit("close");
};

const handleSwitch = (newIndex: number) => {
  currentIndex.value = newIndex;
};

// 监听器
watch(
  () => props.modelValue,
  newVal => {
    if (newVal) {
      currentIndex.value = props.initialIndex;
    }
  }
);

watch(
  () => props.initialIndex,
  newIndex => {
    currentIndex.value = newIndex;
  }
);
</script>
