import { createCache } from "./unifiedCacheManager";

interface ProductListCacheData {
  data: any[];
  total: number;
}

class ProductDataCache {
  // 启用持久化
  private listCache = createCache<ProductListCacheData>(
    "product",
    "LIST_DATA",
    {
      enablePersistence: true
    }
  );
  private searchCache = createCache<any[]>("product", "SEARCH_DATA", {
    enablePersistence: true
  });

  /**
   * 获取产品列表缓存 (支持异步持久化读取)
   */
  async get(
    page: number,
    pageSize: number,
    keyword: string
  ): Promise<ProductListCacheData | null> {
    return this.listCache.getAsync({ page, pageSize, keyword });
  }

  /**
   * 设置产品列表缓存
   */
  set(
    page: number,
    pageSize: number,
    keyword: string,
    data: any[],
    total: number
  ): void {
    // 深拷贝避免引用问题
    const cacheData = {
      data: JSON.parse(JSON.stringify(data)),
      total
    };
    this.listCache.set(cacheData, { page, pageSize, keyword });
  }

  /**
   * 获取搜索建议缓存
   */
  async getSearchSuggestions(keyword: string): Promise<any[]> {
    if (keyword.length < 2) return [];
    return (await this.searchCache.getAsync({ keyword })) || [];
  }

  /**
   * 设置搜索建议缓存
   */
  setSearchSuggestions(keyword: string, results: any[]): void {
    this.searchCache.set([...results], { keyword });
  }

  /**
   * 删除特定产品相关的缓存
   */
  invalidateProduct(_productId: number): void {
    // 简单策略：清除所有列表缓存
    this.listCache.clear();
  }

  /**
   * 清除特定关键词的缓存
   */
  invalidateKeyword(keyword: string): void {
    const keys = this.listCache.getKeys();
    // 统一缓存生成的key格式: LIST_DATA:keyword:xxx|page:1...
    // 我们查找包含 keyword:{keyword} 的key
    const searchStr = `keyword:${keyword}`;

    keys.forEach(key => {
      if (key.includes(searchStr)) {
        // UnifiedCacheManager目前没有直接暴露按原始key删除的方法
        // 但我们可以重构一下，或者简单地 clearAll 如果很难匹配
        // 这里我们可以尝试解析 key 或者让 UnifiedCacheManager 支持按 Key 删除
        // 既然 UnifiedCacheManager.cache 是私有的，我们只能调用 delete(params)
        // 但我们很难从 key 反推出 params (虽然可以解析字符串)
        // 暂时简单处理：如果涉及关键词失效，清除所有列表缓存
        // 或者不处理，等待 TTL 过期
      }
    });

    // 简单起见，清除所有，保证一致性
    this.listCache.clear();
  }

  clear(): void {
    this.listCache.clear();
    this.searchCache.clear();
  }

  size(): number {
    return this.listCache.size();
  }

  searchSize(): number {
    return this.searchCache.size();
  }

  // 预加载下一页数据
  preloadNextPage(
    currentPage: number,
    pageSize: number,
    keyword: string,
    totalItems: number,
    loadFunction: (
      page: number,
      pageSize: number,
      keyword: string
    ) => Promise<any>
  ): void {
    const nextPage = currentPage + 1;
    const maxPage = Math.ceil(totalItems / pageSize);

    // 如果有下一页且未缓存，则预加载
    if (nextPage <= maxPage) {
      // 检查缓存是否存在（同步检查内存即可，避免复杂异步逻辑影响性能）
      const exists = this.listCache.has({ page: nextPage, pageSize, keyword });

      if (!exists) {
        loadFunction(nextPage, pageSize, keyword).catch(() => {
          // 预加载失败不影响主要功能
        });
      }
    }
  }
}

// 单例模式
export const productDataCache = new ProductDataCache();
