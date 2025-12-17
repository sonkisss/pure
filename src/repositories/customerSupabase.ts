import { supabase } from "@/services/supabase";
import { getPublicFileUrl } from "@/services/storage";
import type {
  Customer,
  CustomerListResult,
  OperationResult,
  PaymentType,
  PaymentRecord,
  CreditRecord,
  PaymentRecordListResult,
  CreditRecordListResult
} from "@/api/customer";

// 注意：缓存已迁移到统一的 unifiedCacheManager.ts
// Repository层不再维护缓存，避免多层缓存冲突

/**
 * 从Supabase公共URL中提取文件路径
 * 输入: https://[project-ref].supabase.co/storage/v1/object/public/invoices/pdfs/file.pdf
 * 输出: pdfs/file.pdf
 */
const extractFilePathFromUrl = (
  url: string | null | undefined
): string | null => {
  if (!url) return null;

  try {
    // 匹配 Supabase URL 模式并提取路径部分
    const regex = /\/storage\/v1\/object\/public\/[^\/]+\/(.+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.warn("解析文件URL失败:", error);
    return url; // 如果解析失败，返回原始URL
  }
};

/**
 * 将文件路径转换为完整的Supabase公共URL
 */
const buildPublicUrl = (filePath: string | null): string => {
  if (!filePath) return "";

  try {
    // 如果filePath已经是完整URL，直接返回
    if (filePath.startsWith("http")) {
      return filePath;
    }

    // 否则使用存储服务生成公共URL
    return getPublicFileUrl(filePath, "invoices");
  } catch (error) {
    console.warn("构建公共URL失败:", error, "文件路径:", filePath);
    return ""; // 如果失败返回空字符串
  }
};

const getCustomerListSupabase = async (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<CustomerListResult> => {
  if (!supabase) return { success: false, data: { list: [], total: 0 } } as any;

  const page = Number(data?.page ?? 1);
  const pageSize = Number(data?.pageSize ?? 10);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 优化查询：只查询必要的字段，添加排序以获得一致的结果
  let query = supabase
    .from("customers")
    .select(
      "id,name,total_debt,created_at,company_id, companies(id, company_name)",
      { count: "exact" }
    )
    // 优先按公司名称排序（处理null值），然后按创建时间倒序
    .order("company_id", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (data?.keyword && data.keyword.trim()) {
    const kw = `%${data.keyword}%`;
    query = query.or(`name.ilike.${kw},companies.company_name.ilike.${kw}`);
  }

  const res = await query.range(from, to);

  if (res.error) {
    console.error("客户列表查询失败:", res.error);
    return { success: false, data: { list: [], total: 0 } };
  }

  const list: Customer[] = (res.data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    debt: Number(r.total_debt ?? 0),
    companyId: r.company_id,
    companyName: r.companies?.company_name,
    createTime: r.created_at ?? new Date().toISOString()
  }));

  const result = { success: true, data: { list, total: res.count ?? 0 } };

  return result;
};

const addCustomerSupabase = async (
  data: Omit<Customer, "id" | "createTime">
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const ins = await supabase
    .from("customers")
    .insert({
      name: data.name,
      total_debt: data.debt ?? 0,
      company_id: data.companyId,
      created_at: new Date().toISOString()
    })
    .select("id")
    .single();
  if (ins.error) return { success: false, message: ins.error.message };

  // 清理缓存，因为数据已更新
  // clearCustomerListCache(); // 缓存已迁移到统一管理器

  return { success: true, message: "添加成功" };
};

const updateCustomerSupabase = async (
  data: Customer
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const up = await supabase
    .from("customers")
    .update({
      name: data.name,
      total_debt: data.debt,
      company_id: data.companyId
    })
    .eq("id", data.id);
  if (up.error) return { success: false, message: up.error.message };

  // 清理缓存，因为数据已更新
  // clearCustomerListCache(); // 缓存已迁移到统一管理器

  return { success: true, message: "更新成功" };
};

/**
 * 检查客户是否有付款或挂账记录
 */
const checkCustomerRecordsSupabase = async (
  id: number
): Promise<{
  hasPayments: boolean;
  hasCredits: boolean;
  paymentCount: number;
  creditCount: number;
}> => {
  if (!supabase) {
    return {
      hasPayments: false,
      hasCredits: false,
      paymentCount: 0,
      creditCount: 0
    };
  }

  try {
    // 检查付款记录
    const { data: payments, error: paymentsError } = await supabase
      .from("customer_payments")
      .select("id")
      .eq("customer_id", id)
      .limit(1);

    if (paymentsError) {
      console.warn("检查客户付款记录失败:", paymentsError);
    }

    // 检查挂账记录
    const { data: credits, error: creditsError } = await supabase
      .from("customer_credit_records")
      .select("id")
      .eq("customer_id", id)
      .limit(1);

    if (creditsError) {
      console.warn("检查客户挂账记录失败:", creditsError);
    }

    // 获取记录数量
    const { count: paymentCount } = await supabase
      .from("customer_payments")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id);

    const { count: creditCount } = await supabase
      .from("customer_credit_records")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id);

    return {
      hasPayments: !!(payments && payments.length > 0),
      hasCredits: !!(credits && credits.length > 0),
      paymentCount: paymentCount || 0,
      creditCount: creditCount || 0
    };
  } catch (error) {
    console.error("检查客户记录时发生错误:", error);
    return {
      hasPayments: false,
      hasCredits: false,
      paymentCount: 0,
      creditCount: 0
    };
  }
};

const deleteCustomerSupabase = async (id: number): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  try {
    // 1. 删除所有付款记录
    const { error: deletePaymentsError } = await supabase
      .from("customer_payments")
      .delete()
      .eq("customer_id", id);

    if (deletePaymentsError) {
      console.warn("删除客户付款记录失败:", deletePaymentsError);
    }

    // 2. 删除所有挂账记录
    const { error: deleteCreditsError } = await supabase
      .from("customer_credit_records")
      .delete()
      .eq("customer_id", id);

    if (deleteCreditsError) {
      console.warn("删除客户挂账记录失败:", deleteCreditsError);
    }

    // 3. 最后删除客户记录
    const del = await supabase.from("customers").delete().eq("id", id);
    if (del.error) return { success: false, message: del.error.message };

    // 清理缓存，因为数据已删除
    // clearCustomerListCache(); // 缓存已迁移到统一管理器

    return { success: true, message: "客户及其关联数据已全部删除" };
  } catch (error) {
    console.error("删除客户时发生错误:", error);
    return { success: false, message: "删除失败，请稍后重试" };
  }
};

const getCustomerDetailSupabase = async (
  id: number
): Promise<{ success: boolean; data: Customer | null; message?: string }> => {
  if (!supabase) return { success: false, data: null, message: "no client" };

  const res = await supabase
    .from("customers")
    .select(
      "id,name,total_debt,created_at,company_id, companies(id, company_name)"
    )
    .eq("id", id)
    .single();
  if (res.error)
    return { success: false, data: null, message: res.error.message };

  const companyData = (res.data as any)?.companies;
  const companyName = Array.isArray(companyData)
    ? companyData[0]?.company_name
    : companyData?.company_name;

  const customer: Customer = {
    id: res.data.id,
    name: res.data.name,
    debt: Number(res.data.total_debt ?? 0),
    companyId: res.data.company_id,
    companyName,
    createTime: res.data.created_at ?? new Date().toISOString()
  };

  const result = { success: true, data: customer };

  return result;
};

// 批量删除客户
const batchDeleteCustomerSupabase = async (
  ids: number[]
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  try {
    // 1. 删除所有付款记录
    const { error: deletePaymentsError } = await supabase
      .from("customer_payments")
      .delete()
      .in("customer_id", ids);

    if (deletePaymentsError) {
      console.warn("批量删除客户付款记录失败:", deletePaymentsError);
    }

    // 2. 删除所有挂账记录
    const { error: deleteCreditsError } = await supabase
      .from("customer_credit_records")
      .delete()
      .in("customer_id", ids);

    if (deleteCreditsError) {
      console.warn("批量删除客户挂账记录失败:", deleteCreditsError);
    }

    // 3. 最后删除客户记录
    const del = await supabase.from("customers").delete().in("id", ids);
    if (del.error) return { success: false, message: del.error.message };

    // 清理缓存，因为数据已删除
    // clearCustomerListCache(); // 缓存已迁移到统一管理器

    return { success: true, message: "批量删除客户及其关联数据成功" };
  } catch (error) {
    console.error("批量删除客户时发生错误:", error);
    return { success: false, message: "批量删除失败，请稍后重试" };
  }
};

// 获取客户统计信息
const getCustomerStatisticsSupabase = async () => {
  if (!supabase)
    return {
      success: false,
      data: {
        totalCustomers: 0,
        debtCustomers: 0,
        totalDebt: 0,
        zeroDebtCustomers: 0
      }
    };

  // 获取所有客户
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id,total_debt");
  if (error)
    return {
      success: false,
      data: {
        totalCustomers: 0,
        debtCustomers: 0,
        totalDebt: 0,
        zeroDebtCustomers: 0
      },
      message: error.message
    };

  const totalCustomers = customers?.length || 0;
  const debtCustomers =
    customers?.filter(c => Number(c.total_debt || 0) > 0).length || 0;
  const totalDebt =
    customers?.reduce((sum, c) => sum + Number(c.total_debt || 0), 0) || 0;
  const zeroDebtCustomers = totalCustomers - debtCustomers;

  return {
    success: true,
    data: {
      totalCustomers,
      debtCustomers,
      totalDebt: Number(totalDebt.toFixed(2)),
      zeroDebtCustomers
    }
  };
};

// 导出将在文件末尾统一处理

// 收款：减少客户欠款并记录付款
const receivePaymentSupabase = async (data: {
  id: number;
  amount: number;
}): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const cid = data.id;
  const amt = Number(data.amount);
  if (isNaN(amt) || amt <= 0) return { success: false, message: "金额不合法" };
  const cust = await supabase
    .from("customers")
    .select("total_debt")
    .eq("id", cid)
    .single();
  if (cust.error) return { success: false, message: cust.error.message };
  const currentDebt = Number(cust.data?.total_debt ?? 0);
  const newDebt = Math.max(0, Number((currentDebt - amt).toFixed(2)));
  const up = await supabase
    .from("customers")
    .update({ total_debt: newDebt })
    .eq("id", cid);
  if (up.error) return { success: false, message: up.error.message };
  const ins = await supabase.from("customer_payments").insert({
    customer_id: cid,
    amount: amt,
    payment_time: new Date().toISOString(),
    payment_type: "现金",
    remark: ""
  });
  if (ins.error) return { success: false, message: ins.error.message };

  // 清理缓存，因为客户欠款已更新
  // clearCustomerListCache(); // 缓存已迁移到统一管理器

  return { success: true, message: "收款成功" };
};

// 添加付款记录并减少客户欠款
const addPaymentRecordSupabase = async (data: {
  customerId: number;
  amount: number;
  paymentTime: string;
  paymentType: PaymentType;
  remark?: string;
}): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const cid = data.customerId;
  const amt = Number(data.amount);

  if (isNaN(amt) || amt <= 0) return { success: false, message: "金额不合法" };

  // 获取当前客户欠款
  const cust = await supabase
    .from("customers")
    .select("total_debt")
    .eq("id", cid)
    .single();
  if (cust.error) return { success: false, message: cust.error.message };

  const currentDebt = Number(cust.data?.total_debt ?? 0);
  const newDebt = Math.max(0, Number((currentDebt - amt).toFixed(2)));

  // 开始事务：插入付款记录并更新客户欠款
  const ins = await supabase.from("customer_payments").insert({
    customer_id: cid,
    amount: amt,
    payment_time: data.paymentTime,
    payment_type: data.paymentType,
    remark: data.remark ?? ""
  });

  if (ins.error) return { success: false, message: ins.error.message };

  const up = await supabase
    .from("customers")
    .update({ total_debt: newDebt })
    .eq("id", cid);
  if (up.error) return { success: false, message: up.error.message };

  // 清理相关缓存
  // clearCustomerCache(cid); // 缓存已迁移到统一管理器

  return { success: true, message: "添加付款记录成功，欠款已更新" };
};

// 添加挂账记录并增加欠款
const addCreditRecordSupabase = async (data: {
  customerId: number;
  amount: number;
  creditDate: string;
  invoicePdfBase64?: string;
  remark?: string;
}): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const cid = data.customerId;
  const amt = Number(data.amount);
  if (isNaN(amt) || amt <= 0) return { success: false, message: "金额不合法" };

  let filePath = null;

  // 处理前端上传的文件信息JSON字符串
  if (data.invoicePdfBase64) {
    try {
      if (data.invoicePdfBase64.startsWith("{")) {
        // 如果是JSON字符串，解析并提取文件路径
        const fileInfo = JSON.parse(data.invoicePdfBase64);
        if (fileInfo.fileUrl) {
          // 从完整URL中提取文件路径
          filePath = extractFilePathFromUrl(fileInfo.fileUrl);
        } else if (fileInfo.filePath) {
          // 直接使用文件路径
          filePath = fileInfo.filePath;
        }
      } else if (data.invoicePdfBase64.startsWith("http")) {
        // 如果直接是URL，提取文件路径
        filePath = extractFilePathFromUrl(data.invoicePdfBase64);
      } else {
        // 其他情况，直接作为文件路径处理
        filePath = data.invoicePdfBase64;
      }
    } catch (error) {
      console.error("解析文件信息失败:", error);
      // 如果解析失败，尝试直接作为URL处理
      filePath = extractFilePathFromUrl(data.invoicePdfBase64);
    }
  }

  const ins = await supabase.from("customer_credit_records").insert({
    customer_id: cid,
    amount: amt,
    credit_date: data.creditDate,
    invoice_url: filePath,
    remark: data.remark ?? "",
    status: "active"
  });
  if (ins.error) return { success: false, message: ins.error.message };

  // 更新客户欠款
  const cust = await supabase
    .from("customers")
    .select("total_debt")
    .eq("id", cid)
    .single();
  if (cust.error) return { success: false, message: cust.error.message };
  const currentDebt = Number(cust.data?.total_debt ?? 0);
  const newDebt = Number((currentDebt + amt).toFixed(2));
  const upd = await supabase
    .from("customers")
    .update({ total_debt: newDebt })
    .eq("id", cid);
  if (upd.error) return { success: false, message: upd.error.message };

  // 清理相关缓存
  // clearCustomerCache(cid); // 缓存已迁移到统一管理器

  return { success: true, message: "挂账记录添加成功" };
};

// 导出将在文件末尾统一处理

const updatePaymentRecordSupabase = async (
  data: PaymentRecord
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  // 获取原始付款记录
  const originalPayment = await supabase
    .from("customer_payments")
    .select("customer_id, amount")
    .eq("id", data.id)
    .single();
  if (originalPayment.error)
    return { success: false, message: originalPayment.error.message };

  const oldAmt = Number(originalPayment.data?.amount ?? 0);
  const newAmt = Number(data.amount);
  const difference = newAmt - oldAmt;

  // 更新付款记录（不更新payment_time，保持原有排序）
  const up = await supabase
    .from("customer_payments")
    .update({
      amount: newAmt,
      payment_type: data.paymentType,
      remark: data.remark ?? ""
    })
    .eq("id", data.id);
  if (up.error) return { success: false, message: up.error.message };

  // 如果金额发生变化，更新客户欠款（付款增加=欠款减少，付款减少=欠款增加）
  if (difference !== 0) {
    const cust = await supabase
      .from("customers")
      .select("total_debt")
      .eq("id", data.customerId)
      .single();
    if (cust.error) return { success: false, message: cust.error.message };

    const currentDebt = Number(cust.data?.total_debt ?? 0);
    const newDebt = Number((currentDebt - difference).toFixed(2)); // 付款增加，欠款减少

    const upd = await supabase
      .from("customers")
      .update({ total_debt: Math.max(0, newDebt) })
      .eq("id", data.customerId);
    if (upd.error) return { success: false, message: upd.error.message };
  }

  // 清理相关缓存
  // clearCustomerCache(originalPayment.data.customer_id); // 缓存已迁移到统一管理器

  return { success: true, message: "付款记录更新成功" };
};

const deletePaymentRecordSupabase = async (
  id: number
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  // 获取要删除的付款记录
  const payment = await supabase
    .from("customer_payments")
    .select("customer_id, amount")
    .eq("id", id)
    .single();
  if (payment.error) return { success: false, message: payment.error.message };

  const amt = Number(payment.data?.amount ?? 0);
  const customerId = payment.data?.customer_id;

  // 删除付款记录
  const del = await supabase.from("customer_payments").delete().eq("id", id);
  if (del.error) return { success: false, message: del.error.message };

  // 增加客户欠款（删除付款记录意味着要恢复欠款）
  if (amt > 0 && customerId) {
    const cust = await supabase
      .from("customers")
      .select("total_debt")
      .eq("id", customerId)
      .single();
    if (cust.error) return { success: false, message: cust.error.message };

    const currentDebt = Number(cust.data?.total_debt ?? 0);
    const newDebt = Number((currentDebt + amt).toFixed(2));

    const upd = await supabase
      .from("customers")
      .update({ total_debt: newDebt })
      .eq("id", customerId);
    if (upd.error) return { success: false, message: upd.error.message };
  }

  // 清理相关缓存
  // clearCustomerCache(payment.data.customer_id); // 缓存已迁移到统一管理器

  return { success: true, message: "付款记录删除成功" };
};

const updateCreditRecordSupabase = async (
  data: CreditRecord
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  // 获取原始挂账记录
  const originalCredit = await supabase
    .from("customer_credit_records")
    .select("customer_id, amount")
    .eq("id", data.id)
    .single();
  if (originalCredit.error)
    return { success: false, message: originalCredit.error.message };

  if (!originalCredit.data) {
    return { success: false, message: "未找到原始挂账记录" };
  }

  const oldAmt = Number(originalCredit.data.amount ?? 0);
  const newAmt = Number(data.amount);
  const difference = newAmt - oldAmt;

  // 处理文件URL，支持JSON格式
  let filePath = null;
  if (data.invoiceUrl) {
    try {
      if (data.invoiceUrl.startsWith("{")) {
        // 如果是JSON字符串，解析并提取文件路径
        const fileInfo = JSON.parse(data.invoiceUrl);
        if (fileInfo.fileUrl) {
          // 从完整URL中提取文件路径
          filePath = extractFilePathFromUrl(fileInfo.fileUrl);
        } else if (fileInfo.filePath) {
          // 直接使用文件路径
          filePath = fileInfo.filePath;
        }
      } else if (data.invoiceUrl.startsWith("http")) {
        // 如果直接是URL，提取文件路径
        filePath = extractFilePathFromUrl(data.invoiceUrl);
      } else {
        // 其他情况，直接作为文件路径处理
        filePath = data.invoiceUrl;
      }
    } catch (error) {
      console.error("解析文件信息失败:", error);
      // 如果解析失败，尝试直接作为URL处理
      filePath = extractFilePathFromUrl(data.invoiceUrl);
    }
  }

  // 更新挂账记录（不更新credit_date，保持原有排序）
  const up = await supabase
    .from("customer_credit_records")
    .update({
      amount: newAmt,
      invoice_url: filePath,
      remark: data.remark ?? "",
      status: "active"
    })
    .eq("id", data.id);
  if (up.error) return { success: false, message: up.error.message };

  // 如果金额发生变化，更新客户欠款（挂账增加=欠款增加，挂账减少=欠款减少）
  if (difference !== 0) {
    const cust = await supabase
      .from("customers")
      .select("total_debt")
      .eq("id", originalCredit.data.customer_id)
      .single();
    if (cust.error) return { success: false, message: cust.error.message };

    const currentDebt = Number(cust.data?.total_debt ?? 0);
    const newDebt = Number((currentDebt + difference).toFixed(2)); // 挂账增加，欠款增加

    const upd = await supabase
      .from("customers")
      .update({ total_debt: newDebt })
      .eq("id", originalCredit.data.customer_id);
    if (upd.error) return { success: false, message: upd.error.message };
  }

  // 清理相关缓存
  // 注意：缓存已迁移到统一的 unifiedCacheManager.ts，暂时移除缓存清理
  // TODO: 实现统一的缓存清理机制

  return { success: true, message: "挂账记录更新成功" };
};

const deleteCreditRecordSupabase = async (
  id: number
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  // 获取要删除的挂账记录
  const credit = await supabase
    .from("customer_credit_records")
    .select("customer_id, amount")
    .eq("id", id)
    .single();
  if (credit.error) return { success: false, message: credit.error.message };

  const amt = Number(credit.data?.amount ?? 0);
  const customerId = credit.data?.customer_id;

  // 删除挂账记录
  const del = await supabase
    .from("customer_credit_records")
    .delete()
    .eq("id", id);
  if (del.error) return { success: false, message: del.error.message };

  // 减少客户欠款（删除挂账记录意味着要减少欠款）
  if (amt > 0 && customerId) {
    const cust = await supabase
      .from("customers")
      .select("total_debt")
      .eq("id", customerId)
      .single();
    if (cust.error) return { success: false, message: cust.error.message };

    const currentDebt = Number(cust.data?.total_debt ?? 0);
    const newDebt = Math.max(0, Number((currentDebt - amt).toFixed(2)));

    const upd = await supabase
      .from("customers")
      .update({ total_debt: newDebt })
      .eq("id", customerId);
    if (upd.error) return { success: false, message: upd.error.message };
  }

  // 清理相关缓存
  // clearCustomerCache(credit.data.customer_id); // 缓存已迁移到统一管理器

  return { success: true, message: "挂账记录删除成功" };
};

// 获取客户付款记录列表
const getPaymentRecordListSupabase = async (
  customerId: number
): Promise<PaymentRecordListResult> => {
  if (!supabase)
    return {
      success: false,
      data: { list: [], total: 0, totalDebt: 0 }
    } as any;

  // 优化查询：使用count: "exact"获得准确计数
  const payments = await supabase
    .from("customer_payments")
    .select(
      "id,customer_id,amount,payment_time,payment_type,remark,created_at",
      { count: "exact" }
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (payments.error) {
    console.error("付款记录查询失败:", payments.error);
    return {
      success: false,
      data: { list: [], total: 0, totalDebt: 0 }
    } as any;
  }

  const rows = (payments.data ?? []) as any[];
  const list: PaymentRecord[] = rows.map((r: any) => ({
    id: r.id,
    customerId: r.customer_id,
    amount: Number(r.amount ?? 0),
    paymentTime: r.payment_time ?? new Date().toISOString(),
    paymentType: (r.payment_type ?? "现金") as PaymentType,
    remark: r.remark ?? "",
    createTime: r.created_at ?? new Date().toISOString()
  }));

  // 获取客户总欠款（单个查询）
  const customer = await supabase
    .from("customers")
    .select("total_debt")
    .eq("id", customerId)
    .single();
  const totalDebt = Number(customer.data?.total_debt ?? 0);

  const result = {
    success: true,
    data: {
      list,
      total: payments.count ?? 0,
      totalDebt
    }
  };

  return result;
};

// 获取客户挂账记录列表
const getCreditRecordListSupabase = async (
  customerId: number
): Promise<CreditRecordListResult> => {
  if (!supabase) return { success: false, data: { list: [], total: 0 } } as any;

  // 优化查询：使用count: "exact"获得准确计数
  const credits = await supabase
    .from("customer_credit_records")
    .select(
      "id,customer_id,amount,credit_date,invoice_url,remark,status,created_at",
      { count: "exact" }
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (credits.error) {
    console.error("挂账记录查询失败:", credits.error);
    return { success: false, data: { list: [], total: 0 } } as any;
  }

  const rows = (credits.data ?? []) as any[];
  const list: CreditRecord[] = rows.map((r: any) => ({
    id: r.id,
    customerId: r.customer_id,
    amount: Number(r.amount ?? 0),
    creditDate: r.credit_date ?? new Date().toISOString().split("T")[0],
    invoiceUrl: buildPublicUrl(r.invoice_url),
    remark: r.remark ?? "",
    createTime: r.created_at ?? new Date().toISOString()
  }));

  const result = {
    success: true,
    data: { list, total: credits.count ?? 0 }
  };

  return result;
};

// 获取公司欠款统计
const getCompanyDebtStatisticsSupabase = async () => {
  if (!supabase) return { success: false, data: [] };

  // 获取所有关联了公司的客户
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id,name,total_debt,company_id, companies(id, company_name)")
    .not("company_id", "is", null); // 确保有关联公司

  if (error) return { success: false, data: [], message: error.message };

  const stats = new Map<
    string,
    { totalDebt: number; customers: { name: string; debt: number }[] }
  >();

  customers?.forEach((customer: any) => {
    const companyName = customer.companies?.company_name;
    // 只统计有公司的
    if (companyName) {
      if (!stats.has(companyName)) {
        stats.set(companyName, { totalDebt: 0, customers: [] });
      }
      const companyStat = stats.get(companyName)!;
      const debt = Number(customer.total_debt || 0);
      companyStat.totalDebt += debt;
      companyStat.customers.push({ name: customer.name, debt });
    }
  });

  const result = Array.from(stats.entries())
    .map(([name, data]) => ({
      name,
      totalDebt: Number(data.totalDebt.toFixed(2)),
      customers: data.customers
    }))
    .sort((a, b) => b.totalDebt - a.totalDebt);

  return { success: true, data: result };
};

// ========================= 统一导出所有函数 =========================
export {
  // 基础CRUD
  getCustomerListSupabase,
  addCustomerSupabase,
  updateCustomerSupabase,
  checkCustomerRecordsSupabase,
  deleteCustomerSupabase,
  getCustomerDetailSupabase,
  batchDeleteCustomerSupabase,
  getCustomerStatisticsSupabase,
  getCompanyDebtStatisticsSupabase,

  // 付款记录
  receivePaymentSupabase,
  addPaymentRecordSupabase,
  updatePaymentRecordSupabase,
  deletePaymentRecordSupabase,
  getPaymentRecordListSupabase,

  // 挂账记录
  addCreditRecordSupabase,
  updateCreditRecordSupabase,
  deleteCreditRecordSupabase,
  getCreditRecordListSupabase
};
