import { http } from "@/utils/http";
import { supabase } from "@/services/supabase";

// 动态导入Supabase函数
async function getSupabaseFunctions() {
  return await import("@/repositories/supplierSupabase");
}
import {
  getSupplierListSupabase,
  addSupplierSupabase,
  updateSupplierSupabase,
  deleteSupplierSupabase,
  getSupplierDetailSupabase,
  getSupplierStatisticsSupabase,
  getSupplierDebtsSupabase,
  addSupplierDebtSupabase,
  updateSupplierDebtSupabase,
  deleteSupplierDebtSupabase,
  getSupplierPaymentListSupabase,
  addSupplierPaymentSupabase,
  updateSupplierPaymentSupabase,
  deleteSupplierPaymentSupabase,
  uploadDebtExcelSupabase,
  getDebtExcelItemsSupabase,
  exportDebtsExcelSupabase
} from "@/repositories/supplierSupabase";
// uploadSupplierVoucherSupabase 现在通过动态导入获取

/** 供应商类型定义 */
export type Supplier = {
  id: number;
  name: string;
  totalPayable: number; // 总应付款
  createTime: string;
};

/** 供应商欠款明细类型定义 */
export type SupplierDebt = {
  id: number;
  supplierId: number;
  amount: number; // 欠款金额
  description: string; // 欠款描述
  debtDate?: string; // 欠款日期
  excelUrl?: string; // Excel文件URL
  imageUrl?: string; // 图片URL
  hasExcelData: boolean; // 是否有Excel数据
  excelItemCount: number; // Excel明细条数
  createTime: string;
  updateTime: string;
};

/** Excel产品明细数据类型 */
export type ExcelProductItem = {
  id: number;
  debtId: number; // 关联的欠款ID
  productName: string; // 产品名称
  productModel: string; // 产品型号
  quantity: number; // 数量
  unit: string; // 单位
  unitPrice: number; // 单价
  amount: number; // 金额
  hasTax: boolean; // 是否含税
  createTime: string;
};

/** 付款类型 */
export type PaymentType = "现金" | "承兑";

/** 供应商付款记录类型定义 */
export type SupplierPayment = {
  id: number;
  supplierId: number;
  amount: number; // 付款金额
  paymentDate: string; // 付款日期
  paymentType: PaymentType; // 付款类型
  voucher?: string; // 付款凭证（图片URL或Base64）
  remark?: string; // 备注
  createTime: string;
  updateTime: string;
};

/** 供应商列表返回类型 */
export type SupplierListResult = {
  success: boolean;
  data: {
    list: Supplier[];
    total: number;
  };
};

/** 供应商详情返回类型 */
export type SupplierDetailResult = {
  success: boolean;
  data: Supplier;
};

/** 欠款明细列表返回类型 */
export type DebtListResult = {
  success: boolean;
  data: {
    list: SupplierDebt[];
    total: number;
  };
};

/** 付款记录列表返回类型 */
export type PaymentListResult = {
  success: boolean;
  data: {
    list: SupplierPayment[];
    total: number;
    totalDebt: number; // 总欠款
    totalPaid: number; // 总已付
  };
};

/** 操作结果返回类型 */
export type OperationResult = {
  success: boolean;
  message: string;
  data?: any;
};

/** 供应商统计信息 */
export type SupplierStatisticsResult = {
  success: boolean;
  data: {
    totalSuppliers: number; // 供应商总数
    totalPayable: number; // 总应付款
    paidCount: number; // 已付款笔数
    unpaidCount: number; // 未付款笔数
  };
};

// ==================== 供应商相关接口 ====================

/** 获取供应商列表 */
export const getSupplierList = (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}) => {
  if (supabase) return getSupplierListSupabase(data);
  return http.request<SupplierListResult>("get", "/supplier/list", {
    params: data
  });
};

/** 添加供应商 */
export const addSupplier = (data: Omit<Supplier, "id" | "createTime">) => {
  if (supabase) return addSupplierSupabase(data);
  return http.request<OperationResult>("post", "/supplier/add", { data });
};

/** 删除供应商 */
export const deleteSupplier = (id: number) => {
  if (supabase) return deleteSupplierSupabase(id);
  return http.request<OperationResult>("delete", `/supplier/delete/${id}`);
};

/** 批量删除供应商 */
export const batchDeleteSupplier = (ids: number[]) => {
  return http.request<OperationResult>("post", "/supplier/batch-delete", {
    data: { ids }
  });
};

/** 更新供应商信息 */
export const updateSupplier = (data: Supplier) => {
  if (supabase) return updateSupplierSupabase(data);
  return http.request<OperationResult>("put", "/supplier/update", { data });
};

/** 获取供应商详情 */
export const getSupplierDetail = (id: number) => {
  if (supabase) return getSupplierDetailSupabase(id);
  return http.request<SupplierDetailResult>("get", `/supplier/detail/${id}`);
};

/** 获取供应商统计信息 */
export const getSupplierStatistics = () => {
  if (supabase) return getSupplierStatisticsSupabase();
  return http.request<SupplierStatisticsResult>("get", "/supplier/statistics");
};

// ==================== 欠款明细相关接口 ====================

/** 获取供应商的欠款明细列表 */
export const getSupplierDebts = (
  supplierId: number,
  data?: { page?: number; pageSize?: number }
) => {
  if (supabase) return getSupplierDebtsSupabase(supplierId, data);
  return http.request<DebtListResult>("get", `/supplier/${supplierId}/debts`, {
    params: data
  });
};

/** 添加欠款 */
export const addSupplierDebt = (
  supplierId: number,
  data: {
    amount: number;
    description: string;
    debtDate: string; // 欠款日期
    imageBase64?: string; // 图片Base64字符串
  }
) => {
  if (supabase) return addSupplierDebtSupabase(supplierId, data);
  return http.request<OperationResult>(
    "post",
    `/supplier/${supplierId}/debt/add`,
    { data }
  );
};

/** 修改欠款 */
export const updateSupplierDebt = (
  debtId: number,
  data: {
    amount?: number;
    description?: string;
    debtDate?: string; // 欠款日期
    imageBase64?: string; // 图片Base64字符串
  }
) => {
  if (supabase) return updateSupplierDebtSupabase(debtId, data);
  return http.request<OperationResult>(
    "put",
    `/supplier/debt/update/${debtId}`,
    { data }
  );
};

/** 删除欠款明细 */
export const deleteSupplierDebt = (debtId: number) => {
  if (supabase) return deleteSupplierDebtSupabase(debtId);
  return http.request<OperationResult>(
    "delete",
    `/supplier/debt/delete/${debtId}`
  );
};

// ==================== 付款记录相关接口 ====================

/** 获取供应商付款记录列表 */
export const getSupplierPaymentList = (
  supplierId: number,
  data?: { page?: number; pageSize?: number }
) => {
  if (supabase) return getSupplierPaymentListSupabase(supplierId, data);
  return http.request<PaymentListResult>(
    "get",
    `/supplier/${supplierId}/payments`,
    { data }
  );
};

/** 添加付款记录 */
export const addSupplierPayment = (data: {
  supplierId: number;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  voucher?: string;
  remark?: string;
}) => {
  if (supabase) return addSupplierPaymentSupabase(data);
  return http.request<OperationResult>("post", "/supplier/payment/add", {
    data
  });
};

/** 修改付款记录 */
export const updateSupplierPayment = (data: SupplierPayment) => {
  if (supabase) return updateSupplierPaymentSupabase(data);
  return http.request<OperationResult>("put", "/supplier/payment/update", {
    data
  });
};

/** 删除付款记录 */
export const deleteSupplierPayment = (id: number) => {
  if (supabase) return deleteSupplierPaymentSupabase(id);
  return http.request<OperationResult>(
    "delete",
    `/supplier/payment/delete/${id}`
  );
};

// ==================== Excel产品明细相关接口 ====================

/** 上传Excel并解析产品明细 */
export const uploadDebtExcel = (
  debtId: number,
  items: Array<{
    productName: string;
    productModel: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
    hasTax: boolean;
  }>
) => {
  if (supabase) return uploadDebtExcelSupabase(debtId, items) as any;
  return http.request<{
    success: boolean;
    message: string;
    data: { items: ExcelProductItem[]; totalAmount: number };
  }>("post", `/supplier/debt/${debtId}/excel`, { data: { items } });
};

/** 获取欠款单的Excel产品明细 */
export const getDebtExcelItems = (debtId: number) => {
  if (supabase) return getDebtExcelItemsSupabase(debtId) as any;
  return http.request<{ success: boolean; data: ExcelProductItem[] }>(
    "get",
    `/supplier/debt/${debtId}/excel-items`
  );
};

/** 批量导出欠款单的Excel明细 */
export const exportDebtsExcel = (debtIds: number[]) => {
  if (supabase) return exportDebtsExcelSupabase(debtIds) as any;
  return http.request<{ success: boolean; data: ExcelProductItem[] }>(
    "post",
    "/supplier/debts/export-excel",
    { data: { debtIds } }
  );
};
/** 上传供应商付款凭证到存储，返回存储路径 */
export const uploadSupplierVoucher = async (supplierId: number, file: File) => {
  if (supabase) {
    const { uploadSupplierVoucherSupabase } = await getSupabaseFunctions();
    return uploadSupplierVoucherSupabase(supplierId, file);
  }
  return http.request<OperationResult>(
    "post",
    `/supplier/${supplierId}/voucher/upload`,
    {
      data: {
        /* mock */
      }
    }
  );
};
