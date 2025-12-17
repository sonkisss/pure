// @ts-nocheck
/**
 * 缓存监控和统计工具
 * 提供实时的缓存性能监控和统计信息
 */

import { globalCacheManager, type CacheStats } from "./unifiedCacheManager";

export interface CacheMonitorReport {
  timestamp: string;
  globalStats: {
    totalManagers: number;
    totalEntries: number;
    totalMemoryUsage: number;
    averageHitRate: number;
    totalHits: number;
    totalMisses: number;
  };
  managerStats: Record<string, CacheStats>;
  performance: {
    slowQueries: Array<{
      manager: string;
      operation: string;
      duration: number;
      timestamp: string;
    }>;
    memoryTrend: Array<{
      timestamp: string;
      memoryUsage: number;
    }>;
    recommendations: string[];
  };
}

class CacheMonitor {
  private static instance: CacheMonitor;
  private slowQueries: Array<{
    manager: string;
    operation: string;
    duration: number;
    timestamp: string;
  }> = [];
  private memoryTrend: Array<{
    timestamp: string;
    memoryUsage: number;
  }> = [];
  private maxSlowQueries = 50;
  private maxMemoryTrend = 100;

  private constructor() {
    // 启动定期监控
    this.startPeriodicMonitoring();
  }

  static getInstance(): CacheMonitor {
    if (!CacheMonitor.instance) {
      CacheMonitor.instance = new CacheMonitor();
    }
    return CacheMonitor.instance;
  }

  /**
   * 记录慢查询
   */
  recordSlowQuery(manager: string, operation: string, duration: number): void {
    const query = {
      manager,
      operation,
      duration,
      timestamp: new Date().toISOString()
    };

    this.slowQueries.push(query);

    // 保持最大数量限制
    if (this.slowQueries.length > this.maxSlowQueries) {
      this.slowQueries.shift();
    }

    // 如果超过100ms，警告
    if (duration > 100) {
      console.warn(
        `[缓存监控] 慢查询警告: ${manager}.${operation} 耗时 ${duration}ms`
      );
    }
  }

  /**
   * 记录内存使用趋势
   */
  recordMemoryTrend(): void {
    const stats = globalCacheManager.getGlobalStats();
    const totalMemory = Object.values(stats).reduce(
      (sum, stat) => sum + stat.memoryUsage,
      0
    );

    const trend = {
      timestamp: new Date().toISOString(),
      memoryUsage: totalMemory
    };

    this.memoryTrend.push(trend);

    // 保持最大数量限制
    if (this.memoryTrend.length > this.maxMemoryTrend) {
      this.memoryTrend.shift();
    }
  }

  /**
   * 生成完整的监控报告
   */
  generateReport(): CacheMonitorReport {
    const globalStats = globalCacheManager.getGlobalStats();
    const managerStats = globalStats;

    // 计算全局统计
    const totalManagers = Object.keys(managerStats).length;
    const totalEntries = Object.values(managerStats).reduce(
      (sum, stat) => sum + stat.totalEntries,
      0
    );
    const totalMemoryUsage = Object.values(managerStats).reduce(
      (sum, stat) => sum + stat.memoryUsage,
      0
    );
    const totalHits = Object.values(managerStats).reduce(
      (sum, stat) => sum + stat.hits,
      0
    );
    const totalMisses = Object.values(managerStats).reduce(
      (sum, stat) => sum + stat.misses,
      0
    );
    const averageHitRate =
      totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    // 生成性能建议
    const recommendations = this.generateRecommendations(managerStats, {
      totalEntries,
      totalMemoryUsage,
      averageHitRate
    });

    return {
      timestamp: new Date().toISOString(),
      globalStats: {
        totalManagers,
        totalEntries,
        totalMemoryUsage,
        averageHitRate,
        totalHits,
        totalMisses
      },
      managerStats,
      performance: {
        slowQueries: [...this.slowQueries],
        memoryTrend: [...this.memoryTrend],
        recommendations
      }
    };
  }

  /**
   * 生成性能优化建议
   */
  private generateRecommendations(
    managerStats: Record<string, CacheStats>,
    globalMetrics: {
      totalEntries: number;
      totalMemoryUsage: number;
      averageHitRate: number;
    }
  ): string[] {
    const recommendations: string[] = [];

    // 内存使用建议
    if (globalMetrics.totalMemoryUsage > 10 * 1024 * 1024) {
      // 10MB
      recommendations.push("⚠️ 内存使用较高，建议清理过期缓存或减少TTL时间");
    }

    // 命中率建议
    if (globalMetrics.averageHitRate < 0.7) {
      recommendations.push("📊 缓存命中率较低，建议检查TTL配置或数据访问模式");
    }

    // 条目数量建议
    if (globalMetrics.totalEntries > 10000) {
      recommendations.push("🔢 缓存条目过多，建议实施更积极的清理策略");
    }

    // 单个管理器建议
    for (const [key, stats] of Object.entries(managerStats)) {
      if (stats.hitRate < 0.5 && stats.totalEntries > 100) {
        recommendations.push(
          `📉 ${key} 命中率较低 (${(stats.hitRate * 100).toFixed(1)}%)，建议优化缓存策略`
        );
      }

      if (stats.memoryUsage > 5 * 1024 * 1024) {
        // 5MB
        recommendations.push(
          `💾 ${key} 内存使用较高 (${(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB)，建议减少缓存数据量`
        );
      }
    }

    // 慢查询建议
    const frequentSlowQueries = this.slowQueries.filter(q => q.duration > 200);
    if (frequentSlowQueries.length > 5) {
      recommendations.push("🐌 检测到频繁的慢查询，建议优化缓存查询逻辑");
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ 缓存性能良好，无需优化");
    }

    return recommendations;
  }

  /**
   * 启动定期监控
   */
  private startPeriodicMonitoring(): void {
    // 每30秒记录内存使用趋势
    setInterval(() => {
      this.recordMemoryTrend();
    }, 30 * 1000);

    // 每5分钟输出一次监控报告
    setInterval(
      () => {
        const report = this.generateReport();
        this.logMonitoringSummary(report);
      },
      5 * 60 * 1000
    );
  }

  /**
   * 输出监控摘要
   */
  private logMonitoringSummary(report: CacheMonitorReport): void {
    console.group(`📊 [缓存监控] ${new Date().toLocaleString()} 报告摘要`);
    console.log(`🏭 缓存管理器: ${report.globalStats.totalManagers} 个`);
    console.log(`📦 总条目数: ${report.globalStats.totalEntries} 个`);
    console.log(
      `💾 内存使用: ${(report.globalStats.totalMemoryUsage / 1024 / 1024).toFixed(1)} MB`
    );
    console.log(
      `🎯 命中率: ${(report.globalStats.averageHitRate * 100).toFixed(1)}%`
    );
    console.log(
      `📈 总命中: ${report.globalStats.totalHits} | 总未命中: ${report.globalStats.totalMisses}`
    );

    if (
      report.performance.recommendations.length > 0 &&
      !report.performance.recommendations[0].includes("✅")
    ) {
      console.log(`⚠️ 性能建议:`);
      report.performance.recommendations
        .slice(0, 3)
        .forEach(rec => console.log(`   ${rec}`));
    }

    console.groupEnd();
  }

  /**
   * 清理监控数据
   */
  clearMonitoringData(): void {
    this.slowQueries = [];
    this.memoryTrend = [];
    console.log("[缓存监控] 监控数据已清理");
  }

  /**
   * 获取内存使用趋势
   */
  getMemoryTrend(): Array<{ timestamp: string; memoryUsage: number }> {
    return [...this.memoryTrend];
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(): Array<{
    manager: string;
    operation: string;
    duration: number;
    timestamp: string;
  }> {
    return [...this.slowQueries];
  }

  /**
   * 强制执行全局缓存清理
   */
  forceGlobalCleanup(): {
    clearedManagers: number;
    clearedEntries: number;
    freedMemory: number;
  } {
    const beforeStats = globalCacheManager.getGlobalStats();
    const beforeEntries = Object.values(beforeStats).reduce(
      (sum, stat) => sum + stat.totalEntries,
      0
    );
    const beforeMemory = Object.values(beforeStats).reduce(
      (sum, stat) => sum + stat.memoryUsage,
      0
    );

    globalCacheManager.clearAll();

    const clearedManagers = Object.keys(beforeStats).length;
    const clearedEntries = beforeEntries;
    const freedMemory = beforeMemory;

    console.log(
      `🧹 [强制清理] 清理了 ${clearedManagers} 个缓存管理器，${clearedEntries} 个条目，释放 ${(freedMemory / 1024 / 1024).toFixed(1)} MB 内存`
    );

    return {
      clearedManagers,
      clearedEntries,
      freedMemory
    };
  }
}

// 创建全局实例
export const cacheMonitor = CacheMonitor.getInstance();

/**
 * 性能测量装饰器
 */
export function measureCachePerformance(
  managerName: string,
  operationName: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();
      const result = originalMethod.apply(this, args);
      const endTime = performance.now();

      // 如果是异步方法，等待完成后记录
      if (result && typeof result.then === "function") {
        return result.finally(() => {
          const duration = endTime - startTime;
          cacheMonitor.recordSlowQuery(managerName, operationName, duration);
        });
      } else {
        const duration = endTime - startTime;
        cacheMonitor.recordSlowQuery(managerName, operationName, duration);
        return result;
      }
    };

    return descriptor;
  };
}

/**
 * 快速获取缓存统计
 */
export function getQuickCacheStats(): {
  totalManagers: number;
  totalEntries: number;
  totalMemoryMB: number;
  averageHitRate: number;
} {
  const stats = globalCacheManager.getGlobalStats();
  const totalManagers = Object.keys(stats).length;
  const totalEntries = Object.values(stats).reduce(
    (sum, stat) => sum + stat.totalEntries,
    0
  );
  const totalMemory = Object.values(stats).reduce(
    (sum, stat) => sum + stat.memoryUsage,
    0
  );
  const totalHits = Object.values(stats).reduce(
    (sum, stat) => sum + stat.hits,
    0
  );
  const totalMisses = Object.values(stats).reduce(
    (sum, stat) => sum + stat.misses,
    0
  );
  const averageHitRate =
    totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

  return {
    totalManagers,
    totalEntries,
    totalMemoryMB: Number((totalMemory / 1024 / 1024).toFixed(1)),
    averageHitRate: Number((averageHitRate * 100).toFixed(1))
  };
}

/**
 * 缓存健康检查
 */
export function performCacheHealthCheck(): {
  isHealthy: boolean;
  issues: string[];
  score: number; // 0-100
} {
  const report = cacheMonitor.generateReport();
  const issues: string[] = [];
  let score = 100;

  // 检查内存使用
  if (report.globalStats.totalMemoryUsage > 50 * 1024 * 1024) {
    // 50MB
    issues.push("内存使用过高");
    score -= 30;
  } else if (report.globalStats.totalMemoryUsage > 20 * 1024 * 1024) {
    // 20MB
    issues.push("内存使用偏高");
    score -= 15;
  }

  // 检查命中率
  if (report.globalStats.averageHitRate < 0.5) {
    issues.push("缓存命中率过低");
    score -= 25;
  } else if (report.globalStats.averageHitRate < 0.7) {
    issues.push("缓存命中率偏低");
    score -= 10;
  }

  // 检查慢查询
  const recentSlowQueries = report.performance.slowQueries.filter(
    q => new Date(q.timestamp).getTime() > Date.now() - 5 * 60 * 1000 // 最近5分钟
  );

  if (recentSlowQueries.length > 10) {
    issues.push("慢查询过多");
    score -= 20;
  } else if (recentSlowQueries.length > 5) {
    issues.push("存在慢查询");
    score -= 10;
  }

  // 检查缓存条目数量
  if (report.globalStats.totalEntries > 50000) {
    issues.push("缓存条目过多");
    score -= 15;
  }

  return {
    isHealthy: score >= 70,
    issues,
    score: Math.max(0, score)
  };
}

// 开发环境下自动启动监控
if (import.meta.env.DEV) {
  console.log("🚀 [缓存监控] 开发环境缓存监控已启动");

  // 在控制台暴露监控工具
  (window as any).cacheMonitor = {
    getReport: () => cacheMonitor.generateReport(),
    getQuickStats: getQuickCacheStats,
    healthCheck: performCacheHealthCheck,
    forceCleanup: () => cacheMonitor.forceGlobalCleanup(),
    clearData: () => cacheMonitor.clearMonitoringData()
  };
}
