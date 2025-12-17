import type { AllContractDetailsItem } from "@/repositories/businessSupabase";
import { createCache } from "./unifiedCacheManager";

// 动态导入Supabase函数，保持与API层的一致性
async function getSupabaseFunctions() {
  return await import("@/repositories/businessSupabase");
}

class ContractDetailsCache {
  // 启用持久化
  private cache = createCache<AllContractDetailsItem[]>(
    "contract",
    "DETAIL_DATA",
    {
      enablePersistence: true,
      ttl: 15 * 60 * 1000 // 15分钟
    }
  );

  set<T>(key: string, data: T): void {
    // 强制类型转换，虽然我们定义的是 AllContractDetailsItem[]
    this.cache.set(data as any, { key });
  }

  get<T>(key: string): T | null {
    return this.cache.get({ key }) as any;
  }

  async getAsync<T>(key: string): Promise<T | null> {
    return (await this.cache.getAsync({ key })) as any;
  }

  clear(): void {
    this.cache.clear();
  }

  // 获取缓存统计信息 (保持兼容性)
  getStats() {
    const stats = this.cache.getStats();
    return {
      size: stats.totalEntries,
      maxSize: 1000,
      keys: this.cache.getKeys(),
      ...stats
    };
  }
}

// 全局缓存实例
const contractDetailsCache = new ContractDetailsCache();

// 合同明细数据缓存键
const CONTRACT_DETAILS_CACHE_KEY = "all_contract_details";

/**
 * 带缓存的获取所有合同明细数据
 * 30分钟内重复调用会直接返回缓存数据
 */
export const getCachedAllContractDetails = async (
  forceRefresh: boolean = false
): Promise<{
  success: boolean;
  data?: AllContractDetailsItem[];
  message?: string;
  fromCache?: boolean;
}> => {
  try {
    // 如果强制刷新，清空缓存
    if (forceRefresh) {
      contractDetailsCache.clear();
      console.log("[合同明细缓存] 强制刷新，清空所有缓存");
    }

    // 尝试从缓存获取数据 (支持持久化)
    if (!forceRefresh) {
      const cachedData = await contractDetailsCache.getAsync<
        AllContractDetailsItem[]
      >(CONTRACT_DETAILS_CACHE_KEY);
      if (cachedData) {
        console.log(
          `[合同明细缓存] 从缓存获取数据，条目数: ${cachedData.length}`
        );
        return {
          success: true,
          data: cachedData,
          fromCache: true
        };
      }
    }

    console.log("[合同明细缓存] 缓存未命中或已过期，从数据库获取数据...");

    // 缓存未命中，从数据库获取数据
    const { getAllContractDetailsSupabase } = await getSupabaseFunctions();
    const result = await getAllContractDetailsSupabase();

    if (result.success && result.data) {
      // 将数据存入缓存
      contractDetailsCache.set(CONTRACT_DETAILS_CACHE_KEY, result.data);
      console.log(`[合同明细缓存] 数据已缓存，条目数: ${result.data.length}`);

      return {
        success: true,
        data: result.data,
        fromCache: false
      };
    } else {
      return {
        success: false,
        message: result.message || "获取合同明细数据失败"
      };
    }
  } catch (error) {
    console.error("[合同明细缓存] 获取数据时发生错误:", error);
    return {
      success: false,
      message: `获取失败: ${error instanceof Error ? error.message : "未知错误"}`
    };
  }
};

/**
 * 预热缓存：在应用启动时预先加载合同明细数据
 */
export const preloadContractDetailsCache = async (): Promise<void> => {
  try {
    console.log("[合同明细缓存] 开始预热缓存...");
    await getCachedAllContractDetails();
    console.log("[合同明细缓存] 预热缓存完成");
  } catch (error) {
    console.warn("[合同明细缓存] 预热缓存失败:", error);
  }
};

/**
 * 清除合同明细缓存
 */
export const clearContractDetailsCache = (): void => {
  contractDetailsCache.clear();
  console.log("[合同明细缓存] 缓存已清除");
};

/**
 * 获取缓存统计信息
 */
export const getContractDetailsCacheStats = () => {
  return contractDetailsCache.getStats();
};

/**
 * 内存优化：在内存不足时主动清理缓存
 */
export const optimizeMemoryUsage = (): void => {
  const stats = contractDetailsCache.getStats();

  // 如果缓存超过一定大小，主动清理
  if (stats.size > 30) {
    console.log("[内存优化] 检测到大缓存，主动清理合同明细缓存");
    contractDetailsCache.clear();
  }
};

// 监听页面卸载事件，清理缓存
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    clearContractDetailsCache();
  });
}
