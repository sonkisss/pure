<template>
  <div>
    <!-- 重定向到公司选择页面 -->
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(() => {
  // 立即重定向到公司选择页面
  router.replace("/business/companies");
});
</script>
