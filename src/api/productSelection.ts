import { getAllContractDetails } from "./business";
import { getAllInquiryDetails } from "./inquiry";
import { getProductList } from "./product";

// 产品选择源类型
export enum ProductSource {
  PRODUCTS = "products", // 产品列表
  CONTRACT_DETAILS = "contract_details", // 合同明细
  INQUIRY_DETAILS = "inquiry_details" // 询价明细
}

// 统一的产品数据项
export interface ProductSelectionItem {
  id: string | number;
  name: string;
  specification?: string;
  unit?: string;
  purchase_price: number;
  sale_price?: number;
  supplier?: string;
  tax_type?: string;
  remark?: string;
  source: ProductSource; // 数据来源
  source_id?: number; // 原始数据ID
}

// 产品选择结果
export interface ProductSelectionResult {
  success: boolean;
  data?: {
    totalItems: number;
    items: ProductSelectionItem[];
    sourceCounts: {
      [ProductSource.PRODUCTS]: number;
      [ProductSource.CONTRACT_DETAILS]: number;
      [ProductSource.INQUIRY_DETAILS]: number;
    };
  };
  message?: string;
}

/**
 * 从产品管理模块获取所有可用的产品数据
 * 包括：产品列表 + 合同明细 + 询价明细
 */
export const getProductSelectionData =
  async (): Promise<ProductSelectionResult> => {
    try {
      console.log("📦 开始获取产品选择数据...");

      const allItems: ProductSelectionItem[] = [];
      const sourceCounts = {
        [ProductSource.PRODUCTS]: 0,
        [ProductSource.CONTRACT_DETAILS]: 0,
        [ProductSource.INQUIRY_DETAILS]: 0
      };

      // 1. 获取产品列表数据（获取所有页面的数据）
      try {
        const allProducts: any[] = [];
        let page = 1;
        const pageSize = 100; // 使用更大的页面大小减少请求数

        while (true) {
          const productsResult = await getProductList({ page, pageSize });
          if (
            productsResult.success &&
            productsResult.data &&
            productsResult.data.list
          ) {
            allProducts.push(...productsResult.data.list);
            console.log(
              `📋 产品列表第${page}页获取: ${productsResult.data.list.length} 条`
            );

            // 如果当前页的数据少于页面大小，说明已经是最后一页
            if (productsResult.data.list.length < pageSize) {
              break;
            }
            page++;
          } else {
            break;
          }
        }

        const productItems: ProductSelectionItem[] = allProducts
          .map(product => ({
            id: product.id,
            name: product.name || "",
            specification: product.specification || "",
            unit: product.unit || "",
            purchase_price: product.price || 0, // 修复字段名：Product API返回的是price字段
            sale_price: 0, // 产品列表通常没有卖价
            supplier: product.supplier || "",
            tax_type: product.taxType || "不含税", // 修复字段名：Product API返回的是taxType字段
            remark: product.remark || "",
            source: ProductSource.PRODUCTS,
            source_id: product.id
          }))
          .filter(item => item.purchase_price > 0); // 过滤掉进价为0的产品

        allItems.push(...productItems);
        sourceCounts[ProductSource.PRODUCTS] = productItems.length;
        console.log(`📋 产品列表获取完成，总计: ${productItems.length} 条`);
      } catch (error) {
        console.warn("⚠️ 产品列表获取失败:", error);
      }

      // 2. 获取合同明细数据（去重后的）
      try {
        const contractDetailsResult = await getAllContractDetails();
        if (contractDetailsResult.success && contractDetailsResult.data) {
          const contractItems: ProductSelectionItem[] =
            contractDetailsResult.data
              .map(item => ({
                id: `contract_${item.id}`,
                name: item.product_name || "",
                specification: item.spec_model || "",
                unit: item.unit || "",
                purchase_price: item.purchase_price || 0,
                sale_price: item.sale_price || 0,
                supplier: item.supplier || "",
                tax_type:
                  item.includes_tax === 1
                    ? "含税"
                    : item.includes_tax === 2
                      ? "普票"
                      : "不含税",
                remark: item.remark || "",
                source: ProductSource.CONTRACT_DETAILS,
                source_id: item.id
              }))
              .filter(item => item.purchase_price > 0); // 过滤掉进价为0的产品

          allItems.push(...contractItems);
          sourceCounts[ProductSource.CONTRACT_DETAILS] = contractItems.length;
          console.log(`📄 合同明细获取完成: ${contractItems.length} 条`);
        }
      } catch (error) {
        console.warn("⚠️ 合同明细获取失败:", error);
      }

      // 3. 获取询价明细数据（去重后的）
      try {
        const inquiryDetailsResult = await getAllInquiryDetails();
        if (inquiryDetailsResult.success && inquiryDetailsResult.data) {
          const inquiryItems: ProductSelectionItem[] = inquiryDetailsResult.data
            .map(item => ({
              id: `inquiry_${item.id}`,
              name: item.product_name || "",
              specification: item.spec_model || "",
              unit: item.unit || "",
              purchase_price: item.purchase_price || 0,
              sale_price: item.sale_price || 0,
              supplier: item.supplier || "",
              tax_type: item.tax_type || "不含税",
              remark: item.remark || "",
              source: ProductSource.INQUIRY_DETAILS,
              source_id: item.id
            }))
            .filter(item => item.purchase_price > 0); // 过滤掉进价为0的产品

          allItems.push(...inquiryItems);
          sourceCounts[ProductSource.INQUIRY_DETAILS] = inquiryItems.length;
          console.log(`📋 询价明细获取完成: ${inquiryItems.length} 条`);
        }
      } catch (error) {
        console.warn("⚠️ 询价明细获取失败:", error);
      }

      // 按进价升序排序，价格低的优先
      allItems.sort((a, b) => a.purchase_price - b.purchase_price);

      console.log(`✅ 产品选择数据获取完成，总计: ${allItems.length} 条`);
      console.log(`📊 数据源统计:`, sourceCounts);

      return {
        success: true,
        data: {
          totalItems: allItems.length,
          items: allItems,
          sourceCounts
        }
      };
    } catch (error) {
      console.error("❌ 获取产品选择数据失败:", error);
      return {
        success: false,
        message: `获取失败: ${error instanceof Error ? error.message : "未知错误"}`
      };
    }
  };
