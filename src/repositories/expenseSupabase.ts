import { supabase } from "@/services/supabase";
import { deleteFileFromSupabase } from "@/services/storage";
import type {
  Expense,
  ExpenseCategory,
  ExpenseListResult,
  ExpenseCategoryListResult,
  OperationResult,
  ExpenseStatistics,
  ExpenseStatisticsResult
} from "@/api/expense";

/** 获取费用列表 */
export const getExpenseListSupabase = async (data?: {
  page?: number;
  pageSize?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  companyId?: number;
  payerId?: number;
  year?: number;
}): Promise<ExpenseListResult> => {
  try {
    let query = supabase
      .from("expenses")
      .select(
        `
        id,
        title,
        amount,
        category,
        expense_date,
        year,
        description,
        attachments,
        company_id,
        contract_id,
        payer_id,
        payer_name,
        created_at,
        updated_at,
        contracts!left(contract_name),
        companies!left(company_name)
      `,
        { count: "exact" }
      )
      .order("expense_date", { ascending: false });

    // 筛选条件
    if (data?.category && data.category !== "") {
      query = query.eq("category", data.category);
    }

    if (data?.companyId) {
      if (data.companyId === -1) {
        // 筛选总部费用：company_id为NULL，且company_name为"总部"
        query = query.is("company_id", null).eq("company_name", "总部");
      } else {
        query = query.eq("company_id", data.companyId);
      }
    }

    if (data?.payerId) {
      if (data.payerId === -1 || data.payerId === 999999) {
        // 筛选公户费用：使用in操作符匹配多个payer_id值和payer_name
        query = query.or(
          "payer_id.eq.-1,payer_id.eq.999999,payer_name.eq.公户"
        );
      } else {
        query = query.eq("payer_id", data.payerId);
      }
    }

    if (data?.year) {
      query = query.eq("year", data.year);
    }

    if (data?.startDate) {
      query = query.gte("expense_date", data.startDate);
    }

    if (data?.endDate) {
      query = query.lte("expense_date", data.endDate);
    }

    if (data?.keyword && data.keyword.trim()) {
      query = query.or(
        `title.ilike.%${data.keyword}%,description.ilike.%${data.keyword}%,company_name.ilike.%${data.keyword}%`
      );
    }

    // 分页
    const page = data?.page || 1;
    const pageSize = data?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data: expenses, error, count } = await query;

    if (error) {
      console.error("获取费用列表失败:", error);
      return { success: false, data: { list: [], total: 0 } };
    }

    return {
      success: true,
      data: {
        list: ((expenses as any[]) || []).map(expense => {
          const companiesData = expense.companies;
          const companyName = Array.isArray(companiesData)
            ? companiesData[0]?.company_name
            : companiesData?.company_name;
          const contractData = expense.contracts;
          const contractName = Array.isArray(contractData)
            ? contractData[0]?.contract_name
            : contractData?.contract_name;
          return {
            ...expense,
            companyId: expense.company_id,
            companyName: companyName || expense.company_name || "总部",
            contractId: expense.contract_id,
            // 修复：合同名称在嵌套的 contracts 对象中
            contractName: contractName || "",
            payerId: expense.payer_id === -1 ? 999999 : expense.payer_id,
            payerName:
              expense.payer_name ||
              (expense.payer_id === -1 ? "公户" : "") ||
              "",
            title: expense.title,
            expenseDate: expense.expense_date,
            year: expense.year,
            createTime: expense.created_at,
            updateTime: expense.updated_at
          } as Expense;
        }),
        total: count || 0
      }
    };
  } catch (error) {
    console.error("获取费用列表失败:", error);
    return { success: false, data: { list: [], total: 0 } };
  }
};

const extractAttachmentValue = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const candidate =
      (value as { fileUrl?: unknown; url?: unknown; path?: unknown }).fileUrl ??
      (value as { url?: unknown }).url ??
      (value as { path?: unknown }).path;
    if (typeof candidate === "string") return candidate;
  }
  return null;
};

const normalizeAttachments = (attachments: unknown): string[] => {
  if (!attachments) return [];

  let list: unknown = attachments;
  if (typeof attachments === "string") {
    const trimmed = attachments.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        list = JSON.parse(trimmed);
      } catch (error) {
        console.warn("解析附件JSON失败:", error);
        return [trimmed];
      }
    } else {
      return [trimmed];
    }
  }

  if (Array.isArray(list)) {
    return list
      .map(item => extractAttachmentValue(item))
      .filter((value): value is string => Boolean(value));
  }

  const single = extractAttachmentValue(list);
  return single ? [single] : [];
};

const normalizeOssObjectPath = (value: string): string | null => {
  if (!value || value.startsWith("data:")) return null;

  let path = value;
  try {
    if (value.startsWith("http")) {
      const urlObj = new URL(value);
      path = urlObj.pathname.startsWith("/")
        ? urlObj.pathname.slice(1)
        : urlObj.pathname;
    }
  } catch (error) {
    console.warn("解析附件URL失败:", error);
    path = value;
  }

  if (path.includes("?")) {
    path = path.split("?")[0];
  }

  return path || null;
};

/** 添加费用 */
export const addExpenseSupabase = async (
  expense: Omit<Expense, "id" | "created_at" | "updated_at">
): Promise<OperationResult> => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        expense_date: expense.expense_date,
        year: expense.year,
        description: expense.description,
        attachments: expense.attachments,
        company_id: expense.company_id,
        company_name: expense.company_name,
        contract_id: expense.contract_id, // 添加合同ID支持
        payer_id: expense.payer_id,
        payer_name: expense.payer_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("添加费用失败:", error);
      return { success: false, message: error.message };
    }

    return { success: true, message: "费用添加成功", data };
  } catch (error) {
    console.error("添加费用失败:", error);
    return { success: false, message: "添加费用失败" };
  }
};

/** 更新费用 */
export const updateExpenseSupabase = async (
  expense: Expense
): Promise<OperationResult> => {
  try {
    const { error } = await supabase
      .from("expenses")
      .update({
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        expense_date: expense.expense_date,
        year: expense.year,
        description: expense.description,
        attachments: expense.attachments,
        company_id: expense.company_id,
        company_name: expense.company_name,
        contract_id: expense.contract_id, // 添加合同ID支持
        payer_id: expense.payer_id,
        payer_name: expense.payer_name,
        updated_at: new Date().toISOString()
      })
      .eq("id", expense.id);

    if (error) {
      console.error("更新费用失败:", error);
      return { success: false, message: error.message };
    }

    return { success: true, message: "费用更新成功" };
  } catch (error) {
    console.error("更新费用失败:", error);
    return { success: false, message: "更新费用失败" };
  }
};

/** 删除费用 */
export const deleteExpenseSupabase = async (
  id: number
): Promise<OperationResult> => {
  try {
    const { data: expense, error: fetchError } = await supabase
      .from("expenses")
      .select("attachments")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("获取费用附件失败:", fetchError);
      return { success: false, message: fetchError.message };
    }

    const attachmentUrls = normalizeAttachments(expense?.attachments);
    if (attachmentUrls.length > 0) {
      for (const url of attachmentUrls) {
        const objectPath = normalizeOssObjectPath(url);
        if (!objectPath) continue;
        const deleteResult = await deleteFileFromSupabase(objectPath);
        if (!deleteResult.success) {
          console.error("删除费用附件失败:", deleteResult.error);
          return {
            success: false,
            message: deleteResult.error || "费用附件删除失败"
          };
        }
      }
    }

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      console.error("删除费用失败:", error);
      return { success: false, message: error.message };
    }

    return { success: true, message: "费用删除成功" };
  } catch (error) {
    console.error("删除费用失败:", error);
    return { success: false, message: "删除费用失败" };
  }
};

/** 批量删除费用 */
export const batchDeleteExpenseSupabase = async (
  ids: number[]
): Promise<OperationResult> => {
  try {
    const { data: expenses, error: fetchError } = await supabase
      .from("expenses")
      .select("id,attachments")
      .in("id", ids);

    if (fetchError) {
      console.error("获取批量费用附件失败:", fetchError);
      return { success: false, message: fetchError.message };
    }

    if (expenses && expenses.length > 0) {
      for (const expense of expenses) {
        const attachmentUrls = normalizeAttachments(
          (expense as { attachments?: unknown }).attachments
        );
        for (const url of attachmentUrls) {
          const objectPath = normalizeOssObjectPath(url);
          if (!objectPath) continue;
          const deleteResult = await deleteFileFromSupabase(objectPath);
          if (!deleteResult.success) {
            console.error("批量删除费用附件失败:", deleteResult.error);
            return {
              success: false,
              message: deleteResult.error || "费用附件删除失败"
            };
          }
        }
      }
    }

    const { error } = await supabase.from("expenses").delete().in("id", ids);

    if (error) {
      console.error("批量删除费用失败:", error);
      return { success: false, message: error.message };
    }

    return { success: true, message: "批量删除费用成功" };
  } catch (error) {
    console.error("批量删除费用失败:", error);
    return { success: false, message: "批量删除费用失败" };
  }
};

/** 获取费用类别列表 */
export const getExpenseCategoriesSupabase = async (
  _status?: 1 | 0
): Promise<ExpenseCategoryListResult> => {
  try {
    let query = supabase.from("expense_categories").select("*");

    // 注意：当前数据库表结构中没有status字段，所以暂时不进行状态筛选
    // 如果将来需要状态筛选，需要先添加status字段到数据库表中

    // 按name排序
    query = query.order("name", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("获取费用类别失败:", error);
      return { success: false, data: [] };
    }

    console.log("📋 Supabase费用类别查询结果:", data);
    return { success: true, data: (data || []) as ExpenseCategory[] };
  } catch (error) {
    console.error("获取费用类别失败:", error);
    return { success: false, data: [] };
  }
};

/** 添加费用类别 */
export const addExpenseCategorySupabase = async (
  category: Omit<ExpenseCategory, "id" | "createTime" | "updateTime">
): Promise<OperationResult> => {
  console.log(
    "🔥 后端: addExpenseCategorySupabase 被调用, category:",
    category
  );

  try {
    // 首先检查是否已存在同名类别
    console.log("🔍 检查同名类别:", category.name);
    const { data: existingCategory, error: checkError } = await supabase
      .from("expense_categories")
      .select("id, name")
      .eq("name", category.name)
      .single();

    console.log("📊 检查结果:", { existingCategory, checkError });

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 是没有找到记录的错误码
      console.error("💥 检查费用类别失败:", checkError);
      return {
        success: false,
        message: "检查费用类别失败: " + checkError.message
      };
    }

    // 如果已存在同名类别，直接返回成功（幂等操作）
    if (existingCategory) {
      console.log("ℹ️ 费用类别已存在:", category.name);
      return {
        success: true,
        message: "费用类别已存在",
        data: existingCategory
      };
    }

    // 插入新类别
    console.log("🚀 插入新类别到数据库");
    const { data, error } = await supabase
      .from("expense_categories")
      .insert({
        ...category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    console.log("📤 插入结果:", { data, error });

    if (error) {
      console.error("💥 添加费用类别失败:", error);
      return { success: false, message: error.message };
    }

    console.log("✅ 费用类别创建成功:", data);
    return { success: true, message: "费用类别添加成功", data };
  } catch (error) {
    console.error("💥 添加费用类别异常:", error);
    return { success: false, message: "添加费用类别失败" };
  }
};

/** 更新费用类别 */
export const updateExpenseCategorySupabase = async (
  category: ExpenseCategory
): Promise<OperationResult> => {
  try {
    // 1. 获取旧的类别信息
    const { data: oldCategory, error: fetchError } = await supabase
      .from("expense_categories")
      .select("name")
      .eq("id", category.id)
      .single();

    if (fetchError || !oldCategory) {
      return { success: false, message: "费用类别不存在" };
    }

    // 2. 如果名称发生了变化，需要同步更新所有使用该类别的费用记录
    if (oldCategory.name !== category.name) {
      console.log(
        `🔄 检测到类别名称变更: "${oldCategory.name}" -> "${category.name}"，开始同步更新费用记录...`
      );

      const { error: updateExpensesError } = await supabase
        .from("expenses")
        .update({ category: category.name })
        .eq("category", oldCategory.name);

      if (updateExpensesError) {
        console.error("同步更新费用记录失败:", updateExpensesError);
        return {
          success: false,
          message: "类别名称更新失败：同步更新关联费用时出错"
        };
      }
      console.log("✅ 关联费用记录同步更新完成");
    }

    // 3. 更新类别表本身
    const { error } = await supabase
      .from("expense_categories")
      .update({
        ...category,
        updated_at: new Date().toISOString()
      })
      .eq("id", category.id);

    if (error) {
      console.error("更新费用类别失败:", error);
      return { success: false, message: error.message };
    }

    return { success: true, message: "费用类别更新成功" };
  } catch (error) {
    console.error("更新费用类别失败:", error);
    return { success: false, message: "更新费用类别失败" };
  }
};

/** 删除费用类别 */
export const deleteExpenseCategorySupabase = async (
  id: number
): Promise<OperationResult> => {
  try {
    // 1. 先获取类别名称
    const { data: category, error: fetchError } = await supabase
      .from("expense_categories")
      .select("name")
      .eq("id", id)
      .single();

    if (fetchError || !category) {
      console.error("获取费用类别失败:", fetchError);
      return { success: false, message: "费用类别不存在" };
    }

    // 2. 检查是否有费用使用了这个类别名称
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id")
      .eq("category", category.name)
      .limit(1);

    if (expenses && expenses.length > 0) {
      return {
        success: false,
        message: `无法删除：该类别"${category.name}"下仍有费用记录`
      };
    }

    // 3. 执行删除
    const { error } = await supabase
      .from("expense_categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("删除费用类别失败:", error);
      return { success: false, message: error.message };
    }

    return { success: true, message: "费用类别删除成功" };
  } catch (error) {
    console.error("删除费用类别失败:", error);
    return { success: false, message: "删除费用类别失败" };
  }
};

/** 获取费用统计信息 */
export const getExpenseStatisticsSupabase = async (data?: {
  startDate?: string;
  endDate?: string;
  category?: string;
  companyId?: number;
  year?: number;
}): Promise<ExpenseStatisticsResult> => {
  try {
    // 获取所有公司数据
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, company_name")
      .eq("status", 1);

    if (companiesError) {
      console.error("获取公司列表失败:", companiesError);
      return { success: false, data: {} as ExpenseStatistics };
    }

    // 获取费用数据，包含公司关联
    let query = supabase.from("expenses").select(`
        *,
        companies!left(company_name)
      `);

    if (data?.startDate) {
      query = query.gte("expense_date", data.startDate);
    }

    if (data?.endDate) {
      query = query.lte("expense_date", data.endDate);
    }

    if (data?.category && data.category !== "") {
      query = query.eq("category", data.category);
    }

    if (data?.companyId) {
      if (data.companyId === -1) {
        // 筛选总部费用：company_id为NULL，且company_name为"总部"
        query = query.is("company_id", null).eq("company_name", "总部");
      } else {
        query = query.eq("company_id", data.companyId);
      }
    }

    // 如果指定了年份，只统计该年份的数据
    if (data?.year) {
      query = query.eq("year", data.year);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error("获取费用统计失败:", error);
      return { success: false, data: {} as ExpenseStatistics };
    }

    const expensesList = expenses || [];

    // 计算总费用
    const totalAmount = expensesList.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );

    console.log("💰 费用统计计算:", {
      totalExpensesCount: expensesList.length,
      totalAmount,
      companyId: data?.companyId,
      year: data?.year
    });

    // 获取所有费用类别
    const { data: allCategories, error: categoriesError } = await supabase
      .from("expense_categories")
      .select("name")
      .order("name");

    if (categoriesError) {
      console.error("获取费用类别失败:", categoriesError);
    }

    // 按类别统计
    const categoryMap = new Map<string, { amount: number; count: number }>();

    // 初始化所有类别
    if (allCategories) {
      allCategories.forEach(cat => {
        categoryMap.set(cat.name, { amount: 0, count: 0 });
      });
    }

    expensesList.forEach(expense => {
      // 确保即使类别不在allCategories中也能统计到（例如被删除的类别）
      const current = categoryMap.get(expense.category) || {
        amount: 0,
        count: 0
      };
      categoryMap.set(expense.category, {
        amount: current.amount + Number(expense.amount),
        count: current.count + 1
      });
    });

    const categoryStatistics = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage:
          totalAmount > 0
            ? Number(((data.amount / totalAmount) * 100).toFixed(2))
            : 0
      }))
      .sort((a, b) => b.amount - a.amount); // 按金额降序排序

    // 按月统计趋势
    const monthlyMap = new Map<string, number>();
    expensesList.forEach(expense => {
      const month = expense.expense_date.substring(0, 7); // YYYY-MM
      const current = monthlyMap.get(month) || 0;
      monthlyMap.set(month, current + Number(expense.amount));
    });

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 计算本月和上月数据
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .substring(0, 7);

    const currentMonthTotal = monthlyMap.get(currentMonth) || 0;
    const lastMonthTotal = monthlyMap.get(lastMonth) || 0;
    const monthOverMonthGrowth =
      lastMonthTotal > 0
        ? Number(
            (
              ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) *
              100
            ).toFixed(2)
          )
        : 0;

    // 按公司统计 - 初始化所有公司
    const companyMap = new Map<
      number,
      { companyName: string; amount: number; count: number }
    >();

    // 先从公司列表初始化所有公司
    (companies || []).forEach(company => {
      companyMap.set(company.id, {
        companyName: company.company_name,
        amount: 0,
        count: 0
      });
    });

    // 然后统计费用数据
    expensesList.forEach(expense => {
      if (expense.company_id && expense.company_id > 0) {
        const current = companyMap.get(expense.company_id) || {
          companyName: expense.company_name || "未知公司",
          amount: 0,
          count: 0
        };

        // 确保使用最新的公司名称（如果已初始化）
        const companyName = companyMap.has(expense.company_id)
          ? companyMap.get(expense.company_id)!.companyName
          : expense.company_name || "未知公司";

        companyMap.set(expense.company_id, {
          companyName: companyName,
          amount: current.amount + Number(expense.amount),
          count: current.count + 1
        });
      }
    });

    const _currentYear = new Date().getFullYear();

    // 计算总公司费用（company_id为null或0或-1的费用）
    const headquartersExpenses = expensesList.filter(
      e => !e.company_id || e.company_id === 0 || e.company_id === -1
    );
    const headquartersTotal = headquartersExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );

    // 计算各子公司费用
    const companyStatistics = Array.from(companyMap.entries())
      .map(([companyId, data]) => {
        // 计算该公司的月均费用
        const companyExpenses = expensesList.filter(
          e => e.company_id === companyId
        );
        const monthsWithExpenses = new Set(
          companyExpenses.map(e => e.expense_date.substring(0, 7))
        ).size;
        const monthlyAverage =
          monthsWithExpenses > 0 ? data.amount / monthsWithExpenses : 0;

        return {
          companyId,
          companyName: data.companyName,
          annualTotal: data.amount,
          monthlyAverage: Number(monthlyAverage.toFixed(2))
        };
      })
      .sort((a, b) => b.annualTotal - a.annualTotal);

    return {
      success: true,
      data: {
        totalExpenses: totalAmount, // 总费用（包含总公司）
        totalAmount, // 保持兼容性
        headquartersTotal, // 总公司费用
        categoryStatistics,
        monthlyTrend,
        currentMonthTotal,
        lastMonthTotal,
        monthOverMonthGrowth,
        companyStatistics
      }
    };
  } catch (error) {
    console.error("获取费用统计失败:", error);
    return { success: false, data: {} as ExpenseStatistics };
  }
};
