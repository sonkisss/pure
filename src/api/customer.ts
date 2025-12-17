import { http } from "@/utils/http";
import { supabase } from "@/services/supabase";
import {
  getCustomerListSupabase,
  addCustomerSupabase,
  updateCustomerSupabase,
  checkCustomerRecordsSupabase,
  deleteCustomerSupabase,
  getCustomerDetailSupabase,
  batchDeleteCustomerSupabase,
  getCustomerStatisticsSupabase,
  getCompanyDebtStatisticsSupabase,
  receivePaymentSupabase,
  getPaymentRecordListSupabase,
  addPaymentRecordSupabase,
  getCreditRecordListSupabase,
  addCreditRecordSupabase,
  updatePaymentRecordSupabase,
  deletePaymentRecordSupabase,
  updateCreditRecordSupabase,
  deleteCreditRecordSupabase
} from "@/repositories/customerSupabase";

/** 付款类型 */
export type PaymentType = "现金" | "承兑";

/** 客户类型定义 */
export type Customer = {
  id: number;
  name: string;
  debt: number; // 客户欠款
  companyId?: number; // 所属公司ID
  companyName?: string; // 所属公司名称
  createTime: string;
};

/** 付款记录类型 */
export type PaymentRecord = {
  id: number;
  customerId: number;
  amount: number; // 付款金额
  paymentTime: string; // 付款时间
  paymentType: PaymentType; // 付款类型
  remark: string; // 备注
  createTime: string;
};

/** 挂账记录类型 */
export type CreditRecord = {
  id: number;
  customerId: number;
  amount: number; // 挂账金额
  creditDate: string; // 挂账日期
  invoiceUrl?: string; // 发票PDF的URL或Base64
  remark: string; // 备注
  createTime: string;
};

/** 客户列表返回类型 */
export type CustomerListResult = {
  success: boolean;
  data: {
    list: Customer[];
    total: number;
  };
};

/** 操作结果返回类型 */
export type OperationResult = {
  success: boolean;
  message: string;
};

/** 获取客户列表 */
export const getCustomerList = (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}) => {
  if (supabase) return getCustomerListSupabase(data);
  return http.request<CustomerListResult>("get", "/customer/list", {
    params: data
  });
};

/** 添加客户 */
export const addCustomer = (data: Omit<Customer, "id" | "createTime">) => {
  if (supabase) return addCustomerSupabase(data);
  return http.request<OperationResult>("post", "/customer/add", { data });
};

/** 检查客户记录 */
export const checkCustomerRecords = (id: number) => {
  if (supabase) return checkCustomerRecordsSupabase(id);
  // Mock fallback - 如果没有Supabase，返回没有记录
  return Promise.resolve({
    hasPayments: false,
    hasCredits: false,
    paymentCount: 0,
    creditCount: 0
  });
};

/** 删除客户 */
export const deleteCustomer = (id: number) => {
  if (supabase) return deleteCustomerSupabase(id);
  return http.request<OperationResult>("delete", `/customer/delete/${id}`);
};

/** 批量删除客户 */
export const batchDeleteCustomer = (ids: number[]) => {
  if (supabase) return batchDeleteCustomerSupabase(ids);
  return http.request<OperationResult>("post", "/customer/batch-delete", {
    data: { ids }
  });
};

/** 更新客户信息 */
export const updateCustomer = (data: Customer) => {
  if (supabase) return updateCustomerSupabase(data);
  return http.request<OperationResult>("put", "/customer/update", { data });
};

/** 收款 - 减少客户欠款 */
export const receivePayment = (data: { id: number; amount: number }) => {
  if (supabase) return receivePaymentSupabase(data);
  return http.request<OperationResult>("post", "/customer/receive-payment", {
    data
  });
};

/** 获取客户统计信息 */
export type CustomerStatisticsResult = {
  success: boolean;
  data: {
    totalCustomers: number; // 客户总数
    debtCustomers: number; // 有欠款客户数
    totalDebt: number; // 总欠款
    zeroDebtCustomers: number; // 无欠款客户数
  };
};

export const getCustomerStatistics = () => {
  if (supabase) return getCustomerStatisticsSupabase();
  return http.request<CustomerStatisticsResult>("get", "/customer/statistics");
};

/** 公司欠款统计类型 */
export type CompanyDebtStatistic = {
  name: string;
  totalDebt: number;
  customers: { name: string; debt: number }[];
};

/** 公司欠款统计结果类型 */
export type CompanyDebtStatisticsResult = {
  success: boolean;
  data: CompanyDebtStatistic[];
  message?: string;
};

/** 获取公司欠款统计 */
export const getCompanyDebtStatistics = () => {
  if (supabase) return getCompanyDebtStatisticsSupabase();
  return http.request<CompanyDebtStatisticsResult>(
    "get",
    "/customer/statistics/company-debt"
  );
};

/** 获取客户详情 */
export type CustomerDetailResult = {
  success: boolean;
  data: Customer;
};

export const getCustomerDetail = (id: number) => {
  if (supabase) return getCustomerDetailSupabase(id);
  return http.request<CustomerDetailResult>("get", `/customer/detail/${id}`);
};

/** 获取客户付款记录列表 */
export type PaymentRecordListResult = {
  success: boolean;
  data: {
    list: PaymentRecord[];
    total: number;
    totalDebt: number; // 总欠款金额
  };
};

export const getPaymentRecordList = (customerId: number) => {
  if (supabase) return getPaymentRecordListSupabase(customerId);
  return http.request<PaymentRecordListResult>(
    "get",
    `/customer/${customerId}/payments`
  );
};

/** 添加付款记录 */
export const addPaymentRecord = (data: {
  customerId: number;
  amount: number;
  paymentTime: string;
  paymentType: PaymentType;
  remark?: string;
}) => {
  if (supabase) return addPaymentRecordSupabase(data);
  return http.request<OperationResult>("post", "/customer/payment/add", {
    data
  });
};

/** 更新付款记录 */
export const updatePaymentRecord = (data: PaymentRecord) => {
  if (supabase) return updatePaymentRecordSupabase(data);
  return http.request<OperationResult>("put", "/customer/payment/update", {
    data
  });
};

/** 删除付款记录 */
export const deletePaymentRecord = (id: number) => {
  if (supabase) return deletePaymentRecordSupabase(id);
  return http.request<OperationResult>(
    "delete",
    `/customer/payment/delete/${id}`
  );
};

/** 获取客户挂账记录列表 */
export type CreditRecordListResult = {
  success: boolean;
  data: {
    list: CreditRecord[];
    total: number;
  };
};

export const getCreditRecordList = (customerId: number) => {
  if (supabase) return getCreditRecordListSupabase(customerId);
  return http.request<CreditRecordListResult>(
    "get",
    `/customer/${customerId}/credits`
  );
};

/** 添加挂账记录 */
export const addCreditRecord = (data: {
  customerId: number;
  amount: number;
  creditDate: string;
  invoicePdfBase64?: string;
  remark?: string;
}) => {
  if (supabase) return addCreditRecordSupabase(data);
  return http.request<OperationResult>("post", "/customer/credit/add", {
    data
  });
};

/** 更新挂账记录 */
export const updateCreditRecord = (data: CreditRecord) => {
  if (supabase) return updateCreditRecordSupabase(data);
  return http.request<OperationResult>("put", "/customer/credit/update", {
    data
  });
};

/** 删除挂账记录 */
export const deleteCreditRecord = (id: number) => {
  if (supabase) return deleteCreditRecordSupabase(id);
  return http.request<OperationResult>(
    "delete",
    `/customer/credit/delete/${id}`
  );
};
