import { http } from "@/utils/http";
import { supabase } from "@/services/supabase";
import {
  getCompanyListSupabase,
  getAllCompaniesSupabase,
  addCompanySupabase,
  updateCompanySupabase,
  deleteCompanySupabase,
  getContractListSupabase,
  addContractSupabase,
  updateContractSupabase,
  deleteContractSupabase,
  getContractDetailSupabase,
  getContractStatisticsSupabase,
  getBatchContractStatisticsSupabase,
  addContractDetailSupabase,
  updateContractDetailSupabase,
  deleteContractDetailSupabase,
  getContractAttachmentsSupabase,
  addContractAttachmentSupabase,
  deleteContractAttachmentSupabase,
  type ProductMatchResult,
  type ContractAttachment
} from "@/repositories/businessSupabase";
import { uploadFileToSupabase } from "@/services/storage";
import {
  addExpenseSupabase,
  updateExpenseSupabase,
  deleteExpenseSupabase,
  getExpenseCategoriesSupabase,
  addExpenseCategorySupabase,
  updateExpenseCategorySupabase
} from "@/repositories/expenseSupabase";

// 类型定义
export interface Company {
  id: number;
  company_name: string;
  company_code?: string;
  contact_person?: string;
  contact_phone?: string;
  address?: string;
  status: 1 | 0;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: number;
  company_id: number;
  company_name?: string;
  contract_name: string;
  contract_amount: number;
  contract_year: number;
  contract_date?: string;
  remark?: string;
  status: 1 | 0;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// 重新导出ContractAttachment类型
export type { ContractAttachment };

export interface ContractDetail {
  id: number;
  contract_id: number;
  product_name: string;
  spec_model?: string;
  unit?: string;
  quantity: number;
  purchase_price: number;
  purchase_amount: number;
  sale_price: number;
  sale_amount: number;
  is_credited?: boolean;
  supplier?: string;
  includes_tax: 0 | 1 | 2;
  payerId?: number; // 支付人ID
  payerName?: string; // 支付人姓名
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  contract_id?: number;
  title: string; // 费用名称 - 匹配数据库字段
  amount: number;
  category: string; // 费用类别
  expense_date: string; // 费用日期 - 匹配数据库字段
  description?: string; // 备注 - 匹配数据库字段
  attachments?: string[]; // 附件URL数组
  company_id?: number; // 所属公司ID
  company_name?: string; // 所属公司名称
  year?: number; // 年度
  payer_id?: number; // 支付人ID - 匹配数据库字段
  payer_name?: string; // 支付人姓名 - 匹配数据库字段
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: number;
  category_name: string;
  description?: string;
  sort_order: number;
  status: 1 | 0;
  created_at: string;
  updated_at: string;
}

// API返回类型
export interface ListResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OperationResult {
  success: boolean;
  message: string;
}

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export interface ContractStatistics {
  total_sales: number;
  total_profit: number;
  total_expense?: number; // 新增字段：合同相关费用总和
  total_uncredited_amount?: number; // 新增字段：未挂账金额
  contract_count: number;
  year: number;
}

export interface ContractProfitDetail {
  contract_amount: number;
  total_purchase_amount: number;
  total_expense_amount: number;
  total_profit: number;
}

// 公司相关接口
export const getCompanyList = async (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 1 | 0;
}) => {
  if (supabase) {
    const result = await getCompanyListSupabase(data);
    if (result.success) {
      return {
        data: {
          list: result.data,
          total: result.total
        }
      };
    }
    throw new Error(result.message || "获取公司列表失败");
  }
  return http.request<ListResult<Company>>("get", "/company/list", {
    params: data
  });
};

// 获取所有公司列表（无分页）
export const getAllCompanies = async (status?: 1 | 0) => {
  if (supabase) {
    const result = await getAllCompaniesSupabase();
    if (result.success) {
      return { data: result.data };
    }
    throw new Error(result.message || "获取所有公司失败");
  }
  return http.request<{ data: Company[] }>("get", "/company/all", {
    params: { status }
  });
};

export const addCompany = async (
  data: Omit<Company, "id" | "created_at" | "updated_at">
) => {
  if (supabase) {
    const result = await addCompanySupabase(data);
    if (result.success) {
      return { data: result };
    }
    throw new Error(result.message || "添加公司失败");
  }
  return http.request<OperationResult>("post", "/company/add", { data });
};

export const updateCompany = async (data: Company) => {
  if (supabase) {
    const result = await updateCompanySupabase(data);
    if (result.success) {
      return { data: result };
    }
    throw new Error(result.message || "更新公司失败");
  }
  return http.request<OperationResult>("put", "/company/update", { data });
};

export const deleteCompany = async (id: number) => {
  if (supabase) {
    const result = await deleteCompanySupabase(id);
    if (result.success) {
      return { data: result };
    }
    throw new Error(result.message || "删除公司失败");
  }
  return http.request<OperationResult>("delete", `/company/delete/${id}`);
};

// 合同相关接口
export const getContractList = async (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  company_id?: number;
  contract_year?: number;
  status?: 1 | 0;
}) => {
  if (supabase) {
    try {
      const result = await getContractListSupabase(data);
      if (result.success) {
        return {
          data: {
            list: result.data,
            total: result.total
          }
        };
      }
      console.warn(
        "[Supabase] 获取合同列表失败，回退 HTTP 接口：",
        result.message
      );
    } catch (error) {
      console.warn("[Supabase] 获取合同列表异常，回退 HTTP 接口：", error);
    }
  }
  return http
    .request<
      ApiResponse<ListResult<Contract>>
    >("get", "/contract/list", { params: data })
    .then(res => res.data);
};

export const addContract = async (
  data: Omit<Contract, "id" | "created_at" | "updated_at">
) => {
  if (supabase) {
    // 转换数据格式以匹配 Supabase 函数参数
    const supabaseData = {
      company_id: data.company_id,
      contract_name: data.contract_name,
      contract_amount: data.contract_amount,
      contract_year: data.contract_year, // 使用前端传递的年度
      contract_date: data.contract_date, // 添加签订日期字段
      remark: data.remark,
      status: data.status,
      created_by: data.created_by
    };
    const result = await addContractSupabase(supabaseData);
    if (result.success) {
      return {
        success: true,
        message: result.message || "添加合同成功",
        data: result.data
      };
    }
    throw new Error(result.message || "添加合同失败");
  }
  return http.request<OperationResult>("post", "/contract/add", { data });
};

export const updateContract = async (data: Contract) => {
  if (supabase) {
    const result = await updateContractSupabase(data);
    if (result.success) {
      return {
        success: true,
        message: result.message || "更新合同成功",
        data: result.data
      };
    }
    throw new Error(result.message || "更新合同失败");
  }
  return http.request<OperationResult>("put", "/contract/update", { data });
};

export const deleteContract = async (id: number) => {
  if (supabase) {
    const result = await deleteContractSupabase(id);
    if (result.success) {
      return {
        success: true,
        message: result.message || "删除合同成功",
        data: result
      };
    }
    throw new Error(result.message || "删除合同失败");
  }
  return http.request<OperationResult>("delete", `/contract/delete/${id}`);
};

export const getContractDetail = async (id: number) => {
  if (supabase) {
    try {
      const result = await getContractDetailSupabase(id);
      if (result.success && result.data) {
        // 🚀 性能优化：转换数据结构以兼容现有前端代码
        const contractData = result.data;
        return {
          data: {
            contract: {
              id: contractData.id,
              contract_name: contractData.contract_name,
              company_id: contractData.company_id,
              company_name: contractData.company_name,
              contract_amount: contractData.contract_amount,
              contract_year: contractData.contract_year,
              contract_date: contractData.contract_date,
              // attachment_url: contractData.attachment_url, // contracts表没有attachment_url列，已移除到contract_attachments表
              remark: contractData.remark,
              status: contractData.status,
              created_by: contractData.created_by,
              created_at: contractData.created_at,
              updated_at: contractData.updated_at
            },
            details: contractData.contract_details || [],
            expenses: contractData.expenses || [],
            profit: {
              contract_amount: contractData.contract_amount,
              total_purchase_amount: contractData.total_purchase_amount || 0,
              total_expense_amount: contractData.total_expense_amount || 0,
              total_profit: contractData.profit || 0
            }
          }
        };
      }
      console.warn(
        "[Supabase] 获取合同详情失败，回退 HTTP 接口：",
        result.message
      );
    } catch (error) {
      console.warn("[Supabase] 获取合同详情异常，回退 HTTP 接口：", error);
    }
  }
  return http.request<{
    contract: Contract;
    details: ContractDetail[];
    expenses: Expense[];
    profit: ContractProfitDetail;
  }>("get", `/contract/detail/${id}`);
};

export const getContractStatistics = async (
  year?: number,
  company_id?: number
) => {
  if (supabase) {
    try {
      const result = await getContractStatisticsSupabase(year, company_id);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.warn("[Supabase] 获取合同统计失败，回退 HTTP 接口：", error);
    }
  }
  return http
    .request<ApiResponse<ContractStatistics>>("get", "/contract/statistics", {
      params: { year, company_id }
    })
    .then(res => res.data);
};

// 批量获取多个公司的统计数据（性能优化）
export const getBatchContractStatistics = (
  year: number,
  companyIds: number[]
) => {
  if (supabase) {
    // Supabase实现：使用in查询一次性获取多个公司的统计数据
    return getBatchContractStatisticsSupabase(year, companyIds)
      .then(result => ({
        success: true,
        data: result
      }))
      .catch(error => {
        console.warn(
          "[Supabase] 批量获取合同统计失败，回退 HTTP 接口：",
          error
        );
        // 如果 Supabase 失败，回退到原来的 Promise.all 方案
        const promises = companyIds.map(companyId =>
          getContractStatistics(year, companyId)
        );
        return Promise.all(promises).then(results => ({
          success: true,
          data: results.map(result => {
            if (result && typeof result === "object" && "data" in result) {
              return (result as any).data;
            }
            return result;
          })
        }));
      });
  }

  // Mock实现：并行请求多个公司的统计数据
  const promises = companyIds.map(companyId =>
    getContractStatistics(year, companyId)
  );

  return Promise.all(promises).then(results => ({
    success: true,
    data: results.map(result => {
      // 处理返回数据的类型一致性
      if (result && typeof result === "object" && "data" in result) {
        return (result as any).data;
      }
      return result;
    })
  }));
};

// 合同明细相关接口
export const addContractDetail = (
  data: Omit<ContractDetail, "id" | "created_at" | "updated_at">
) => {
  if (supabase) return addContractDetailSupabase(data);
  return http.request<OperationResult>("post", "/contract-detail/add", {
    data
  });
};

export const updateContractDetail = (data: ContractDetail) => {
  if (supabase) return updateContractDetailSupabase(data);
  return http.request<OperationResult>("put", "/contract-detail/update", {
    data
  });
};

export const deleteContractDetail = (id: number) => {
  if (supabase) return deleteContractDetailSupabase(id);
  return http.request<OperationResult>(
    "delete",
    `/contract-detail/delete/${id}`
  );
};

// 费用相关接口
export const addExpense = (data: any) => {
  if (supabase) return addExpenseSupabase(data);
  return http.request<OperationResult>("post", "/expense/add", { data });
};

export const updateExpense = (data: any) => {
  if (supabase) return updateExpenseSupabase(data);
  return http.request<OperationResult>("put", "/expense/update", { data });
};

export const deleteExpense = (id: number) => {
  if (supabase) return deleteExpenseSupabase(id);
  return http.request<OperationResult>("delete", `/expense/delete/${id}`);
};

// 产品相关接口
import {
  getProductList as getProductListFromProduct,
  addProduct as addProductToProduct,
  updateProduct as updateProductInProduct,
  type Product as ExistingProduct
} from "./product";

export const getProductList = getProductListFromProduct;

export const addProduct = (data: {
  name: string;
  specification: string;
  unit: string;
  price: number;
  supplier: string;
  taxType: "含税" | "普票" | "不含" | "";
  remark: string;
}) => {
  return addProductToProduct(data);
};

export const updateProduct = (data: {
  id: number;
  name: string;
  specification: string;
  unit: string;
  price: number;
  supplier: string;
  taxType: "含税" | "普票" | "不含" | "";
  remark: string;
  createTime: string;
}) => {
  return updateProductInProduct(data as ExistingProduct);
};

// 费用类别相关接口
export const getExpenseCategories = (status?: 1 | 0) => {
  if (supabase) {
    return getExpenseCategoriesSupabase(status).catch(error => {
      console.warn("[Supabase] 获取费用类别失败，回退 HTTP 接口：", error);
      return http.request<ExpenseCategory[]>(
        "get",
        "/expense-categories/list",
        {
          params: { status }
        }
      );
    });
  }
  return http.request<ExpenseCategory[]>("get", "/expense-categories/list", {
    params: { status }
  });
};

export const addExpenseCategory = (data: any) => {
  if (supabase) return addExpenseCategorySupabase(data);
  return http.request<OperationResult>("post", "/expense-categories/add", {
    data
  });
};

export const updateExpenseCategory = (data: any) => {
  if (supabase) return updateExpenseCategorySupabase(data);
  return http.request<OperationResult>("put", "/expense-categories/update", {
    data
  });
};

// 文件上传接口
export const uploadContractFile = async (file: File, contract_id?: number) => {
  if (supabase) {
    const result = await uploadFileToSupabase(file, "contracts", "pdfs");
    if (result.success && result.filePath && result.fileUrl) {
      return {
        url: result.fileUrl,
        filename: result.filePath.split("/").pop() || file.name,
        size: file.size
      };
    } else {
      throw new Error(result.error || "文件上传失败");
    }
  }

  const formData = new FormData();
  formData.append("file", file);
  if (contract_id) {
    formData.append("contract_id", contract_id.toString());
  }

  return http.request<{
    url: string;
    filename: string;
    size: number;
  }>("post", "/contract/upload", {
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

// 重新导出类型
export type { ProductMatchResult };

// 一键选择产品相关接口

/**
 * 获取所有公司的合同明细数据（用于一键选择产品）
 * 聚合所有合同明细，按产品名称+规格型号+单位+备注分组，每个组保留最低进价且唯一的供应商
 * 使用缓存优化性能，30分钟内重复调用会直接返回缓存数据
 */
export const getAllContractDetails = (forceRefresh: boolean = false) => {
  if (supabase) {
    // 使用缓存版本
    return import("@/utils/contractDetailsCache").then(
      ({ getCachedAllContractDetails }) => {
        return getCachedAllContractDetails(forceRefresh);
      }
    );
  }

  // Mock实现 - 可以在这里添加mock数据
  return Promise.resolve({
    success: true,
    data: []
  });
};

/**
 * 一键选择产品：从产品管理模块获取所有可用的产品数据
 * 包括：产品列表 + 合同明细 + 询价明细
 */
export const oneClickProductSelection = async (inquiryId: number) => {
  if (supabase) {
    try {
      // 导入产品选择模块
      const { getProductSelectionData } =
        await import("@/api/productSelection");

      // 获取询价单明细，用于智能匹配
      const inquiryDetailResult = await import("@/api/inquiry").then(module =>
        module.getInquiryDetail(inquiryId)
      );

      if (!inquiryDetailResult.success || !inquiryDetailResult.data) {
        throw new Error("获取询价单明细失败");
      }

      const inquiryItems = inquiryDetailResult.data.items || [];

      // 获取产品选择数据
      const selectionResult = await getProductSelectionData();

      if (!selectionResult.success || !selectionResult.data) {
        throw new Error("获取产品数据失败");
      }

      const productItems = selectionResult.data.items;
      const inquiryItemsForMatching = inquiryItems.map(item => ({
        ...item,
        product_name: item.name || "", // 修复字段名：询价明细项使用的是name字段
        specification: item.specification || "",
        unit: item.unit || "",
        quantity: item.quantity || 0,
        unit_price: item.unitPrice || item.purchasePrice || 0
      }));

      // 🎯 统计实际需要更新的产品（进价和卖价都为0，与前端逻辑保持一致）
      const itemsNeedingUpdate = inquiryItemsForMatching.filter(
        item =>
          parseFloat(item.unit_price || "0") <= 0 &&
          parseFloat((item as any).sale_price || item.salePrice || "0") <= 0
      );

      console.log(
        `📊 需要更新的产品统计：总计 ${inquiryItemsForMatching.length} 个产品，需要更新 ${itemsNeedingUpdate.length} 个`
      );

      // 🔧 修复：只对需要更新的产品执行智能匹配算法
      const matchedResults = performIntelligentMatching(
        productItems,
        itemsNeedingUpdate
      );

      // 📊 重新统计实际匹配成功的产品（基于匹配结果中的有效价格和供应商）
      const actuallyMatched = matchedResults.results.filter(
        result =>
          result.productId && result.purchasePrice > 0 && result.supplier
      );

      console.log(
        "🔍 [oneClickProductSelection] 实际匹配详情:",
        actuallyMatched.map(m => ({
          id: m.inquiryItemId,
          productId: m.productId,
          source: m.source,
          price: m.purchasePrice,
          supplier: m.supplier
        }))
      );

      // 🔧 修复：正确计算未匹配数量
      // 找出被成功匹配的询价明细ID
      const matchedInquiryItemIds = actuallyMatched.map(
        result => result.inquiryItemId
      );
      // 从需要更新的产品中，减去被成功匹配的产品
      const actuallyUnmatched = itemsNeedingUpdate.filter(
        item => !matchedInquiryItemIds.includes(item.id)
      ).length;

      console.log(
        `🎯 一键选择产品完成：需要更新 ${itemsNeedingUpdate.length} 个产品，成功匹配 ${actuallyMatched.length} 个，未匹配 ${actuallyUnmatched} 个`
      );

      return {
        success: true,
        data: {
          totalItems: inquiryItemsForMatching.length,
          matchedItems: actuallyMatched.length,
          unmatchedItems: actuallyUnmatched,
          results: matchedResults.results
        }
      };
    } catch (error) {
      console.error("一键选择产品失败:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "一键选择产品失败"
      };
    }
  }

  // Mock实现
  return Promise.resolve({
    success: true,
    data: {
      totalItems: 0,
      matchedItems: 0,
      unmatchedItems: 0,
      results: []
    }
  });
};

/**
 * 智能匹配算法：将产品数据与询价单明细进行匹配
 */
export function performIntelligentMatching(
  productItems: any[],
  inquiryItems: any[]
) {
  let matchedCount = 0;
  const results: any[] = [];

  // 为每个询价明细项目匹配最合适的产品
  for (const inquiryItem of inquiryItems) {
    let bestMatch: any = null;
    let bestScore = 0;

    for (const product of productItems) {
      const score = calculateMatchScore(product, inquiryItem);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          inquiryItemId: inquiryItem.id,
          inquiryItemProductName: inquiryItem.product_name,
          inquiryItemSpecification: inquiryItem.specification,
          inquiryItemUnit: inquiryItem.unit,
          inquiryItemQuantity: inquiryItem.quantity,
          productId: product.source_id,
          productName: product.name,
          productSpecification: product.specification,
          productUnit: product.unit,
          purchasePrice: product.purchase_price,
          salePrice: product.sale_price || 0,
          supplier: product.supplier,
          taxType: product.tax_type,
          source: product.source,
          matchScore: score
        };
      }
    }

    if (bestMatch && bestScore > 0.3) {
      // 匹配阈值
      results.push(bestMatch);
      matchedCount++;
    } else {
      // 创建未匹配的记录
      results.push({
        inquiryItemId: inquiryItem.id,
        inquiryItemProductName: inquiryItem.product_name,
        inquiryItemSpecification: inquiryItem.specification,
        inquiryItemUnit: inquiryItem.unit,
        inquiryItemQuantity: inquiryItem.quantity,
        productId: null,
        productName: "",
        productSpecification: "",
        productUnit: "",
        purchasePrice: 0,
        salePrice: 0,
        supplier: "",
        taxType: "不含税",
        source: "未匹配",
        matchScore: 0
      });
    }
  }

  return {
    matchedItems: matchedCount,
    unmatchedItems: inquiryItems.length - matchedCount,
    results
  };
}

/**
 * 计算匹配分数
 */
export function calculateMatchScore(product: any, inquiryItem: any): number {
  let score = 0;

  // 产品名称匹配（权重最高）
  if (product.name && inquiryItem.product_name) {
    const productName = product.name.toLowerCase().trim();
    const inquiryProductName = inquiryItem.product_name.toLowerCase().trim();

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

// 合同附件相关接口

// 获取合同附件列表
export const getContractAttachments = async (contractId: number) => {
  if (supabase) {
    const result = await getContractAttachmentsSupabase(contractId);
    if (result.success) {
      return {
        data: result.data
      };
    }
    throw new Error(result.message || "获取合同附件列表失败");
  }
  return http.request<ContractAttachment[]>(
    "get",
    `/contract-attachments/list/${contractId}`
  );
};

// 添加合同附件
export const addContractAttachment = async (data: {
  contract_id: number;
  attachment_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_by: number;
}) => {
  if (supabase) {
    const result = await addContractAttachmentSupabase(data);
    if (result.success) {
      return {
        success: true,
        message: result.message || "添加合同附件成功",
        data: result.data
      };
    }
    throw new Error(result.message || "添加合同附件失败");
  }
  return http.request<OperationResult>("post", "/contract-attachments/add", {
    data
  });
};

// 删除合同附件
export const deleteContractAttachment = async (id: number) => {
  if (supabase) {
    const result = await deleteContractAttachmentSupabase(id);
    if (result.success) {
      return {
        success: true,
        message: result.message || "删除合同附件成功",
        data: result
      };
    }
    throw new Error(result.message || "删除合同附件失败");
  }
  return http.request<OperationResult>(
    "delete",
    `/contract-attachments/delete/${id}`
  );
};

// 合同附件上传接口（整合文件上传和附件记录）
export const uploadContractAttachment = async (
  file: File,
  contractId: number,
  uploadedBy: number
) => {
  if (supabase) {
    try {
      // 1. 上传文件到 Supabase Storage
      const uploadResult = await uploadFileToSupabase(
        file,
        "contracts",
        "attachments"
      );

      if (!uploadResult.success || !uploadResult.fileUrl) {
        throw new Error(uploadResult.error || "文件上传失败");
      }

      // 2. 创建附件记录
      const attachmentData = {
        contract_id: contractId,
        attachment_type: "purchase", // 符合数据库约束：'purchase' 或 'sale'
        file_name: file.name,
        file_url: uploadResult.fileUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: uploadedBy
      };

      const attachmentResult =
        await addContractAttachmentSupabase(attachmentData);

      if (!attachmentResult.success) {
        throw new Error(attachmentResult.message || "附件记录创建失败");
      }

      return {
        success: true,
        message: "合同附件上传成功",
        data: {
          url: uploadResult.fileUrl,
          filename: file.name,
          size: file.size,
          attachment: attachmentResult.data
        }
      };
    } catch (error) {
      console.error("合同附件上传失败:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "合同附件上传失败"
      };
    }
  }

  // Mock 实现
  const formData = new FormData();
  formData.append("file", file);
  formData.append("contract_id", contractId.toString());
  formData.append("uploaded_by", uploadedBy.toString());

  return http.request<{
    url: string;
    filename: string;
    size: number;
    attachment: ContractAttachment;
  }>("post", "/contract-attachments/upload", {
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};
