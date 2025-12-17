import { http } from "@/utils/http";
import { supabase } from "@/services/supabase";
import {
  getExpenseListSupabase,
  addExpenseSupabase,
  updateExpenseSupabase,
  deleteExpenseSupabase,
  batchDeleteExpenseSupabase,
  getExpenseCategoriesSupabase,
  addExpenseCategorySupabase,
  updateExpenseCategorySupabase,
  deleteExpenseCategorySupabase,
  getExpenseStatisticsSupabase
} from "@/repositories/expenseSupabase";
import { getAllCompaniesSupabase } from "@/repositories/businessSupabase";
import { getUserList } from "@/repositories/userSupabase";

/** 公司类型定义 */
export type Company = {
  id: number;
  company_name: string;
  company_code?: string;
  contact_person?: string;
  contact_phone?: string;
  address?: string;
  status: 1 | 0;
  created_at: string;
  updated_at: string;
};

/** 公司列表返回类型 */
export type CompanyListResult = {
  success: boolean;
  message: string;
  data: Company[];
};

/** 费用类型定义 */
export type Expense = {
  id: number;
  title: string; // 费用名称
  amount: number; // 费用金额
  category: string; // 费用类别
  expenseDate: string; // 费用日期
  /** 兼容数据库字段 */
  expense_date?: string;
  year?: number; // 年度
  description?: string; // 备注
  attachments?: string[]; // 附件URL数组
  companyId?: number; // 所属公司ID
  companyName?: string; // 所属公司名称
  company_id?: number;
  company_name?: string;
  contractId?: number; // 关联合同ID
  contractName?: string; // 关联合同名称
  contract_id?: number;
  payerId?: number; // 支付人ID
  payerName?: string; // 支付人姓名
  payer_id?: number;
  payer_name?: string;
  createTime: string; // 创建时间
  updateTime: string; // 更新时间
  created_at?: string;
  updated_at?: string;
};

/** 费用类别类型定义 */
export type ExpenseCategory = {
  id: number;
  name: string; // 类别名称
  description?: string; // 类别描述
  color?: string; // 类别颜色
  icon?: string; // 类别图标
  createTime: string; // 创建时间
  updateTime: string; // 更新时间
  created_at?: string;
  updated_at?: string;
};

/** 费用列表返回类型 */
export type ExpenseListResult = {
  success: boolean;
  data: {
    list: Expense[];
    total: number;
  };
};

/** 费用类别列表返回类型 */
export type ExpenseCategoryListResult = {
  success: boolean;
  data: ExpenseCategory[];
};

/** 操作结果返回类型 */
export type OperationResult = {
  success: boolean;
  message: string;
  data?: any;
};

/** 费用统计信息 */
export type ExpenseStatistics = {
  totalAmount: number; // 总费用（保持兼容性）
  totalExpenses: number; // 总费用（包含总公司）
  headquartersTotal: number; // 总公司费用
  categoryStatistics: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number; // 占比
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
  }>;
  currentMonthTotal: number; // 本月总费用
  lastMonthTotal: number; // 上月总费用
  monthOverMonthGrowth: number; // 环比增长率
  companyStatistics: Array<{
    companyId: number;
    companyName: string;
    annualTotal: number; // 年度总费用
    monthlyAverage: number; // 月均费用
  }>;
};

export type ExpenseStatisticsResult = {
  success: boolean;
  data: ExpenseStatistics;
};

/** 获取费用列表 */
export const getExpenseList = (data?: {
  page?: number;
  pageSize?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  companyId?: number;
  payerId?: number;
  year?: number;
}) => {
  if (supabase) return getExpenseListSupabase(data);
  return http.request<ExpenseListResult>("post", "/expense/list", { data });
};

/** 添加费用 */
export const addExpense = (
  data: Omit<Expense, "id" | "createTime" | "updateTime">
) => {
  // 转换公司ID：-1 表示总部，转换为 undefined
  const processedData: any = { ...data };
  if (processedData.companyId === -1) {
    processedData.companyId = undefined;
    processedData.companyName = "总部";
  }

  // 转换公户ID：999999 表示公户，转换为 -1
  if (processedData.payerId === 999999) {
    processedData.payerId = -1; // 数据库中使用-1表示公户
    processedData.payerName = "公户";
  }

  // 字段映射：前端 expenseDate -> 数据库 expense_date
  if (processedData.expenseDate) {
    processedData.expense_date = processedData.expenseDate;
    delete processedData.expenseDate;
  }

  // 字段映射：前端 payerId -> 数据库 payer_id
  if (processedData.payerId !== undefined) {
    processedData.payer_id = processedData.payerId;
    delete processedData.payerId;
  }

  // 字段映射：前端 payerName -> 数据库 payer_name
  if (processedData.payerName) {
    processedData.payer_name = processedData.payerName;
    delete processedData.payerName;
  }

  // 字段映射：前端 companyId -> 数据库 company_id
  if (processedData.companyId !== undefined) {
    processedData.company_id = processedData.companyId;
    delete processedData.companyId;
  }

  // 字段映射：前端 companyName -> 数据库 company_name
  if (processedData.companyName) {
    processedData.company_name = processedData.companyName;
    delete processedData.companyName;
  }

  // 字段映射：前端 contractId -> 数据库 contract_id
  if (processedData.contractId !== undefined) {
    processedData.contract_id = processedData.contractId;
    delete processedData.contractId;
  }

  // 字段映射：前端 createTime -> 数据库 created_at
  if (processedData.createTime) {
    processedData.created_at = processedData.createTime;
    delete processedData.createTime;
  }

  // 字段映射：前端 updateTime -> 数据库 updated_at
  if (processedData.updateTime) {
    processedData.updated_at = processedData.updateTime;
    delete processedData.updateTime;
  }

  if (supabase) return addExpenseSupabase(processedData);
  return http.request<OperationResult>("post", "/expense/add", {
    data: processedData
  });
};

/** 更新费用 */
export const updateExpense = (data: Expense) => {
  // 转换公司ID：-1 表示总部，转换为 undefined
  const processedData: any = { ...data };
  if (processedData.companyId === -1) {
    processedData.companyId = undefined;
    processedData.companyName = "总部";
  }

  // 转换公户ID：999999 表示公户，转换为 -1
  if (processedData.payerId === 999999) {
    processedData.payerId = -1; // 数据库中使用-1表示公户
    processedData.payerName = "公户";
  }

  // 字段映射：前端 expenseDate -> 数据库 expense_date
  if (processedData.expenseDate) {
    processedData.expense_date = processedData.expenseDate;
    delete processedData.expenseDate;
  }

  // 字段映射：前端 payerId -> 数据库 payer_id
  if (processedData.payerId !== undefined) {
    processedData.payer_id = processedData.payerId;
    delete processedData.payerId;
  }

  // 字段映射：前端 payerName -> 数据库 payer_name
  if (processedData.payerName) {
    processedData.payer_name = processedData.payerName;
    delete processedData.payerName;
  }

  // 字段映射：前端 companyId -> 数据库 company_id
  if (processedData.companyId !== undefined) {
    processedData.company_id = processedData.companyId;
    delete processedData.companyId;
  }

  // 字段映射：前端 companyName -> 数据库 company_name
  if (processedData.companyName) {
    processedData.company_name = processedData.companyName;
    delete processedData.companyName;
  }

  // 字段映射：前端 contractId -> 数据库 contract_id
  if (processedData.contractId !== undefined) {
    processedData.contract_id = processedData.contractId;
    delete processedData.contractId;
  }

  // 字段映射：前端 createTime -> 数据库 created_at
  if (processedData.createTime) {
    processedData.created_at = processedData.createTime;
    delete processedData.createTime;
  }

  // 字段映射：前端 updateTime -> 数据库 updated_at
  if (processedData.updateTime) {
    processedData.updated_at = processedData.updateTime;
    delete processedData.updateTime;
  }

  if (supabase) return updateExpenseSupabase(processedData);
  return http.request<OperationResult>("put", "/expense/update", {
    data: processedData
  });
};

/** 删除费用 */
export const deleteExpense = (id: number) => {
  if (supabase) return deleteExpenseSupabase(id);
  return http.request<OperationResult>("delete", `/expense/delete/${id}`);
};

/** 批量删除费用 */
export const batchDeleteExpense = (ids: number[]) => {
  if (supabase) return batchDeleteExpenseSupabase(ids);
  return http.request<OperationResult>("post", "/expense/batch-delete", {
    data: { ids }
  });
};

/** 获取费用类别列表 */
export const getExpenseCategories = () => {
  if (supabase) return getExpenseCategoriesSupabase();
  return http.request<ExpenseCategoryListResult>("get", "/expense/categories");
};

/** 添加费用类别 */
export const addExpenseCategory = (
  data: Omit<ExpenseCategory, "id" | "createTime" | "updateTime">
) => {
  if (supabase) return addExpenseCategorySupabase(data);
  return http.request<OperationResult>("post", "/expense/category/add", {
    data
  });
};

/** 更新费用类别 */
export const updateExpenseCategory = (data: ExpenseCategory) => {
  if (supabase) return updateExpenseCategorySupabase(data);
  return http.request<OperationResult>("put", "/expense/category/update", {
    data
  });
};

/** 删除费用类别 */
export const deleteExpenseCategory = (id: number) => {
  if (supabase) return deleteExpenseCategorySupabase(id);
  return http.request<OperationResult>(
    "delete",
    `/expense/category/delete/${id}`
  );
};

/** 获取费用统计信息 */
export const getExpenseStatistics = (data?: {
  startDate?: string;
  endDate?: string;
  category?: string;
  companyId?: number;
  year?: number;
}) => {
  if (supabase) return getExpenseStatisticsSupabase(data);
  return http.request<ExpenseStatisticsResult>("post", "/expense/statistics", {
    data
  });
};

/** 获取所有公司列表 */
export const getCompanies = () => {
  if (supabase) return getAllCompaniesSupabase(1); // 只获取启用的公司
  return http.request<CompanyListResult>("get", "/companies");
};

/** 获取支付人列表（排除系统管理员） */
export const getPayerList = async () => {
  try {
    // 获取所有用户，然后过滤排除系统管理员
    const result = await getUserList({
      pageSize: 1000 // 获取足够多的用户
    });

    // 过滤掉系统管理员，只返回普通用户
    if (result && result.list) {
      const filteredUsers = result.list.filter(
        user => user.role !== "admin" && user.is_active
      );

      const payerList = filteredUsers.map(user => ({
        id: user.id,
        nickname: user.nickname || user.username,
        username: user.username
      }));

      // 添加公户选项
      payerList.push({
        id: 999999, // 使用特殊大ID标识公户，避免负数绑定问题
        nickname: "公户",
        username: "public_account"
      });

      return {
        success: true,
        data: payerList
      };
    }

    return { success: false, data: [] };
  } catch (error) {
    console.error("获取支付人列表失败:", error);
    return { success: false, data: [] };
  }
};
