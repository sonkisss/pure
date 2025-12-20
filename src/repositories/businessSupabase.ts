import {
  deleteFileFromSupabase,
  getSignedFileUrl,
  extractOssObjectPath
} from "@/services/storage";
import { supabase } from "@/services/supabase";

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
  contract_name: string;
  contract_amount: number;
  contract_year: number;
  contract_date?: string;
  remark?: string;
  status: 1 | 0;
  created_by: number;
  created_at: string;
  updated_at: string;
  companies?: {
    company_name: string;
  };
}

export interface ContractAttachment {
  id: number;
  contract_id: number;
  attachment_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}

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
  supplier?: string;
  includes_tax: 0 | 1 | 2;
  is_credited?: boolean;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  contract_id: number;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  description?: string;
  payer_id?: number;
  payer_name?: string;
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

export interface OperationResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ContractStatistics {
  total_sales: number;
  total_profit: number;
  total_expense?: number;
  total_uncredited_amount?: number;
  contract_count: number;
  year: number;
}

export interface ProductMatchResult {
  inquiryItemId: number;
  productName: string;
  matchedProductId: number;
  supplier: string;
  purchasePrice: number;
  taxType: string;
  remark: string;
  matchStatus: "unmatched" | "matched" | "not_found";
  notFoundReason?: string;
}

export interface InquiryItem {
  id: number;
  inquiryId: number;
  productId?: number;
  name: string;
  specification: string;
  unit: string;
}

export interface AllContractDetailsItem {
  id: number;
  contract_id: number;
  contract_name: string;
  company_name: string;
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
  remark?: string;
  contract_year: number;
  created_at: string;
  updated_at: string;
}

// 公司相关操作
export const getCompanyListSupabase = async (params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 1 | 0;
}) => {
  try {
    console.log("🔍 开始查询公司列表，参数:", params);

    let query = supabase
      .from("companies")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (params?.keyword) {
      query = query.ilike("company_name", `%${params.keyword}%`);
    }

    if (params?.status !== undefined) {
      query = query.eq("status", params.status);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("❌ 公司列表查询失败:", error);
      return {
        success: false,
        message: `查询失败: ${error.message}`,
        data: []
      };
    }

    console.log("✅ 公司列表查询成功，数量:", data?.length || 0);

    return {
      success: true,
      message: "查询成功",
      data: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error("❌ 公司列表查询异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误",
      data: []
    };
  }
};

export const getAllCompaniesSupabase = async (status?: 1 | 0) => {
  try {
    console.log("🔍 开始查询所有公司，状态:", status);

    let query = supabase
      .from("companies")
      .select("id, company_name, created_at")
      .order("company_name", { ascending: true });

    if (status !== undefined) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ 所有公司查询失败:", error);
      return {
        success: false,
        message: `查询失败: ${error.message}`,
        data: []
      };
    }

    console.log("✅ 所有公司查询成功，数量:", data?.length || 0);

    return {
      success: true,
      message: "查询成功",
      data: data || []
    };
  } catch (error) {
    console.error("❌ 所有公司查询异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误",
      data: []
    };
  }
};

export const addCompanySupabase = async (
  data: Omit<Company, "id" | "created_at" | "updated_at">
) => {
  try {
    console.log("➕ 开始添加公司:", data);

    const { data: result, error } = await supabase
      .from("companies")
      .insert({
        company_name: data.company_name,
        company_code: data.company_code,
        contact_person: data.contact_person,
        contact_phone: data.contact_phone,
        address: data.address,
        status: data.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("❌ 公司添加失败:", error);
      return {
        success: false,
        message: `添加失败: ${error.message}`
      };
    }

    console.log("✅ 公司添加成功:", result);

    return {
      success: true,
      message: "添加成功",
      data: result
    };
  } catch (error) {
    console.error("❌ 公司添加异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

export const updateCompanySupabase = async (data: Company) => {
  try {
    console.log("📝 开始更新公司:", data);

    const { data: result, error } = await supabase
      .from("companies")
      .update({
        company_name: data.company_name,
        company_code: data.company_code,
        contact_person: data.contact_person,
        contact_phone: data.contact_phone,
        address: data.address,
        status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("❌ 公司更新失败:", error);
      return {
        success: false,
        message: `更新失败: ${error.message}`
      };
    }

    console.log("✅ 公司更新成功:", result);

    return {
      success: true,
      message: "更新成功",
      data: result
    };
  } catch (error) {
    console.error("❌ 公司更新异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

export const deleteCompanySupabase = async (id: number) => {
  try {
    console.log("🗑️ 开始删除公司，ID:", id);

    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      console.error("❌ 公司删除失败:", error);
      return {
        success: false,
        message: `删除失败: ${error.message}`
      };
    }

    console.log("✅ 公司删除成功");

    return {
      success: true,
      message: "删除成功"
    };
  } catch (error) {
    console.error("❌ 公司删除异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

// 合同相关操作

export const getContractListSupabase = async (params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  company_id?: number;
  contract_year?: number;
  status?: 1 | 0;
}) => {
  try {
    console.log("🔍 开始查询合同列表，参数:", params);

    let query = supabase
      .from("contracts")
      .select(
        `
        id,
        company_id,
        contract_name,
        contract_amount,
        contract_year,
        contract_date,
        remark,
        status,
        created_at,
        companies!inner(company_name)
      `,
        { count: "exact" }
      )
      .order("contract_year", { ascending: false })
      .order("contract_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    // 应用过滤条件
    if (params?.company_id) {
      query = query.eq("company_id", params.company_id);
    }

    if (params?.contract_year) {
      query = query.eq("contract_year", params.contract_year.toString());
    }

    if (params?.status !== undefined) {
      query = query.eq("status", params.status);
    }

    if (params?.keyword) {
      query = query.ilike("contract_name", `%${params.keyword}%`);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("❌ 合同列表查询失败:", JSON.stringify(error, null, 2));
      return {
        success: false,
        message: `查询失败: ${error.message} (Hint: ${error.hint || "None"})`,
        data: []
      };
    }

    // 扁平化数据结构，将嵌套的companies.company_name转换为直接的company_name属性
    const flattenedData = (data || []).map((contract: any) => ({
      ...contract,
      company_name: contract.companies?.company_name || ""
    }));

    return {
      success: true,
      message: "查询成功",
      data: flattenedData,
      total: count || 0
    };
  } catch (error) {
    console.error("❌ 合同列表查询异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误",
      data: []
    };
  }
};

export const addContractSupabase = async (
  data: Omit<Contract, "id" | "created_at" | "updated_at">
) => {
  try {
    const { data: result, error } = await supabase
      .from("contracts")
      .insert({
        company_id: data.company_id,
        contract_name: data.contract_name,
        contract_amount: data.contract_amount,
        contract_year: data.contract_year,
        contract_date: data.contract_date,
        remark: data.remark,
        status: data.status,
        created_by: data.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("❌ 合同添加失败:", error);
      return {
        success: false,
        message: `添加失败: ${error.message}`
      };
    }

    return {
      success: true,
      message: "添加成功",
      data: result
    };
  } catch (error) {
    console.error("❌ 合同添加异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

export const updateContractSupabase = async (data: Contract) => {
  try {
    console.log("📝 开始更新合同:", data);

    const { data: result, error } = await supabase
      .from("contracts")
      .update({
        company_id: data.company_id,
        contract_name: data.contract_name,
        contract_amount: data.contract_amount,
        contract_year: data.contract_year,
        contract_date: data.contract_date,
        remark: data.remark,
        status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("❌ 合同更新失败:", error);
      return {
        success: false,
        message: `更新失败: ${error.message}`
      };
    }

    console.log("✅ 合同更新成功:", result);

    return {
      success: true,
      message: "更新成功",
      data: result
    };
  } catch (error) {
    console.error("❌ 合同更新异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

export const deleteContractSupabase = async (id: number) => {
  try {
    console.log("🗑️ 开始删除合同，ID:", id);

    // 删除合同附件文件与记录
    const { data: attachments, error: attachmentsError } = await supabase
      .from("contract_attachments")
      .select("id,file_url")
      .eq("contract_id", id);
    if (attachmentsError) {
      console.warn("获取合同附件失败:", attachmentsError);
    } else if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const rawUrl = attachment.file_url || "";
        let objectPath = "";
        if (rawUrl) {
          try {
            if (rawUrl.startsWith("http")) {
              const urlObj = new URL(rawUrl);
              objectPath = urlObj.pathname.startsWith("/")
                ? urlObj.pathname.slice(1)
                : urlObj.pathname;
            } else {
              objectPath = rawUrl;
            }
            if (objectPath.includes("?")) {
              objectPath = objectPath.split("?")[0];
            }
          } catch {
            objectPath = rawUrl.split("?")[0];
          }
        }

        if (objectPath) {
          const deleteResult = await deleteFileFromSupabase(objectPath);
          if (!deleteResult.success) {
            return {
              success: false,
              message: deleteResult.error || "删除合同附件文件失败"
            };
          }
        }
      }

      const { error: deleteAttachmentRowsError } = await supabase
        .from("contract_attachments")
        .delete()
        .eq("contract_id", id);
      if (deleteAttachmentRowsError) {
        return {
          success: false,
          message: deleteAttachmentRowsError.message
        };
      }
    }

    // 首先检查是否存在相关的合同明细或费用
    const [detailsCount, expensesCount] = await Promise.all([
      supabase
        .from("contract_details")
        .select("id", { count: "exact" })
        .eq("contract_id", id),
      supabase
        .from("expenses")
        .select("id", { count: "exact" })
        .eq("contract_id", id)
    ]);

    if (detailsCount.count && detailsCount.count > 0) {
      return {
        success: false,
        message: "无法删除：该合同下还有产品明细，请先删除所有明细"
      };
    }

    if (expensesCount.count && expensesCount.count > 0) {
      return {
        success: false,
        message: "无法删除：该合同下还有费用记录，请先删除所有费用"
      };
    }

    // 执行删除操作
    const { error } = await supabase.from("contracts").delete().eq("id", id);

    if (error) {
      console.error("❌ 合同删除失败:", error);
      return {
        success: false,
        message: `删除失败: ${error.message}`
      };
    }

    console.log("✅ 合同删除成功");

    return {
      success: true,
      message: "删除成功"
    };
  } catch (error) {
    console.error("❌ 合同删除异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

// 🚀 性能优化：合同详情查询 - 使用并行查询和字段优化
export const getContractDetailSupabase = async (id: number) => {
  console.log("🚀 [性能优化] 开始合同详情查询，ID:", id);
  const startTime = performance.now();

  try {
    // 🚀 性能优化1: 使用并行查询替代串行查询
    const [contractRes, detailsRes, expensesRes] = await Promise.all([
      // 只选择必要的合同字段
      supabase
        .from("contracts")
        .select(
          "id, contract_name, company_id, contract_amount, contract_year, contract_date, remark, status, created_by, created_at, updated_at, companies!inner(company_name)"
        )
        .eq("id", id)
        .single(),

      // 只选择必要的明细字段，按ID排序
      supabase
        .from("contract_details")
        .select(
          "id, contract_id, product_name, spec_model, unit, quantity, purchase_price, purchase_amount, sale_price, sale_amount, supplier, includes_tax, is_credited, remark, created_at, updated_at"
        )
        .eq("contract_id", id)
        .order("id", { ascending: true }),

      // 只选择必要的费用字段，按付款日期倒序
      supabase
        .from("expenses")
        .select(
          "id, contract_id, title, amount, category, expense_date, description, payer_id, payer_name, created_at, updated_at"
        )
        .eq("contract_id", id)
        .order("expense_date", { ascending: false })
    ]);

    // 检查查询错误
    if (contractRes.error) {
      console.error("合同查询失败:", contractRes.error);
      throw new Error(`合同查询失败: ${contractRes.error.message}`);
    }

    // 🚀 性能优化2: 计算汇总数据
    const details = detailsRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    // 计算财务汇总
    const contractAmount = Number(contractRes.data.contract_amount ?? 0);
    const totalPurchaseAmount = details.reduce(
      (sum, d) => sum + Number(d.purchase_amount ?? 0),
      0
    );
    const totalExpenseAmount = expenses.reduce(
      (sum, e) => sum + Number(e.amount ?? 0),
      0
    );
    const totalProfit =
      contractAmount - totalPurchaseAmount - totalExpenseAmount;

    // 构建最终数据结构，扁平化公司名称字段
    const contractData = {
      ...(contractRes.data as any),
      company_name: (contractRes.data as any).companies?.company_name ?? "", // 扁平化公司名称
      contract_details: details,
      expenses: expenses.map((expense: any) => ({
        id: expense.id,
        contract_id: expense.contract_id,
        title: expense.title, // 保持字段名一致: title
        amount: expense.amount,
        category: expense.category,
        expense_date: expense.expense_date, // 保持字段名一致: expense_date
        description: expense.description, // 保持字段名一致: description
        payer_id: expense.payer_id, // 添加支付人ID
        payer_name: expense.payer_name, // 添加支付人姓名
        created_at: expense.created_at,
        updated_at: expense.updated_at
      })),
      total_purchase_amount: totalPurchaseAmount,
      total_expense_amount: totalExpenseAmount,
      profit: totalProfit
    };

    const endTime = performance.now();
    console.log(
      `🚀 [性能优化] 合同详情查询完成，耗时: ${(endTime - startTime).toFixed(2)}ms`
    );
    console.log(
      `📊 数据统计: 明细${details.length}条, 费用${expenses.length}条`
    );

    return {
      success: true,
      data: contractData,
      performance: {
        duration: endTime - startTime,
        detailsCount: details.length,
        expensesCount: expenses.length
      }
    };
  } catch (error) {
    console.error("❌ 合同详情查询失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误",
      error: error
    };
  }
};

// 合同统计

export const getContractStatisticsSupabase = async (
  year?: number,
  company_id?: number
): Promise<ContractStatistics> => {
  try {
    const normalizeSaleAmount = (detail: any) => {
      // 兼容历史数据：sale_amount 可能为 null，使用数量*卖价回填
      const amount =
        detail?.sale_amount ??
        (detail?.quantity && detail?.sale_price
          ? detail.quantity * detail.sale_price
          : 0);
      return Number(amount) || 0;
    };

    console.log("📊 开始查询合同统计，年度:", year, "公司ID:", company_id);

    let query = supabase
      .from("contracts")
      .select(
        `
        id,
        contract_amount, 
        contract_year,
        company_id,
        contract_details (
          purchase_amount,
          sale_amount,
          includes_tax,
          is_credited
        ),
        expenses (
          amount
        )
      `
      )
      .eq("status", 1);

    if (year && company_id) {
      query = query
        .eq("contract_year", year.toString())
        .eq("company_id", company_id);
    } else if (year) {
      query = query.eq("contract_year", year.toString());
    } else if (company_id) {
      query = query.eq("company_id", company_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ 合同统计查询失败:", error);
      throw new Error(`统计查询失败: ${error.message}`);
    }

    const contracts = data || [];
    let total_sales = 0;
    let total_purchase = 0;
    let total_expense = 0;
    let total_estimated_tax = 0;
    let total_uncredited_amount = 0;

    contracts.forEach((contract: any) => {
      // 累加销售额
      total_sales += Number(contract.contract_amount || 0);

      // 累加进货成本和计算含税进货总额
      let contract_taxable_purchase = 0;
      if (
        contract.contract_details &&
        Array.isArray(contract.contract_details)
      ) {
        contract.contract_details.forEach((detail: any) => {
          total_purchase += Number(detail.purchase_amount || 0);
          if (detail.includes_tax === 1) {
            contract_taxable_purchase += Number(detail.purchase_amount || 0);
          }

          // 统计未挂账金额（按销售金额计算）
          if (!detail.is_credited) {
            total_uncredited_amount += normalizeSaleAmount(detail);
          }
        });
      }

      // 累加费用
      if (contract.expenses && Array.isArray(contract.expenses)) {
        contract.expenses.forEach((expense: any) => {
          total_expense += Number(expense.amount || 0);
        });
      }

      // 计算该合同的预估缴税
      // 1. 计算应纳税额（销项 - 进项）
      const salesAmount = Number(contract.contract_amount || 0);
      const taxableAmount = Math.max(
        0,
        salesAmount - contract_taxable_purchase
      );

      // 2. 增值税（13%）公式：÷ (1 + 13%) × 13%
      const vat = (taxableAmount / 1.13) * 0.13;

      // 3. 附加税费
      const urbanConstructionTax = (vat * 0.07) / 2; // 城建税 7%减半征收
      const educationFee = (vat * 0.03) / 2; // 教育费附加 3%减半征收
      const localEducationFee = (vat * 0.02) / 2; // 地方教育附加 2%减半征收

      // 4. 印花税（按销售收入的万分之三计算，减半征收）
      const stampTax = (salesAmount * 0.0003) / 2;

      // 5. 水利建设基金（按增值税的1%计算，减半征收）
      const waterConstructionFund = (vat * 0.01) / 2;

      // 6. 总税额
      const totalTax =
        vat +
        urbanConstructionTax +
        educationFee +
        localEducationFee +
        stampTax +
        waterConstructionFund;

      total_estimated_tax += totalTax;
    });

    // 计算实际利润 (销售 - 进货 - 费用 - 预估缴税)
    const total_profit =
      total_sales - total_purchase - total_expense - total_estimated_tax;

    const result: ContractStatistics = {
      total_sales,
      total_profit,
      total_expense, // 返回合同费用总和
      total_uncredited_amount,
      contract_count: contracts.length,
      year: year || new Date().getFullYear()
    };

    console.log(
      "✅ 合同统计查询成功，合同数量:",
      contracts.length,
      "总销售额:",
      total_sales
    );

    return result;
  } catch (error) {
    console.error("❌ 合同统计查询异常:", error);
    throw error;
  }
};

// 批量合同统计
export const getBatchContractStatisticsSupabase = async (
  year: number,
  companyIds: number[]
) => {
  try {
    const normalizeSaleAmount = (detail: any) => {
      const amount =
        detail?.sale_amount ??
        (detail?.quantity && detail?.sale_price
          ? detail.quantity * detail.sale_price
          : 0);
      return Number(amount) || 0;
    };

    console.log(
      "📊 开始批量查询合同统计，年度:",
      year,
      "公司数量:",
      companyIds.length
    );

    const { data, error } = await supabase
      .from("contracts")
      .select(
        `
        company_id, 
        contract_amount,
        contract_details (
          purchase_amount,
          sale_amount,
          includes_tax,
          is_credited
        ),
        expenses (
          amount
        )
      `
      )
      .eq("status", 1)
      .eq("contract_year", year.toString())
      .in("company_id", companyIds);

    if (error) {
      console.error("❌ 批量合同统计查询失败:", error);
      throw new Error(`批量统计查询失败: ${error.message}`);
    }

    // 按公司分组统计
    const statistics = new Map<number, ContractStatistics>();

    companyIds.forEach(companyId => {
      statistics.set(companyId, {
        total_sales: 0,
        total_profit: 0,
        total_uncredited_amount: 0,
        contract_count: 0,
        year
      });
    });

    (data || []).forEach((contract: any) => {
      const stats = statistics.get(contract.company_id);
      if (stats) {
        // 累加销售额
        stats.total_sales += Number(contract.contract_amount || 0);

        // 计算该合同的进货成本和含税进货总额
        let contract_purchase = 0;
        let contract_taxable_purchase = 0;
        let contract_uncredited = 0;
        if (
          contract.contract_details &&
          Array.isArray(contract.contract_details)
        ) {
          contract.contract_details.forEach((detail: any) => {
            contract_purchase += Number(detail.purchase_amount || 0);
            if (detail.includes_tax === 1) {
              contract_taxable_purchase += Number(detail.purchase_amount || 0);
            }

            if (!detail.is_credited) {
              contract_uncredited += normalizeSaleAmount(detail);
            }
          });
        }

        // 计算该合同的费用
        let contract_expense = 0;
        if (contract.expenses && Array.isArray(contract.expenses)) {
          contract.expenses.forEach((expense: any) => {
            contract_expense += Number(expense.amount || 0);
          });
        }

        // 计算该合同的预估缴税
        // 1. 计算应纳税额（销项 - 进项）
        const salesAmount = Number(contract.contract_amount || 0);
        const taxableAmount = Math.max(
          0,
          salesAmount - contract_taxable_purchase
        );

        // 2. 增值税（13%）公式：÷ (1 + 13%) × 13%
        const vat = (taxableAmount / 1.13) * 0.13;

        // 3. 附加税费
        const urbanConstructionTax = (vat * 0.07) / 2; // 城建税 7%减半征收
        const educationFee = (vat * 0.03) / 2; // 教育费附加 3%减半征收
        const localEducationFee = (vat * 0.02) / 2; // 地方教育附加 2%减半征收

        // 4. 印花税（按销售收入的万分之三计算，减半征收）
        const stampTax = (salesAmount * 0.0003) / 2;

        // 5. 水利建设基金（按增值税的1%计算，减半征收）
        const waterConstructionFund = (vat * 0.01) / 2;

        // 6. 总税额
        const totalTax =
          vat +
          urbanConstructionTax +
          educationFee +
          localEducationFee +
          stampTax +
          waterConstructionFund;

        // 累加到总利润 (销售 - 进货 - 费用 - 预估缴税)
        // 注意：这里我们直接累加利润，而不是最后再减，因为数据是按合同来的
        stats.total_profit +=
          Number(contract.contract_amount || 0) -
          contract_purchase -
          contract_expense -
          totalTax;

        stats.total_uncredited_amount =
          (stats.total_uncredited_amount || 0) + contract_uncredited;

        stats.contract_count += 1;
      }
    });

    console.log("✅ 批量合同统计查询成功");

    return Array.from(statistics.values());
  } catch (error) {
    console.error("❌ 批量合同统计查询异常:", error);
    throw error;
  }
};

// 合同明细相关操作
export const addContractDetailSupabase = async (
  data: Omit<ContractDetail, "id" | "created_at" | "updated_at">
) => {
  try {
    console.log("➕ 开始添加合同明细:", data);

    const { data: result, error } = await supabase
      .from("contract_details")
      .insert({
        contract_id: data.contract_id,
        product_name: data.product_name,
        spec_model: data.spec_model,
        unit: data.unit,
        quantity: data.quantity,
        purchase_price: data.purchase_price,
        purchase_amount: data.purchase_amount,
        sale_price: data.sale_price,
        sale_amount: data.sale_amount,
        supplier: data.supplier,
        includes_tax: data.includes_tax,
        is_credited: data.is_credited ?? false,
        remark: data.remark,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("❌ 合同明细添加失败:", error);
      return {
        success: false,
        message: `添加失败: ${error.message}`
      };
    }

    console.log("✅ 合同明细添加成功:", result);

    return {
      success: true,
      message: "添加成功",
      data: result
    };
  } catch (error) {
    console.error("❌ 合同明细添加异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

export const updateContractDetailSupabase = async (data: ContractDetail) => {
  try {
    console.log("📝 开始更新合同明细:", data);

    const { data: result, error } = await supabase
      .from("contract_details")
      .update({
        contract_id: data.contract_id,
        product_name: data.product_name,
        spec_model: data.spec_model,
        unit: data.unit,
        quantity: data.quantity,
        purchase_price: data.purchase_price,
        purchase_amount: data.purchase_amount,
        sale_price: data.sale_price,
        sale_amount: data.sale_amount,
        supplier: data.supplier,
        includes_tax: data.includes_tax,
        is_credited: data.is_credited ?? false,
        remark: data.remark,
        updated_at: new Date().toISOString()
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("❌ 合同明细更新失败:", error);
      return {
        success: false,
        message: `更新失败: ${error.message}`
      };
    }

    console.log("✅ 合同明细更新成功:", result);

    return {
      success: true,
      message: "更新成功",
      data: result
    };
  } catch (error) {
    console.error("❌ 合同明细更新异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

export const deleteContractDetailSupabase = async (id: number) => {
  try {
    console.log("🗑️ 开始删除合同明细，ID:", id);

    const { error } = await supabase
      .from("contract_details")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ 合同明细删除失败:", error);
      return {
        success: false,
        message: `删除失败: ${error.message}`
      };
    }

    console.log("✅ 合同明细删除成功");

    return {
      success: true,
      message: "删除成功"
    };
  } catch (error) {
    console.error("❌ 合同明细删除异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

// 费用相关操作
export const addExpenseSupabase = async (
  data: Omit<Expense, "id" | "created_at" | "updated_at">
) => {
  try {
    console.log("➕ 开始添加费用:", data);

    const { data: result, error } = await supabase
      .from("expenses")
      .insert({
        contract_id: data.contract_id,
        title: data.title,
        amount: data.amount,
        expense_date: data.expense_date,
        description: data.description,
        payer_id: data.payer_id,
        payer_name: data.payer_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("❌ 费用添加失败:", error);
      return {
        success: false,
        message: `添加失败: ${error.message}`
      };
    }

    console.log("✅ 费用添加成功:", result);

    return {
      success: true,
      message: "添加成功",
      data: result
    };
  } catch (error) {
    console.error("❌ 费用添加异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

export const updateExpenseSupabase = async (data: Expense) => {
  try {
    console.log("📝 开始更新费用:", data);

    const { data: result, error } = await supabase
      .from("expenses")
      .update({
        contract_id: data.contract_id,
        title: data.title,
        amount: data.amount,
        expense_date: data.expense_date,
        description: data.description,
        payer_id: data.payer_id,
        payer_name: data.payer_name,
        updated_at: new Date().toISOString()
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      console.error("❌ 费用更新失败:", error);
      return {
        success: false,
        message: `更新失败: ${error.message}`
      };
    }

    console.log("✅ 费用更新成功:", result);

    return {
      success: true,
      message: "更新成功",
      data: result
    };
  } catch (error) {
    console.error("❌ 费用更新异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

// 注意：费用相关函数已迁移到 expenseSupabase.ts
// deleteExpenseSupabase 和 getExpenseCategoriesSupabase 请使用 expenseSupabase.ts 中的实现

// 获取所有合同明细（用于一键选择产品功能）
export const getAllContractDetailsSupabase = async () => {
  try {
    console.log("🔍 开始查询所有合同明细（缓存优化）");

    const { data, error } = await supabase.from("contract_details").select(`
        id,
        contract_id,
        product_name,
        spec_model,
        unit,
        quantity,
        purchase_price,
        purchase_amount,
        sale_price,
        sale_amount,
        is_credited,
        supplier,
        includes_tax,
        remark,
        created_at,
        updated_at,
        contracts!inner(
          contract_name,
          contract_year,
          company_id,
          companies!inner(company_name)
        )
      `);

    if (error) {
      console.error("❌ 所有合同明细查询失败:", error);
      return {
        success: false,
        message: `查询失败: ${error.message}`,
        data: []
      };
    }

    // 处理数据格式
    const processedData: AllContractDetailsItem[] = (data || []).map(
      (item: any) => ({
        id: item.id,
        contract_id: item.contract_id,
        contract_name: item.contracts?.contract_name || "",
        company_name: item.contracts?.companies?.company_name || "",
        product_name: item.product_name || "",
        spec_model: item.spec_model || "",
        unit: item.unit || "",
        quantity: item.quantity || 0,
        purchase_price: item.purchase_price || 0,
        purchase_amount: item.purchase_amount || 0,
        sale_price: item.sale_price || 0,
        sale_amount: item.sale_amount || 0,
        is_credited: Boolean(item.is_credited),
        supplier: item.supplier || "",
        includes_tax: item.includes_tax || 0,
        remark: item.remark || "",
        contract_year:
          item.contracts?.contract_year || new Date().getFullYear(),
        created_at: item.created_at,
        updated_at: item.updated_at
      })
    );

    console.log("✅ 所有合同明细查询成功，数量:", processedData.length);

    return {
      success: true,
      message: "查询成功",
      data: processedData
    };
  } catch (error) {
    console.error("❌ 所有合同明细查询异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误",
      data: []
    };
  }
};

// 获取产品匹配结果（优化的版本）
export const getProductMatchResultsSupabase = async (
  inquiryItems: InquiryItem[]
): Promise<{
  success: boolean;
  data: ProductMatchResult[];
  message?: string;
}> => {
  try {
    console.log("🔍 开始产品匹配，询价项目数量:", inquiryItems.length);

    const results: ProductMatchResult[] = [];

    for (const item of inquiryItems) {
      try {
        // 查询匹配的产品（只查找进价=0和卖价=0的产品）
        const { data: matchedProducts, error } = await supabase
          .from("contract_details")
          .select(
            "id, product_name, spec_model, unit, quantity, purchase_price, supplier"
          )
          .eq("product_name", item.name)
          .eq("spec_model", item.specification)
          .eq("unit", item.unit)
          .eq("purchase_price", 0)
          .eq("sale_price", 0)
          .limit(1);

        if (error) {
          console.error(`匹配失败 ${item.name}:`, error);
          results.push({
            inquiryItemId: item.id,
            productName: item.name,
            matchedProductId: 0,
            supplier: "",
            purchasePrice: 0,
            taxType: "",
            remark: "",
            matchStatus: "not_found",
            notFoundReason: error.message
          });
          continue;
        }

        if (matchedProducts && matchedProducts.length > 0) {
          const product = matchedProducts[0];
          results.push({
            inquiryItemId: item.id,
            productName: item.name,
            matchedProductId: product.id,
            supplier: product.supplier || "",
            purchasePrice: Number(product.purchase_price || 0),
            taxType: "",
            remark: "",
            matchStatus: "matched"
          });
          console.log(`✅ 匹配成功: ${item.name} -> ${product.supplier}`);
        } else {
          results.push({
            inquiryItemId: item.id,
            productName: item.name,
            matchedProductId: 0,
            supplier: "",
            purchasePrice: 0,
            taxType: "",
            remark: "",
            matchStatus: "not_found",
            notFoundReason: "未找到符合条件的匹配产品（进价=0且卖价=0）"
          });
          console.log(`❌ 未找到匹配: ${item.name}`);
        }
      } catch (itemError) {
        results.push({
          inquiryItemId: item.id,
          productName: item.name,
          matchedProductId: 0,
          supplier: "",
          purchasePrice: 0,
          taxType: "",
          remark: "",
          matchStatus: "not_found",
          notFoundReason:
            itemError instanceof Error ? itemError.message : "未知错误"
        });
      }
    }

    const matchedCount = results.filter(
      r => r.matchStatus === "matched"
    ).length;
    console.log(
      `🎯 匹配完成: ${matchedCount}/${inquiryItems.length} 个产品匹配成功`
    );

    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error("❌ 产品匹配查询失败:", error);
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

// 更新询价项目匹配状态
export const updateInquiryItemMatchStatusSupabase = async (
  inquiryItemId: number,
  matchResult: ProductMatchResult
) => {
  try {
    console.log(
      "📝 开始更新询价项目匹配状态，ID:",
      inquiryItemId,
      "结果:",
      matchResult
    );

    const updateData: any = {
      match_status: matchResult.matchStatus,
      updated_at: new Date().toISOString()
    };

    // 如果匹配成功，更新相关字段
    if (matchResult.matchStatus === "matched") {
      updateData.matched_product_id = matchResult.matchedProductId;
      updateData.unit_price = matchResult.purchasePrice;
      updateData.remark = matchResult.remark;
      updateData.supplier = matchResult.supplier; // 保存供应商信息
      updateData.tax_type = matchResult.taxType; // 保存含税类型
      // 注意：这里不更新sale_price，保持原来的卖价为0（符合用户需求）
    } else {
      updateData.matched_product_id = null;
    }

    const { error } = await supabase
      .from("inquiry_items")
      .update(updateData)
      .eq("id", inquiryItemId);

    if (error) {
      console.error("❌ 询价项目匹配状态更新失败:", error);
      return {
        success: false,
        message: `更新失败: ${error.message}`
      };
    }

    console.log("✅ 询价项目匹配状态更新成功");

    return {
      success: true,
      message: "更新成功"
    };
  } catch (error) {
    console.error("❌ 询价项目匹配状态更新异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

// 合同附件相关函数

// 获取合同附件列表
export const getContractAttachmentsSupabase = async (contractId: number) => {
  try {
    const { data, error } = await supabase
      .from("contract_attachments")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ 合同附件列表查询失败:", error);
      return {
        success: false,
        message: `查询失败: ${error.message}`,
        data: []
      };
    }

    const attachments = data || [];

    // 为私有 OSS 桶生成临时可访问的签名 URL，避免图片/文件无法显示
    const signedAttachments = await Promise.all(
      attachments.map(async att => {
        try {
          const rawUrl = att.file_url || "";
          if (!rawUrl) return att;

          // 只对 OSS 链接签名，保留旧的 Supabase Storage 链接
          if (!rawUrl.includes("aliyuncs.com") && !rawUrl.includes("oss.")) {
            return att;
          }

          // 提取 object path，忽略签名和域名
          const objectPath = extractOssObjectPath(rawUrl.split("?")[0]);
          if (!objectPath) return att;

          const signed = await getSignedFileUrl(objectPath, 3600, {
            inline: true,
            fileName: att.file_name,
            contentType: att.file_type || "application/octet-stream"
          });

          return signed ? { ...att, file_url: signed } : att;
        } catch (err) {
          console.warn("生成合同附件签名URL失败:", err);
          return att;
        }
      })
    );

    return {
      success: true,
      message: "查询成功",
      data: signedAttachments
    };
  } catch (error) {
    console.error("❌ 合同附件列表查询异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误",
      data: []
    };
  }
};

// 添加合同附件
export const addContractAttachmentSupabase = async (
  attachment: Omit<ContractAttachment, "id" | "created_at" | "updated_at">
) => {
  try {
    console.log("📝 开始添加合同附件:", attachment);

    const { data, error } = await supabase
      .from("contract_attachments")
      .insert({
        contract_id: attachment.contract_id,
        attachment_type: attachment.attachment_type,
        file_name: attachment.file_name,
        file_url: attachment.file_url,
        file_size: attachment.file_size,
        file_type: attachment.file_type,
        uploaded_by: attachment.uploaded_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("❌ 合同附件添加失败:", error);
      return {
        success: false,
        message: `添加失败: ${error.message}`
      };
    }

    console.log("✅ 合同附件添加成功:", data);
    return {
      success: true,
      message: "合同附件添加成功",
      data: data
    };
  } catch (error) {
    console.error("❌ 合同附件添加异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};

// 删除合同附件
export const deleteContractAttachmentSupabase = async (id: number) => {
  try {
    console.log("🗑️ 开始删除合同附件，ID:", id);

    const { data: attachment, error: fetchError } = await supabase
      .from("contract_attachments")
      .select("file_url")
      .eq("id", id)
      .single();
    if (fetchError) {
      console.error("❌ 合同附件获取失败:", fetchError);
      return {
        success: false,
        message: `删除失败: ${fetchError.message}`
      };
    }

    const rawUrl = attachment?.file_url || "";
    let objectPath = "";
    if (rawUrl) {
      try {
        if (rawUrl.startsWith("http")) {
          const urlObj = new URL(rawUrl);
          objectPath = urlObj.pathname.startsWith("/")
            ? urlObj.pathname.slice(1)
            : urlObj.pathname;
        } else {
          objectPath = rawUrl;
        }
        if (objectPath.includes("?")) {
          objectPath = objectPath.split("?")[0];
        }
      } catch (err) {
        objectPath = rawUrl.split("?")[0];
      }
    }

    if (objectPath) {
      const deleteFileResult = await deleteFileFromSupabase(objectPath);
      if (!deleteFileResult.success) {
        console.error("❌ 合同附件OSS文件删除失败:", deleteFileResult.error);
        return {
          success: false,
          message: deleteFileResult.error || "附件文件删除失败"
        };
      }
    }

    const { error } = await supabase
      .from("contract_attachments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ 合同附件删除失败:", error);
      return {
        success: false,
        message: `删除失败: ${error.message}`
      };
    }

    console.log("✅ 合同附件删除成功");
    return {
      success: true,
      message: "合同附件删除成功"
    };
  } catch (error) {
    console.error("❌ 合同附件删除异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};
