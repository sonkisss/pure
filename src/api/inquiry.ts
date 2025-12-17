import { http } from "@/utils/http";
import { supabase } from "@/services/supabase";
import type { AllInquiryDetailsItem } from "@/repositories/inquirySupabase";

// 动态导入Supabase函数
async function getSupabaseFunctions() {
  return await import("@/repositories/inquirySupabase");
}

/** 含税类型 */
export type InquiryTaxType = "含税" | "普票" | "不含";

/** 附件类型定义 */
export type Attachment = {
  id: number;
  fileName: string;
  fileUrl: string; // Base64或URL
  fileType: string; // 文件类型（image/pdf等）
  uploadTime: string;
};

/** 匹配状态类型 */
export type MatchStatus = "matched" | "unmatched" | "multiple";

/** 询价单明细类型定义 */
export type InquiryItem = {
  id: number;
  inquiryId: number;
  productId: number | null; // 关联的产品ID（匹配后）
  name: string; // 产品名称
  specification: string; // 规格型号
  unit: string; // 单位
  quantity: number; // 数量
  purchasePrice: number; // 进价
  purchaseAmount: number; // 进价金额（数量 × 进价）
  salePrice: number; // 卖价
  saleAmount: number; // 卖价金额（数量 × 卖价）
  amount?: number; // 兼容旧字段，等同于 purchaseAmount
  unitPrice?: number; // 兼容字段，等同于 purchasePrice
  supplier: string; // 供应商
  taxType: InquiryTaxType; // 含税类型：含税/普票/不含
  remark: string; // 备注
  matchStatus: MatchStatus; // 匹配状态
  matchedProducts?: any[]; // 匹配到的多个产品（供选择）
};

/** 自定义费用类型定义 */
export type CustomFee = {
  id?: number;
  inquiryId: number;
  label: string; // 费用名称
  amount: number; // 费用金额
  createTime?: string; // 创建时间
  updateTime?: string; // 更新时间
};

/** 利润计算数据类型定义 */
export type ProfitCalculation = {
  id?: number;
  inquiryId: number;
  saleTotal: number; // 销售总额
  purchaseTotal: number; // 进货总额
  taxablePurchaseTotal: number; // 含税进货总额
  calculatedTaxFee: number; // 计算税费
  freightFee: number; // 运费
  estimatedProfit: number; // 预估利润
  profitRate: number; // 销售利润率
  customFees?: CustomFee[]; // 自定义费用列表
  createTime?: string; // 创建时间
  updateTime?: string; // 更新时间
};

/** 询价单主表类型定义 */
export type Inquiry = {
  id: number;
  name: string; // 询价名称
  company: string; // 询价公司
  date: string; // 询价日期
  createTime: string; // 创建时间
  itemCount: number; // 产品明细数量
  matchedCount: number; // 已匹配产品数量
  attachments: Attachment[]; // 附件列表
  items?: InquiryItem[]; // 询价单明细（仅在详情接口返回）
  profitCalculation?: ProfitCalculation; // 利润计算数据（仅在详情接口返回）
};

/** 询价单列表返回类型 */
export type InquiryListResult = {
  success: boolean;
  data: {
    list: Inquiry[];
    total: number;
  };
};

/** 询价单详情返回类型 */
export type InquiryDetailResult = {
  success: boolean;
  data: Inquiry;
};

/** 操作结果返回类型 */
export type OperationResult = {
  success: boolean;
  message: string;
  data?: any;
};

/** 询价单统计信息 */
export type InquiryStatistics = {
  totalInquiries: number; // 询价单总数
  unmatchedItems: number; // 待匹配产品数
};

export type InquiryStatisticsResult = {
  success: boolean;
  data: InquiryStatistics;
};

/** Excel上传解析结果 */
export type ExcelMatchResult = {
  success: boolean;
  data: {
    items: InquiryItem[]; // 解析后的明细项（未匹配状态）
  };
};

/** 获取询价单列表 */
export const getInquiryList = async (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}) => {
  if (supabase) {
    const { getInquiryListSupabase } = await getSupabaseFunctions();
    return getInquiryListSupabase(data);
  }
  return http.request<InquiryListResult>("post", "/inquiry/list", { data });
};

/** 获取询价单详情 */
export const getInquiryDetail = async (id: number) => {
  if (supabase) {
    const { getInquiryDetailSupabase } = await getSupabaseFunctions();
    return getInquiryDetailSupabase(id);
  }
  return http.request<InquiryDetailResult>("get", `/inquiry/detail/${id}`);
};

/** 新增询价单 */
export const addInquiry = async (data: {
  name: string;
  company: string;
  date: string;
}) => {
  if (supabase) {
    const { addInquirySupabase } = await getSupabaseFunctions();
    return addInquirySupabase(data);
  }
  return http.request<OperationResult>("post", "/inquiry/add", { data });
};

/** 删除询价单 */
export const deleteInquiry = async (id: number) => {
  if (supabase) {
    const { deleteInquirySupabase } = await getSupabaseFunctions();
    return deleteInquirySupabase(id);
  }
  return http.request<OperationResult>("delete", `/inquiry/delete/${id}`);
};

/** 上传Excel询价单（仅解析，不匹配产品） */
export const uploadInquiryExcel = (formData: FormData) => {
  return http.request<ExcelMatchResult>("post", "/inquiry/upload-excel", {
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

/** 保存Excel匹配结果为询价单 */
export const saveExcelInquiry = async (data: {
  name: string;
  company: string;
  date: string;
  items: InquiryItem[];
}) => {
  if (supabase) {
    const { saveExcelInquirySupabase } = await getSupabaseFunctions();
    return saveExcelInquirySupabase(data);
  }
  return http.request<OperationResult>("post", "/inquiry/save-excel", { data });
};

export const addInquiryItems = async (
  inquiryId: number,
  items: InquiryItem[]
) => {
  if (supabase) {
    const { addInquiryItemsSupabase } = await getSupabaseFunctions();
    return addInquiryItemsSupabase(inquiryId, items);
  }
  return http.request<OperationResult>("post", "/inquiry/items/add", {
    data: { inquiryId, items }
  });
};

/** 选择匹配的产品 */
export const selectMatchedProduct = async (data: {
  inquiryId: number;
  itemId: number;
  productId: number;
}) => {
  if (supabase) {
    const { manualMatchProductSupabase } = await getSupabaseFunctions();
    return manualMatchProductSupabase(data);
  }
  return http.request<OperationResult>("post", "/inquiry/select-product", {
    data
  });
};

/** 手动匹配产品 */
export const manualMatchProduct = async (data: {
  inquiryId: number;
  itemId: number;
  productId: number;
}) => {
  if (supabase) {
    const { manualMatchProductSupabase } = await getSupabaseFunctions();
    return manualMatchProductSupabase(data);
  }
  return http.request<OperationResult>("post", "/inquiry/manual-match", {
    data
  });
};

/** 根据名称和规格精确匹配产品 */
export const getMatchedProducts = async (data: {
  name: string;
  specification: string;
}) => {
  if (supabase) {
    try {
      // 使用产品管理模块的完整数据源进行匹配
      const { getProductSelectionData } =
        await import("@/api/productSelection");
      const selectionResult = await getProductSelectionData();

      if (!selectionResult.success || !selectionResult.data) {
        return {
          success: false,
          message: "获取产品数据失败",
          data: []
        };
      }

      const { name, specification } = data;
      const allProducts = selectionResult.data.items;

      // 构建询价项对象用于匹配评分
      const inquiryItem = {
        name: name,
        specification: specification,
        unit: "" // 在这里可以添加单位信息如果有需要
      };

      // 第一步：计算每个产品的匹配分数
      const productsWithScore = allProducts.map(product => ({
        ...product,
        matchScore: calculateMatchScore(product, inquiryItem)
      }));

      // 第二步：过滤出有匹配分数的产品（分数 > 0）
      const matchedProducts = productsWithScore.filter(
        product => product.matchScore > 0
      );

      // 第三步：根据匹配规则重新组织和筛选产品
      const organizedProducts = organizeMatchedProducts(
        matchedProducts,
        inquiryItem
      );

      // 第四步：按匹配分数降序排序（分数高的优先）
      const sortedProducts = organizedProducts.sort(
        (a, b) => b.matchScore - a.matchScore
      );

      // 第五步：转换数据格式以兼容现有前端代码
      const result = sortedProducts.slice(0, 20).map(product => ({
        id: product.source_id || product.id,
        name: product.name,
        specification: product.specification || "",
        unit: product.unit || "",
        price: product.purchase_price,
        supplier: product.supplier || "",
        taxType: product.tax_type || "含税",
        remark: product.remark || "",
        createTime: "", // 产品选择数据中没有创建时间
        source: product.source, // 保留数据源信息用于调试
        matchScore: product.matchScore // 添加匹配分数用于调试
      }));

      console.log("🔍 [getMatchedProducts] 匹配结果:", {
        输入参数: { name, specification },
        总产品数: allProducts.length,
        匹配数量: matchedProducts.length,
        返回数量: result.length,
        匹配规则: "使用业务管理模块的匹配评分算法",
        数据源优先级: "产品列表(0.05) > 合同明细(0.03) > 询价明细(0.01)",
        示例数据: result.slice(0, 3).map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          supplier: item.supplier,
          source: item.source,
          matchScore: item.matchScore
        }))
      });

      return {
        success: true,
        message: "",
        data: result
      };
    } catch (error) {
      console.error("获取匹配产品失败:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "获取匹配产品失败",
        data: []
      };
    }
  }
  return http.request<OperationResult>("post", "/inquiry/match-products", {
    data
  });
};

/**
 * 计算匹配分数（与业务管理模块保持一致）
 */
function calculateMatchScore(product: any, inquiryItem: any): number {
  let score = 0;

  // 产品名称匹配（权重最高）
  if (product.name && inquiryItem.name) {
    const productName = product.name.toLowerCase().trim();
    const inquiryProductName = inquiryItem.name.toLowerCase().trim();

    if (productName === inquiryProductName) {
      score += 0.8; // 完全匹配
    } else if (
      productName.includes(inquiryProductName) ||
      inquiryProductName.includes(productName)
    ) {
      score += 0.4; // 部分匹配
    }
  }

  // 规格型号匹配
  if (product.specification && inquiryItem.specification) {
    const productSpec = product.specification.toLowerCase().trim();
    const inquirySpec = inquiryItem.specification.toLowerCase().trim();

    if (productSpec === inquirySpec) {
      score += 0.15; // 完全匹配
    } else if (
      productSpec.includes(inquirySpec) ||
      inquirySpec.includes(productSpec)
    ) {
      score += 0.08; // 部分匹配
    }
  }

  // 单位匹配
  if (product.unit && inquiryItem.unit) {
    if (product.unit.trim() === inquiryItem.unit.trim()) {
      score += 0.05;
    }
  }

  // 数据源优先级（产品列表 > 合同明细 > 询价明细）
  switch (product.source) {
    case "products":
      score += 0.05;
      break;
    case "contract_details":
      score += 0.03;
      break;
    case "inquiry_details":
      score += 0.01;
      break;
  }

  return Math.min(score, 1); // 限制在0-1之间
}

/**
 * 根据匹配规则重新组织和筛选产品
 * 规则1: 产品名称+规格型号+供应商一致时，只保留进价最低的一条
 * 规则2: 产品名称+规格型号一致但供应商不同的，都要显示
 */
function organizeMatchedProducts(
  matchedProducts: any[],
  inquiryItem: any
): any[] {
  const normalizedInquiryName = inquiryItem.name.toLowerCase().trim();
  const normalizedInquirySpec = inquiryItem.specification.toLowerCase().trim();

  // 第一步：筛选出真正匹配的产品（产品名称+规格型号都匹配）
  const relevantProducts = matchedProducts.filter(product => {
    const normalizedProductName = product.name.toLowerCase().trim();
    const normalizedSpec = (product.specification || "").toLowerCase().trim();

    // 只有产品名称和规格型号都匹配才认为是相关产品
    return (
      normalizedProductName === normalizedInquiryName &&
      normalizedSpec === normalizedInquirySpec
    );
  });

  console.log("🔍 [筛选逻辑] 筛选前产品:", {
    输入参数: {
      产品名称: normalizedInquiryName,
      规格型号: normalizedInquirySpec
    },
    原始产品数: matchedProducts.length,
    相关产品数: relevantProducts.length,
    筛选规则: "只保留产品名称+规格型号都完全匹配的产品"
  });

  // 第二步：按产品名称+规格型号+供应商分组，用于去重
  const exactGroups = new Map<string, any[]>();

  relevantProducts.forEach(product => {
    const normalizedSupplier = (product.supplier || "").toLowerCase().trim();

    // 创建唯一key（产品名称+规格型号+供应商）
    const exactKey = `${product.name.toLowerCase().trim()}|${(product.specification || "").toLowerCase().trim()}|${normalizedSupplier}`;

    // 添加到分组中
    if (!exactGroups.has(exactKey)) {
      exactGroups.set(exactKey, []);
    }
    exactGroups.get(exactKey)!.push(product);
  });

  const result: any[] = [];

  // 第三步：处理去重，每个完全相同的产品组只保留进价最低的一个
  exactGroups.forEach(group => {
    if (group.length > 0) {
      const lowestPriceProduct = group.reduce((min, current) =>
        current.purchase_price < min.purchase_price ? current : min
      );
      result.push(lowestPriceProduct);
    }
  });

  // 第四步：按进价升序排序
  result.sort((a, b) => a.purchase_price - b.purchase_price);

  console.log("🔄 [organizeMatchedProducts] 产品重组结果:", {
    输入参数: {
      产品名称: normalizedInquiryName,
      规格型号: normalizedInquirySpec
    },
    原始产品数: matchedProducts.length,
    相关产品数: relevantProducts.length,
    去重分组数: exactGroups.size,
    重组后产品数: result.length,
    匹配规则: "只显示产品名称+规格型号都匹配的产品",
    去重规则: "产品名称+规格型号+供应商完全相同的只保留最低价",
    排序规则: "按进价升序"
  });

  return result;
}

/** 上传附件 */
export const uploadAttachment = async (inquiryId: number, file: File) => {
  if (supabase) {
    const { uploadAttachmentSupabase } = await getSupabaseFunctions();
    return uploadAttachmentSupabase(inquiryId, file);
  }
  return new Promise<OperationResult>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const fileData = {
          fileName: file.name,
          fileUrl: e.target?.result as string,
          fileType: file.type
        };
        const res = await http.request<OperationResult>(
          "post",
          `/inquiry/${inquiryId}/attachment`,
          { data: fileData }
        );
        resolve(res);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
};

/** 删除附件 */
export const deleteAttachment = async (
  inquiryId: number,
  attachmentId: number
) => {
  if (supabase) {
    const { deleteAttachmentSupabase } = await getSupabaseFunctions();
    return deleteAttachmentSupabase(inquiryId, attachmentId);
  }
  return http.request<OperationResult>(
    "delete",
    `/inquiry/${inquiryId}/attachment/${attachmentId}`
  );
};

/** 获取询价单统计信息 */
export const getInquiryStatistics = () => {
  // 简化统计：Supabase 分支按当前数据临时聚合
  if (supabase)
    return supabase
      .from("inquiry_items")
      .select("inquiry_id,match_status")
      .then(res => {
        const totalItems = (res.data ?? []).length;
        const matched = (res.data ?? []).filter(
          (r: any) => r.match_status === "matched"
        ).length;
        const multiple = (res.data ?? []).filter(
          (r: any) => r.match_status === "multiple"
        ).length;
        return {
          success: true,
          data: { totalItems, matched, multiple }
        } as any;
      });
  return http.request<InquiryStatisticsResult>("get", "/inquiry/statistics");
};

/** 更新询价明细项 */
export const updateInquiryItem = async (data: InquiryItem) => {
  if (supabase) {
    const { updateInquiryItemSupabase } = await getSupabaseFunctions();
    return updateInquiryItemSupabase(data);
  }
  return http.request<OperationResult>("put", "/inquiry/item/update", { data });
};

/** 利润计算相关API */

/** 保存利润计算数据 */
export const saveProfitCalculation = async (data: ProfitCalculation) => {
  if (supabase) {
    const { saveProfitCalculationSupabase } = await getSupabaseFunctions();
    return saveProfitCalculationSupabase(data);
  }
  return http.request<OperationResult>(
    "post",
    "/inquiry/profit-calculation/save",
    { data }
  );
};

/** 获取利润计算数据 */
export const getProfitCalculation = async (inquiryId: number) => {
  if (supabase) {
    const { getProfitCalculationSupabase } = await getSupabaseFunctions();
    return getProfitCalculationSupabase(inquiryId);
  }
  return http.request<{ success: boolean; data: ProfitCalculation }>(
    "get",
    `/inquiry/${inquiryId}/profit-calculation`
  );
};

/** 保存自定义费用 */
export const saveCustomFee = (data: CustomFee) => {
  return http.request<OperationResult>("post", "/inquiry/custom-fee/save", {
    data
  });
};

/** 获取自定义费用列表 */
export const getCustomFees = (inquiryId: number) => {
  return http.request<{ success: boolean; data: CustomFee[] }>(
    "get",
    `/inquiry/${inquiryId}/custom-fees`
  );
};

/** 删除自定义费用 */
export const deleteCustomFee = (feeId: number) => {
  return http.request<OperationResult>(
    "delete",
    `/inquiry/custom-fee/${feeId}`
  );
};

/** 批量保存自定义费用 */
export const saveCustomFees = async (
  inquiryId: number,
  fees: Omit<CustomFee, "id" | "inquiryId" | "createTime" | "updateTime">[]
) => {
  if (supabase) {
    const { saveCustomFeesSupabase } = await getSupabaseFunctions();
    return saveCustomFeesSupabase(inquiryId, fees);
  }
  return http.request<OperationResult>(
    "post",
    `/inquiry/${inquiryId}/custom-fees/batch`,
    { data: fees }
  );
};

/** 批量删除询价明细 */
export const deleteInquiryItems = async (itemIds: number[]) => {
  if (supabase) {
    const { deleteInquiryItemsSupabase } = await getSupabaseFunctions();
    return deleteInquiryItemsSupabase(itemIds);
  }
  return http.request<OperationResult>("post", "/inquiry/items/batch-delete", {
    data: { itemIds }
  });
};

/** 获取所有询价单的产品明细 */
export const getAllInquiryDetails = (forceRefresh: boolean = false) => {
  if (supabase) {
    // 使用缓存版本
    return import("@/utils/inquiryDetailsCache").then(
      ({ getCachedAllInquiryDetails }) => {
        return getCachedAllInquiryDetails(forceRefresh);
      }
    );
  }

  // Mock实现 - 可以在这里添加mock数据
  return Promise.resolve({
    success: true,
    data: []
  });
};

// 重新导出类型
export type { AllInquiryDetailsItem };
