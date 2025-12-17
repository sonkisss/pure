<script setup lang="ts">
import { isEqual } from "@pureadmin/utils";
import { useRoute, useRouter } from "vue-router";
import { ref, watch, onMounted, toRaw } from "vue";
import {
  getParentPaths,
  findRouteByPath,
  findRouteByPathMatch
} from "@/router/utils";
import { useMultiTagsStoreHook } from "@/store/modules/multiTags";

// 动态获取所有路由模块
const modules = import.meta.glob("@/router/modules/*.ts", { eager: true });

// 重新构建原始路由树
const buildOriginalRoutes = () => {
  const routes = [];
  Object.keys(modules).forEach(key => {
    routes.push((modules[key] as any).default);
  });
  return routes;
};

const route = useRoute();
const levelList = ref([]);
const router = useRouter();
const routes: any = buildOriginalRoutes();
const multiTags: any = useMultiTagsStoreHook().multiTags;

const getBreadcrumb = (): void => {
  // 当前路由信息
  let currentRoute;

  if (Object.keys(route.query).length > 0) {
    multiTags.forEach(item => {
      if (isEqual(route.query, item?.query)) {
        currentRoute = toRaw(item);
      }
    });
    // 如果在multiTags中找不到，回退到使用findRouteByPath
    if (!currentRoute) {
      currentRoute = findRouteByPath(router.currentRoute.value.path, routes);
      // 如果还是找不到，尝试使用参数化路由匹配
      if (!currentRoute) {
        currentRoute = findRouteByPathMatch(
          router.currentRoute.value.path,
          routes
        );
      }
    }
  } else if (Object.keys(route.params).length > 0) {
    multiTags.forEach(item => {
      if (isEqual(route.params, item?.params)) {
        currentRoute = toRaw(item);
      }
    });
    // 如果在multiTags中找不到，回退到使用findRouteByPath
    if (!currentRoute) {
      currentRoute = findRouteByPath(router.currentRoute.value.path, routes);
      // 如果还是找不到，尝试使用参数化路由匹配
      if (!currentRoute) {
        currentRoute = findRouteByPathMatch(
          router.currentRoute.value.path,
          routes
        );
      }
    }
  } else {
    currentRoute = findRouteByPath(router.currentRoute.value.path, routes);
  }

  // 当前路由的父级路径组成的数组
  const parentRoutes = getParentPaths(
    router.currentRoute.value.name as string,
    routes,
    "name"
  );
  // 存放组成面包屑的数组
  const matched = [];

  // 获取每个父级路径对应的路由信息
  parentRoutes.forEach(path => {
    const parentRoute = findRouteByPath(path, routes);
    if (path !== "/" && parentRoute) matched.push(parentRoute);
  });

  matched.push(currentRoute);

  matched.forEach((item, index) => {
    if (item?.children) {
      item.children.forEach(v => {
        // 只有当子路由不是隐藏路由时，才移除重复标题的父路由
        if (v?.meta?.title === item?.meta?.title && !v?.meta?.hidden) {
          matched.splice(index, 1);
        }
      });
    }
  });

  levelList.value = matched.filter(
    item => item?.meta && item?.meta.title !== false
  );
};

const handleLink = item => {
  const { redirect, name, path } = item;
  if (redirect) {
    router.push(redirect as any);
  } else {
    if (name) {
      // 对于详情页面路由，导航到对应的列表页面而不是参数化路由
      if (name === "ContractDetail") {
        router.push({ name: "ContractList" });
      } else if (name === "InquiryDetail") {
        router.push({ name: "InquiryList" });
      } else if (name === "CustomerDetail") {
        router.push({ name: "CustomerManagement" });
      } else if (item.query) {
        router.push({
          name,
          query: item.query
        });
      } else if (item.params) {
        router.push({
          name,
          params: item.params
        });
      } else {
        router.push({ name });
      }
    } else {
      router.push({ path });
    }
  }
};

onMounted(() => {
  getBreadcrumb();
});

watch(
  () => route.path,
  () => {
    getBreadcrumb();
  },
  {
    deep: true
  }
);
</script>

<template>
  <el-breadcrumb class="leading-[50px]! select-none" separator="/">
    <transition-group name="breadcrumb">
      <el-breadcrumb-item
        v-for="item in levelList"
        :key="item.path"
        class="inline! items-stretch!"
      >
        <a @click.prevent="handleLink(item)">
          {{ item.meta.title }}
        </a>
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>
