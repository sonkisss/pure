/**
 * 统一统计缓存管理器
 * 使用新的统一缓存管理器架构替代旧的cacheConfig架构
 */

import { createCache } from "./unifiedCacheManager";

export interface StatisticsData {
  total_sales: number;
  total_profit: number;
  contract_count: number;
  year: number;
}

/**
 * 统计数据缓存管理器
 * 基于新的统一缓存管理器实现
 */
class UnifiedStatisticsCache {
  private cache = createCache<StatisticsData>("company", "STATISTICS");

  /**
   * 生成缓存键
   */
  private getCacheKey(companyId: number, year: number): Record<string, any> {
    return { companyId, year };
  }

  /**
   * 获取统计数据
   */
  get(companyId: number, year: number): StatisticsData | null {
    return this.cache.get(this.getCacheKey(companyId, year));
  }

  /**
   * 设置统计数据
   */
  set(companyId: number, year: number, data: StatisticsData): void {
    this.cache.set(data, this.getCacheKey(companyId, year));
  }

  /**
   * 删除指定公司的缓存
   */
  invalidate(companyId: number): void {
    this.cache.clearByPrefix(`company:STATISTICS:${companyId}:`);
  }

  /**
   * 删除指定年份的所有缓存
   */
  invalidateYear(year: number): void {
    // 通过前缀清理所有年份缓存
    this.cache.clearByPrefix(`company:STATISTICS:`);
    console.log(`[统计缓存] 清理了 ${year} 年的所有缓存`);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    console.log("[统计缓存] 已清空所有缓存");
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * 强制刷新指定公司的缓存
   */
  forceRefresh(companyId: number): void {
    this.invalidate(companyId);
  }
}

// 创建全局实例
export const unifiedStatisticsCache = new UnifiedStatisticsCache();

export default unifiedStatisticsCache;
