import type { AllInquiryDetailsItem } from "@/repositories/inquirySupabase";
import { createCache } from "./unifiedCacheManager";

// 动态导入Supabase函数，保持与API层的一致性
async function getSupabaseFunctions() {
  return await import("@/repositories/inquirySupabase");
}

class InquiryDetailsCache {
  private cache = createCache<AllInquiryDetailsItem[]>(
    "inquiry",
    "DETAIL_DATA",
    {
      enablePersistence: true // 启用持久化
    }
  );

  private generateCacheKey(): string {
    return "all_inquiry_details";
  }

  set(data: AllInquiryDetailsItem[]): void {
    // 修复参数顺序: data, params
    this.cache.set(data, {});
  }

  get(): AllInquiryDetailsItem[] | null {
    return this.cache.get({});
  }

  async getAsync(): Promise<AllInquiryDetailsItem[] | null> {
    return this.cache.getAsync({});
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }
}

// 全局缓存实例
const inquiryDetailsCache = new InquiryDetailsCache();

/**
 * 带缓存的获取所有询价明细数据
 * 15分钟内重复调用会直接返回缓存数据
 */
export const getCachedAllInquiryDetails = async (
  forceRefresh: boolean = false
): Promise<{
  success: boolean;
  data?: AllInquiryDetailsItem[];
  message?: string;
  fromCache?: boolean;
}> => {
  try {
    // 如果强制刷新，清空缓存
    if (forceRefresh) {
      inquiryDetailsCache.clear();
      console.log("[询价明细缓存] 强制刷新，清空所有缓存");
    }

    // 尝试从缓存获取数据 (支持持久化)
    if (!forceRefresh) {
      const cachedData = await inquiryDetailsCache.getAsync();
      if (cachedData) {
        console.log(
          `[询价明细缓存] 从缓存获取数据，条目数: ${cachedData.length}`
        );
        return {
          success: true,
          data: cachedData,
          fromCache: true
        };
      }
    }

    console.log("[询价明细缓存] 缓存未命中或已过期，从数据库获取数据...");

    // 缓存未命中，从数据库获取数据
    const { getAllInquiryDetailsSupabase } = await getSupabaseFunctions();
    const result = await getAllInquiryDetailsSupabase();

    if (result.success && result.data) {
      // 将数据存入缓存
      inquiryDetailsCache.set(result.data);
      console.log(`[询价明细缓存] 数据已缓存，条目数: ${result.data.length}`);

      return {
        success: true,
        data: result.data,
        fromCache: false
      };
    } else {
      return {
        success: false,
        message: result.message || "获取询价明细数据失败"
      };
    }
  } catch (error) {
    console.error("[询价明细缓存] 获取数据时发生错误:", error);
    return {
      success: false,
      message: `获取失败: ${error instanceof Error ? error.message : "未知错误"}`
    };
  }
};

/**
 * 预热缓存：在应用启动时预先加载询价明细数据
 */
export const preloadInquiryDetailsCache = async (): Promise<void> => {
  try {
    console.log("[询价明细缓存] 开始预热缓存...");
    await getCachedAllInquiryDetails();
    console.log("[询价明细缓存] 预热缓存完成");
  } catch (error) {
    console.warn("[询价明细缓存] 预热缓存失败:", error);
  }
};

/**
 * 清除询价明细缓存
 */
export const clearInquiryDetailsCache = (): void => {
  inquiryDetailsCache.clear();
  console.log("[询价明细缓存] 缓存已清除");
};

/**
 * 获取缓存统计信息
 */
export const getInquiryDetailsCacheStats = () => {
  return inquiryDetailsCache.getStats();
};

/**
 * 内存优化：在内存不足时主动清理缓存
 */
export const optimizeMemoryUsage = (): void => {
  const stats = inquiryDetailsCache.getStats();

  // 如果缓存超过一定大小，主动清理
  if (stats.totalEntries > 30) {
    console.log("[内存优化] 检测到大缓存，主动清理询价明细缓存");
    inquiryDetailsCache.clear();
  }
};

// 监听页面卸载事件，清理缓存
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    clearInquiryDetailsCache();
  });
}
