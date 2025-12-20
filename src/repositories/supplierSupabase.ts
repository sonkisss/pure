import { supabase } from "@/services/supabase";
import {
  getPublicFileUrl,
  getSignedFileUrl,
  deleteFileFromSupabase,
  uploadFileToSupabase
} from "@/services/storage";
import type {
  Supplier,
  SupplierListResult,
  OperationResult,
  SupplierDetailResult,
  SupplierStatisticsResult,
  SupplierDebt,
  DebtListResult,
  SupplierPayment,
  PaymentListResult,
  PaymentType
} from "@/api/supplier";

const voucherBucket = "inquiry-attachments"; // 兼容旧路径（Supabase存储）
const voucherFolder = "supplier-vouchers"; // OSS 路径前缀（真实存储路径）
const sanitizeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");

const getSupplierListSupabase = async (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<SupplierListResult> => {
  if (!supabase) return { success: false, data: { list: [], total: 0 } } as any;
  const page = Number(data?.page ?? 1);
  const pageSize = Number(data?.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("suppliers")
    .select("id,name,total_payable,created_at", { count: "exact" });
  if (data?.keyword && data.keyword.trim()) {
    const kw = `%${data.keyword}%`;
    query = query.ilike("name", kw);
  }
  const res = await query.range(from, to);
  const list: Supplier[] = (res.data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    totalPayable: Number(r.total_payable ?? 0),
    createTime: r.created_at ?? new Date().toISOString()
  }));
  return { success: true, data: { list, total: res.count ?? 0 } };
};

const addSupplierSupabase = async (
  data: Omit<Supplier, "id" | "createTime">
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  try {
    // 1. 创建供应商记录
    const ins = await supabase
      .from("suppliers")
      .insert({
        name: data.name,
        total_payable: data.totalPayable ?? 0,
        created_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (ins.error) return { success: false, message: ins.error.message };

    const supplierId = ins.data?.id;
    if (!supplierId)
      return { success: false, message: "创建供应商失败，未获取到ID" };

    // 2. 如果有初始欠款，自动创建欠款记录
    const initialDebt = Number(data.totalPayable ?? 0);
    if (initialDebt > 0) {
      const debtIns = await supabase
        .from("supplier_debts")
        .insert({
          supplier_id: supplierId,
          amount: initialDebt,
          description: "初始欠款 - 添加供应商时自动创建",
          debt_date: new Date().toISOString().split("T")[0], // 使用当前日期
          image_url: null,
          has_excel_data: false,
          excel_item_count: 0,
          created_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (debtIns.error) {
        console.warn("创建初始欠款记录失败:", debtIns.error);
        // 即使创建欠款记录失败，供应商已创建成功，返回成功但提示警告
        return {
          success: true,
          message: "供应商添加成功，但初始欠款记录创建失败",
          data: { id: supplierId }
        };
      }
    }

    return {
      success: true,
      message:
        initialDebt > 0
          ? "供应商添加成功，已创建初始欠款记录"
          : "供应商添加成功",
      data: { id: supplierId }
    };
  } catch (error) {
    console.error("添加供应商时发生错误:", error);
    return { success: false, message: "添加失败，请稍后重试" };
  }
};

const updateSupplierSupabase = async (
  data: Supplier
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const up = await supabase
    .from("suppliers")
    .update({ name: data.name, total_payable: data.totalPayable })
    .eq("id", data.id);
  if (up.error) return { success: false, message: up.error.message };
  return { success: true, message: "更新成功" };
};

const deleteSupplierSupabase = async (id: number): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  try {
    // 1. 先获取该供应商的所有欠款记录ID
    const { data: debts, error: debtsError } = await supabase
      .from("supplier_debts")
      .select("id")
      .eq("supplier_id", id);

    if (debtsError) {
      console.warn("获取供应商欠款记录失败:", debtsError);
    }

    // 2. 删除所有欠款明细记录（通过欠款记录ID）
    if (debts && debts.length > 0) {
      const debtIds = debts.map(debt => debt.id);
      const { error: itemsError } = await supabase
        .from("supplier_debt_items")
        .delete()
        .in("debt_id", debtIds);

      if (itemsError) {
        console.warn("删除欠款明细失败:", itemsError);
      }
    }

    // 3. 删除所有欠款记录
    const { error: deleteDebtsError } = await supabase
      .from("supplier_debts")
      .delete()
      .eq("supplier_id", id);

    if (deleteDebtsError) {
      console.warn("删除供应商欠款记录失败:", deleteDebtsError);
    }

    // 4. 删除所有付款记录（先清理凭证文件）
    const { data: payments, error: paymentsError } = await supabase
      .from("supplier_payments")
      .select("voucher_url")
      .eq("supplier_id", id);
    if (paymentsError) {
      console.warn("获取供应商付款凭证失败:", paymentsError);
    } else if (payments && payments.length > 0) {
      for (const payment of payments) {
        if (!payment.voucher_url) continue;
        const objectPath = resolveVoucherObjectPath(payment.voucher_url);
        if (!objectPath) continue;
        const deleteResult = await deleteFileFromSupabase(objectPath);
        if (!deleteResult.success) {
          return {
            success: false,
            message: deleteResult.error || "删除付款凭证文件失败"
          };
        }
      }
    }

    // 5. 删除所有付款记录
    const { error: deletePaymentsError } = await supabase
      .from("supplier_payments")
      .delete()
      .eq("supplier_id", id);

    if (deletePaymentsError) {
      console.warn("删除供应商付款记录失败:", deletePaymentsError);
    }

    // 6. 最后删除供应商记录
    const del = await supabase.from("suppliers").delete().eq("id", id);
    if (del.error) return { success: false, message: del.error.message };

    return { success: true, message: "供应商及其关联数据已全部删除" };
  } catch (error) {
    console.error("删除供应商时发生错误:", error);
    return { success: false, message: "删除失败，请稍后重试" };
  }
};

export {
  getSupplierListSupabase,
  addSupplierSupabase,
  updateSupplierSupabase,
  deleteSupplierSupabase
};
const getSupplierDetailSupabase = async (
  id: number
): Promise<SupplierDetailResult> => {
  if (!supabase) return { success: false, data: {} as any } as any;
  const res = await supabase
    .from("suppliers")
    .select("id,name,total_payable,created_at")
    .eq("id", id)
    .single();
  const data: Supplier = {
    id: res.data?.id ?? id,
    name: res.data?.name ?? "",
    totalPayable: Number(res.data?.total_payable ?? 0),
    createTime: res.data?.created_at ?? new Date().toISOString()
  };
  return { success: true, data };
};

const getSupplierStatisticsSupabase =
  async (): Promise<SupplierStatisticsResult> => {
    if (!supabase) return { success: false, data: {} as any } as any;
    const s = await supabase.from("suppliers").select("id,total_payable");
    const debts = await supabase.from("supplier_debts").select("id");
    const pays = await supabase.from("supplier_payments").select("id");
    const totalSuppliers = (s.data ?? []).length;
    const totalPayable = (s.data ?? []).reduce(
      (sum: number, r: any) => sum + Number(r.total_payable ?? 0),
      0
    );
    const paidCount = (pays.data ?? []).length;
    const unpaidCount = (debts.data ?? []).length; // 由于supplier_debts表没有status列，将所有债务记录计为未支付
    return {
      success: true,
      data: { totalSuppliers, totalPayable, paidCount, unpaidCount }
    };
  };

const getSupplierDebtsSupabase = async (
  supplierId: number,
  data?: { page?: number; pageSize?: number }
): Promise<DebtListResult> => {
  if (!supabase) return { success: false, data: { list: [], total: 0 } } as any;
  const page = Number(data?.page ?? 1);
  const pageSize = Number(data?.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const res = await supabase
    .from("supplier_debts")
    .select(
      "id,supplier_id,amount,description,debt_date,excel_url,image_url,has_excel_data,excel_item_count,created_at,updated_at",
      { count: "planned" }
    )
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .range(from, to);
  const list: SupplierDebt[] = (res.data ?? []).map((r: any) => ({
    id: r.id,
    supplierId: r.supplier_id,
    amount: Number(r.amount ?? 0),
    description: r.description ?? "",
    debtDate: r.debt_date
      ? new Date(r.debt_date).toISOString().split("T")[0]
      : undefined,
    excelUrl: r.excel_url ?? "",
    imageUrl: r.image_url ?? "",
    hasExcelData: !!r.has_excel_data,
    excelItemCount: Number(r.excel_item_count ?? 0),
    createTime: r.created_at ?? new Date().toISOString(),
    updateTime: r.updated_at ?? new Date().toISOString()
  }));
  return { success: true, data: { list, total: res.count ?? 0 } };
};

const addSupplierDebtSupabase = async (
  supplierId: number,
  data: {
    amount: number;
    description: string;
    debtDate: string;
    imageBase64?: string;
  }
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const ins = await supabase
    .from("supplier_debts")
    .insert({
      supplier_id: supplierId,
      amount: Number(data.amount),
      description: data.description,
      debt_date: data.debtDate,
      image_url: data.imageBase64 ?? null,
      has_excel_data: false,
      excel_item_count: 0
    })
    .select("id")
    .single();
  if (ins.error) {
    const curFallback = await supabase
      .from("suppliers")
      .select("total_payable")
      .eq("id", supplierId)
      .single();
    const newTotalFallback = Number(
      ((curFallback.data?.total_payable ?? 0) as number) + Number(data.amount)
    );
    await supabase
      .from("suppliers")
      .update({ total_payable: newTotalFallback })
      .eq("id", supplierId);
    return { success: true, message: "添加成功", data: { id: undefined } };
  }
  const cur = await supabase
    .from("suppliers")
    .select("total_payable")
    .eq("id", supplierId)
    .single();
  const newTotal = Number(
    ((cur.data?.total_payable ?? 0) as number) + Number(data.amount)
  );
  await supabase
    .from("suppliers")
    .update({ total_payable: newTotal })
    .eq("id", supplierId);
  return { success: true, message: "添加成功", data: { id: ins.data?.id } };
};

const updateSupplierDebtSupabase = async (
  debtId: number,
  data: {
    amount?: number;
    description?: string;
    debtDate?: string;
    imageBase64?: string;
  }
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const oldRow = await supabase
    .from("supplier_debts")
    .select("supplier_id,amount")
    .eq("id", debtId)
    .single();
  const up = await supabase
    .from("supplier_debts")
    .update({
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      description: data.description,
      debt_date: data.debtDate,
      image_url: data.imageBase64 ?? null
    })
    .eq("id", debtId);
  if (up.error) return { success: false, message: up.error.message };
  if (!oldRow.error) {
    const supplierId = Number(oldRow.data?.supplier_id ?? 0);
    const oldAmt = Number(oldRow.data?.amount ?? 0);
    const newAmt = data.amount !== undefined ? Number(data.amount) : oldAmt;
    const delta = newAmt - oldAmt;
    if (supplierId && delta !== 0) {
      const cur = await supabase
        .from("suppliers")
        .select("total_payable")
        .eq("id", supplierId)
        .single();
      const newTotal = Number(
        ((cur.data?.total_payable ?? 0) as number) + delta
      );
      await supabase
        .from("suppliers")
        .update({ total_payable: newTotal })
        .eq("id", supplierId);
    }
  }
  return { success: true, message: "修改成功" };
};

const deleteSupplierDebtSupabase = async (
  debtId: number
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const row = await supabase
    .from("supplier_debts")
    .select("supplier_id,amount")
    .eq("id", debtId)
    .single();
  const del = await supabase.from("supplier_debts").delete().eq("id", debtId);
  if (del.error) return { success: false, message: del.error.message };
  if (!row.error) {
    const supplierId = Number(row.data?.supplier_id ?? 0);
    const amt = Number(row.data?.amount ?? 0);
    if (supplierId && amt) {
      const cur = await supabase
        .from("suppliers")
        .select("total_payable")
        .eq("id", supplierId)
        .single();
      const newTotal = Number(((cur.data?.total_payable ?? 0) as number) - amt);
      await supabase
        .from("suppliers")
        .update({ total_payable: Math.max(0, newTotal) })
        .eq("id", supplierId);
    }
  }
  return { success: true, message: "删除成功" };
};

const getVoucherUrl = async (voucherUrl: string): Promise<string> => {
  if (!voucherUrl) return "";

  // 如果是base64数据，直接返回
  if (voucherUrl.startsWith("data:")) {
    return voucherUrl;
  }

  // 如果已经是完整URL (http开头)，直接返回
  if (voucherUrl.startsWith("http")) {
    return voucherUrl;
  }

  try {
    // 兼容旧路径（Supabase存储）与新路径（OSS），统一生成签名 URL，不再回退原链/公共链
    let fullPath = voucherUrl;
    if (fullPath.startsWith(voucherBucket)) {
      const signed = await getSignedFileUrl(fullPath, 3600);
      if (!signed) throw new Error("凭证签名生成失败");
      return signed;
    }

    // 新路径：OSS 文件夹前缀 supplier-vouchers
    if (!fullPath.includes("/")) {
      fullPath = `${voucherFolder}/${fullPath}`;
    }

    const signed = await getSignedFileUrl(fullPath, 3600);
    if (!signed) throw new Error("凭证签名生成失败");
    return signed;
  } catch (error) {
    console.warn("获取凭证URL失败:", error);
    throw error;
  }
};

const resolveVoucherObjectPath = (voucherUrl: string): string => {
  if (!voucherUrl || voucherUrl.startsWith("data:")) return "";
  let path = voucherUrl;
  try {
    if (voucherUrl.startsWith("http")) {
      const urlObj = new URL(voucherUrl);
      path = urlObj.pathname.startsWith("/")
        ? urlObj.pathname.slice(1)
        : urlObj.pathname;
    }
  } catch {
    path = voucherUrl;
  }
  if (path.includes("?")) {
    path = path.split("?")[0];
  }
  if (!path.startsWith(`${voucherFolder}/`) && !path.startsWith(`${voucherBucket}/`)) {
    path = `${voucherFolder}/${path}`;
  }
  return path;
};

const getSupplierPaymentListSupabase = async (
  supplierId: number,
  data?: { page?: number; pageSize?: number }
): Promise<PaymentListResult> => {
  if (!supabase)
    return {
      success: false,
      data: { list: [], total: 0, totalDebt: 0, totalPaid: 0 }
    } as any;

  const page = Number(data?.page ?? 1);
  const pageSize = Number(data?.pageSize ?? 20);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // 并行执行数据库查询
    const [paysResult, supRes] = await Promise.all([
      supabase
        .from("supplier_payments")
        .select(
          "id,supplier_id,amount,payment_date,payment_type,voucher_url,remark,created_at,updated_at",
          { count: "planned" }
        )
        .eq("supplier_id", supplierId)
        .order("payment_date", { ascending: false })
        .range(from, to),
      supabase
        .from("suppliers")
        .select("total_payable")
        .eq("id", supplierId)
        .single()
    ]);

    const rows = (paysResult.data ?? []) as any[];

    // 优化：延迟加载凭证URL，主流程立即返回
    const list: SupplierPayment[] = rows.map((r: any) => ({
      id: r.id,
      supplierId: r.supplier_id,
      amount: Number(r.amount ?? 0),
      paymentDate: r.payment_date ?? new Date().toISOString().split("T")[0],
      paymentType: (r.payment_type ?? "现金") as PaymentType,
      voucher: r.voucher_url ? "LOADING" : undefined, // "LOADING"表示正在加载，undefined表示没有凭证
      remark: r.remark ?? "",
      createTime: r.created_at ?? new Date().toISOString(),
      updateTime: r.updated_at ?? new Date().toISOString()
    }));

    const totalDebt = Number(supRes.data?.total_payable ?? 0);
    const totalPaid = list.reduce((sum, p) => sum + p.amount, 0);

    // 后台异步加载凭证URL（不阻塞主流程）
    const loadVouchers = async () => {
      try {
        await Promise.all(
          rows.map(async (r: any, index: number) => {
            if (r.voucher_url) {
              const voucherUrl = await getVoucherUrl(r.voucher_url);
              // 使用Object.assign确保Vue响应式系统能检测到变化
              if (list[index] && voucherUrl) {
                Object.assign(list[index], { voucher: voucherUrl });
              }
            }
          })
        );
      } catch (error) {
        console.warn("异步加载凭证URL失败:", error);
      }
    };

    // 启动异步加载但不等待
    loadVouchers();

    return {
      success: true,
      data: {
        list,
        total: paysResult.count ?? 0,
        totalDebt,
        totalPaid
      }
    };
  } catch (error) {
    console.error("获取付款记录失败:", error);
    return {
      success: false,
      data: { list: [], total: 0, totalDebt: 0, totalPaid: 0 }
    };
  }
};

const addSupplierPaymentSupabase = async (data: {
  supplierId: number;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  voucher?: string;
  remark?: string;
}): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const ins = await supabase.from("supplier_payments").insert({
    supplier_id: data.supplierId,
    amount: Number(data.amount),
    payment_date: data.paymentDate,
    payment_type: data.paymentType,
    voucher_url: data.voucher ?? null,
    remark: data.remark ?? ""
  });
  if (ins.error) return { success: false, message: ins.error.message };
  const cur = await supabase
    .from("suppliers")
    .select("total_payable")
    .eq("id", data.supplierId)
    .single();
  const newTotal = Number(
    ((cur.data?.total_payable ?? 0) as number) - Number(data.amount)
  );
  await supabase
    .from("suppliers")
    .update({ total_payable: Math.max(0, newTotal) })
    .eq("id", data.supplierId);
  return { success: true, message: "添加成功" };
};

const updateSupplierPaymentSupabase = async (
  data: SupplierPayment
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const oldRow = await supabase
    .from("supplier_payments")
    .select("supplier_id,amount")
    .eq("id", data.id)
    .single();
  const up = await supabase
    .from("supplier_payments")
    .update({
      amount: Number(data.amount),
      payment_date: data.paymentDate,
      payment_type: data.paymentType,
      voucher_url: data.voucher ?? null,
      remark: data.remark ?? ""
    })
    .eq("id", data.id);
  if (up.error) return { success: false, message: up.error.message };
  if (!oldRow.error) {
    const supplierId = Number(oldRow.data?.supplier_id ?? 0);
    const oldAmt = Number(oldRow.data?.amount ?? 0);
    const delta = Number(data.amount) - oldAmt;
    if (supplierId && delta !== 0) {
      const cur = await supabase
        .from("suppliers")
        .select("total_payable")
        .eq("id", supplierId)
        .single();
      const newTotal = Number(
        ((cur.data?.total_payable ?? 0) as number) - delta
      );
      await supabase
        .from("suppliers")
        .update({ total_payable: Math.max(0, newTotal) })
        .eq("id", supplierId);
    }
  }
  return { success: true, message: "修改成功" };
};

const deleteSupplierPaymentSupabase = async (
  id: number
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const row = await supabase
    .from("supplier_payments")
    .select("supplier_id,amount,voucher_url")
    .eq("id", id)
    .single();
  if (row.error) return { success: false, message: row.error.message };

  if (row.data?.voucher_url) {
    const objectPath = resolveVoucherObjectPath(row.data.voucher_url);
    if (objectPath) {
      const deleteResult = await deleteFileFromSupabase(objectPath);
      if (!deleteResult.success) {
        return {
          success: false,
          message: deleteResult.error || "删除凭证文件失败"
        };
      }
    }
  }

  const del = await supabase.from("supplier_payments").delete().eq("id", id);
  if (del.error) return { success: false, message: del.error.message };
  if (!row.error) {
    const supplierId = Number(row.data?.supplier_id ?? 0);
    const amt = Number(row.data?.amount ?? 0);
    if (supplierId && amt) {
      const cur = await supabase
        .from("suppliers")
        .select("total_payable")
        .eq("id", supplierId)
        .single();
      const newTotal = Number(((cur.data?.total_payable ?? 0) as number) + amt);
      await supabase
        .from("suppliers")
        .update({ total_payable: newTotal })
        .eq("id", supplierId);
    }
  }
  return { success: true, message: "删除成功" };
};

const uploadDebtExcelSupabase = async (
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
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  // 先获取欠款记录的金额进行校验
  const debtRes = await supabase
    .from("supplier_debts")
    .select("amount")
    .eq("id", debtId)
    .single();

  if (debtRes.error || !debtRes.data) {
    return { success: false, message: "未找到对应的欠款记录" };
  }

  const debtAmount = Number(debtRes.data.amount);
  const excelTotalAmount = items.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  // 校验Excel总金额与欠款金额是否一致
  if (Math.abs(excelTotalAmount - debtAmount) > 0.01) {
    return {
      success: false,
      message: `Excel明细总金额（¥${excelTotalAmount.toFixed(2)}）与欠款金额（¥${debtAmount.toFixed(2)}）不一致，无法上传！`
    };
  }

  const rows = items.map(i => ({
    debt_id: debtId,
    product_name: i.productName,
    specification: i.productModel,
    unit: i.unit,
    quantity: Number(i.quantity),
    unit_price: Number(i.unitPrice),
    amount: Number(i.amount),
    tax_type: i.hasTax ? "含税" : "不含",
    remark: ""
  }));
  if (rows.length) {
    const ins = await supabase.from("supplier_debt_items").insert(rows);
    if (ins.error) {
      const msg = String(ins.error.message || "");
      if (msg.includes("supplier_debt_items")) {
        const path = `debt-excel/${debtId}/${Date.now()}.json`;
        const payload = new Blob([JSON.stringify(items)], {
          type: "application/json"
        });
        const up = await supabase.storage
          .from(voucherBucket)
          .upload(path, payload, {
            upsert: false,
            contentType: "application/json"
          });
        if (up.error) return { success: false, message: up.error.message };
      } else {
        return { success: false, message: ins.error.message };
      }
    }
  }
  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  await supabase
    .from("supplier_debts")
    .update({ has_excel_data: true, excel_item_count: rows.length })
    .eq("id", debtId);
  return {
    success: true,
    message: "Excel导入成功",
    data: { items, totalAmount }
  } as any;
};

const getDebtExcelItemsSupabase = async (
  debtId: number
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const res = await supabase
    .from("supplier_debt_items")
    .select(
      "id,debt_id,product_name,specification,unit,quantity,unit_price,amount,tax_type,remark"
    )
    .eq("debt_id", debtId)
    .order("id");
  if (
    (res.error &&
      String(res.error.message || "").includes("supplier_debt_items")) ||
    (Array.isArray(res.data) && res.data.length === 0)
  ) {
    const list = await supabase.storage
      .from(voucherBucket)
      .list(`debt-excel/${debtId}`, { limit: 100 });
    const files = (list.data ?? []).sort(
      (a: any, b: any) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    );
    if (!files.length) return { success: true, message: "获取成功", data: [] };
    const dl = await supabase.storage
      .from(voucherBucket)
      .download(`debt-excel/${debtId}/${files[0].name}`);
    if (dl.error) return { success: false, message: dl.error.message };
    const text = await (dl.data as Blob).text();
    const rawItems = JSON.parse(text) as any[];
    const items = rawItems.map((i: any, idx: number) => ({
      id: idx + 1,
      debtId: debtId,
      productName: i.productName,
      productModel: i.productModel,
      unit: i.unit,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      amount: Number(i.amount),
      hasTax: !!i.hasTax,
      createTime: new Date().toISOString()
    }));
    return { success: true, message: "获取成功", data: items };
  }
  const data = (res.data ?? []).map((r: any) => ({
    id: r.id,
    debtId: r.debt_id,
    productName: r.product_name,
    productModel: r.specification,
    unit: r.unit,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    amount: Number(r.amount),
    hasTax: String(r.tax_type) === "含税",
    createTime: new Date().toISOString()
  }));
  return { success: true, message: "获取成功", data };
};

const exportDebtsExcelSupabase = async (
  debtIds: number[]
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const res = await supabase
    .from("supplier_debt_items")
    .select(
      "id,debt_id,product_name,specification,unit,quantity,unit_price,amount,tax_type,remark"
    )
    .in("debt_id", debtIds);
  if (
    res.error &&
    String(res.error.message || "").includes("supplier_debt_items")
  ) {
    let all: any[] = [];
    for (const id of debtIds) {
      const list = await supabase.storage
        .from(voucherBucket)
        .list(`debt-excel/${id}`, { limit: 100 });
      const files = (list.data ?? []).sort(
        (a: any, b: any) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
      );
      if (!files.length) continue;
      const dl = await supabase.storage
        .from(voucherBucket)
        .download(`debt-excel/${id}/${files[0].name}`);
      if (dl.error) continue;
      const text = await (dl.data as Blob).text();
      const items = JSON.parse(text);
      all = all.concat(
        items.map((i: any) => ({
          id: 0,
          debtId: id,
          productName: i.productName,
          productModel: i.productModel,
          unit: i.unit,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          amount: Number(i.amount),
          hasTax: !!i.hasTax
        }))
      );
    }
    return { success: true, message: "导出成功", data: all } as any;
  }
  const data = (res.data ?? []).map((r: any) => ({
    id: r.id,
    debtId: r.debt_id,
    productName: r.product_name,
    productModel: r.specification,
    unit: r.unit,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    amount: Number(r.amount),
    hasTax: String(r.tax_type) === "含税"
  }));
  return { success: true, message: "导出成功", data };
};

export {
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
};

const uploadSupplierVoucherSupabase = async (
  supplierId: number,
  file: File
): Promise<OperationResult> => {
  const safe = sanitizeName((file as any).name || "file");
  const upload = await uploadFileToSupabase(
    file,
    voucherFolder,
    `${supplierId}`
  );
  if (!upload.success) {
    return { success: false, message: upload.error || "上传失败" };
  }
  // 返回OSS路径，优先使用上传返回的 filePath
  const path = upload.filePath || `${voucherFolder}/${supplierId}/${Date.now()}_${safe}`;
  return { success: true, message: "上传成功", data: { path } };
};

export { uploadSupplierVoucherSupabase };
