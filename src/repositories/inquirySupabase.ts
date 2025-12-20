import { supabase } from "@/services/supabase";
import {
  uploadFileToSupabase,
  listFilesFromSupabase,
  getPublicFileUrl,
  getSignedFileUrl,
  deleteFileFromSupabase
} from "@/services/storage";
import type {
  Inquiry,
  InquiryItem,
  Attachment,
  InquiryListResult,
  InquiryDetailResult,
  OperationResult,
  ProfitCalculation,
  CustomFee
} from "@/api/inquiry";

// 询价明细聚合数据类型
export interface AllInquiryDetailsItem {
  id: number;
  inquiry_id: number;
  inquiry_name: string;
  company_name: string;
  product_name: string;
  spec_model?: string;
  unit?: string;
  quantity: number;
  purchase_price?: number;
  sale_price?: number;
  supplier?: string;
  tax_type?: string;
  remark?: string;
  status: number;
  matched: boolean;
  created_at: string;
  updated_at: string;
}

const bucket = "inquiry-attachments";

const guessMimeByName = (name: string): string => {
  const lower = (name || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
};

const getInquiryListSupabase = async (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  company?: string;
}): Promise<InquiryListResult> => {
  if (!supabase) return { success: false, data: { list: [], total: 0 } } as any;
  const page = Number(data?.page ?? 1);
  const pageSize = Number(data?.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("inquiries")
    .select("id,name,company,date,created_at", { count: "planned" })
    .order("created_at", { ascending: false });

  // 关键词搜索：支持询价名称和询价公司
  if (data?.keyword && data.keyword.trim()) {
    query = query.or(
      `name.ilike.%${data.keyword}%,company.ilike.%${data.keyword}%`
    );
  }

  // 询价公司筛选
  if (data?.company && data.company.trim()) {
    query = query.ilike("company", `%${data.company}%`);
  }

  const res = await query.range(from, to);
  const ids = (res.data ?? []).map((r: any) => r.id as number);
  const itemCountMap: Record<number, number> = {};
  const matchedCountMap: Record<number, number> = {};
  if (ids.length) {
    const itemsLite = await supabase
      .from("inquiry_items")
      .select("inquiry_id,match_status")
      .in("inquiry_id", ids);
    for (const row of itemsLite.data ?? []) {
      const iid = row.inquiry_id as number;
      itemCountMap[iid] = (itemCountMap[iid] ?? 0) + 1;
      if (String(row.match_status) === "matched")
        matchedCountMap[iid] = (matchedCountMap[iid] ?? 0) + 1;
    }
  }
  const list: Inquiry[] = (res.data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    company: row.company || "",
    date: row.date,
    createTime: row.created_at,
    itemCount: itemCountMap[row.id] ?? 0,
    matchedCount: matchedCountMap[row.id] ?? 0,
    attachments: []
  }));
  return { success: true, data: { list, total: res.count ?? 0 } };
};

const getInquiryDetailSupabase = async (
  id: number
): Promise<InquiryDetailResult> => {
  if (!supabase) return { success: false, data: {} as any } as any;

  // 直接从数据库获取询价明细数据，避免缓存系统冲突
  console.log(`[直接查询] 询价单 ${id} 从数据库获取数据`);
  const itemsRes = await supabase
    .from("inquiry_items")
    .select(
      "id,inquiry_id,matched_product_id,product_name,specification,unit,quantity,unit_price,sale_price,total_price,sale_amount,remark,match_status,supplier,tax_type"
    )
    .eq("inquiry_id", id)
    .order("id", { ascending: true });

  const base = await supabase
    .from("inquiries")
    .select("id,name,company,date,created_at")
    .eq("id", id)
    .single();

  const matchedIds = (itemsRes.data ?? [])
    .map((r: any) => r.matched_product_id)
    .filter((v: any) => v !== null && v !== undefined);
  const productMap: Record<number, { supplier: string; tax_type: string }> = {};
  if (matchedIds.length) {
    const prodRes = await supabase
      .from("products")
      .select("id,supplier,tax_type")
      .in("id", matchedIds as number[]);
    for (const p of prodRes.data ?? []) {
      productMap[p.id as number] = {
        supplier: p.supplier ?? "",
        tax_type: p.tax_type ?? "含税"
      };
    }
  }

  const items: InquiryItem[] = (itemsRes.data ?? []).map((r: any) => {
    const quantity = Number(r.quantity ?? 0);
    const purchasePrice = Number(r.unit_price ?? 0);
    const salePrice = Number(r.sale_price ?? 0);
    return {
      id: r.id,
      inquiryId: r.inquiry_id,
      productId: r.matched_product_id ?? null,
      name: r.product_name ?? "",
      specification: r.specification ?? "",
      unit: r.unit ?? "个",
      quantity,
      purchasePrice,
      purchaseAmount: Number(
        (r.total_price ?? quantity * purchasePrice).toFixed(2)
      ),
      salePrice,
      saleAmount: Number((r.sale_amount ?? quantity * salePrice).toFixed(2)),
      supplier:
        r.supplier ??
        productMap[r.matched_product_id as number]?.supplier ??
        "",
      taxType:
        r.tax_type ??
        productMap[r.matched_product_id as number]?.tax_type ??
        "含税",
      remark: r.remark ?? "",
      matchStatus: (r.match_status ?? "unmatched") as any,
      matchedProducts: []
    };
  });
  const attachmentsList = await listFilesFromSupabase(bucket, String(id), 100);
  const attachments: Attachment[] = await Promise.all(
    (attachmentsList.data ?? []).map(async (o: any) => {
      const objectPath = `${bucket}/${id}/${o.name}`;
      const signed = await getSignedFileUrl(objectPath, 3600, {
        inline: true,
        fileName: o.name
      });
      if (!signed) {
        throw new Error(`附件签名失败: ${objectPath}`);
      }
      return {
        id: o.id ?? 0,
        fileName: o.name,
        fileUrl: signed,
        fileType:
          o.metadata?.mimetype ||
          guessMimeByName(o.name) ||
          "application/octet-stream",
        uploadTime: o.created_at ?? new Date().toISOString()
      };
    })
  );
  const matchedCount = items.filter(i => i.matchStatus === "matched").length;
  const data: Inquiry = {
    id: base.data?.id ?? id,
    name: base.data?.name ?? "",
    company: base.data?.company ?? "",
    date: base.data?.date ?? new Date().toISOString().split("T")[0],
    createTime: base.data?.created_at ?? new Date().toISOString(),
    itemCount: items.length,
    matchedCount,
    attachments,
    items
  };
  return { success: true, data };
};

const addInquirySupabase = async (data: {
  name: string;
  company: string;
  date: string;
}): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const res = await supabase
    .from("inquiries")
    .insert({
      name: data.name,
      company: data.company,
      date: data.date,
      created_at: new Date().toISOString()
    })
    .select("id")
    .single();
  return {
    success: true,
    message: "新增成功",
    data: { id: res.data?.id }
  } as any;
};

const deleteInquirySupabase = async (id: number): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  try {
    // 删除 OSS 中的附件文件
    const attachmentsList = await listFilesFromSupabase(
      bucket,
      String(id),
      1000
    );
    if (attachmentsList.data && attachmentsList.data.length > 0) {
      for (const att of attachmentsList.data) {
        const objectPath = `${bucket}/${id}/${att.name}`;
        const deleteResult = await deleteFileFromSupabase(objectPath);
        if (!deleteResult.success) {
          return {
            success: false,
            message: deleteResult.error || "删除询价附件文件失败"
          };
        }
      }
    }

    // 1. 删除所有询价明细
    const { error: deleteItemsError } = await supabase
      .from("inquiry_items")
      .delete()
      .eq("inquiry_id", id);

    if (deleteItemsError) {
      console.warn("删除询价明细失败:", deleteItemsError);
    }

    // 2. 删除所有询价附件
    const { error: deleteAttachmentsError } = await supabase
      .from("inquiry_attachments")
      .delete()
      .eq("inquiry_id", id);

    if (deleteAttachmentsError) {
      console.warn("删除询价附件失败:", deleteAttachmentsError);
    }

    // 3. 最后删除询价记录
    const { error: deleteInquiryError } = await supabase
      .from("inquiries")
      .delete()
      .eq("id", id);

    if (deleteInquiryError)
      return { success: false, message: deleteInquiryError.message };

    return { success: true, message: "询价及其关联数据已全部删除" };
  } catch (error) {
    console.error("删除询价时发生错误:", error);
    return { success: false, message: "删除失败，请稍后重试" };
  }
};

const saveExcelInquirySupabase = async (data: {
  name: string;
  company: string;
  date: string;
  items: InquiryItem[];
}): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const ins = await supabase
    .from("inquiries")
    .insert({
      name: data.name,
      company: data.company,
      date: data.date,
      created_at: new Date().toISOString()
    })
    .select("id")
    .single();
  const inquiryId = ins.data?.id as number;
  const payload = data.items.map(i => ({
    inquiry_id: inquiryId,
    product_name: i.name,
    specification: i.specification,
    unit: i.unit,
    quantity: i.quantity,
    unit_price: i.purchasePrice,
    sale_price: i.salePrice ?? 0,
    remark: i.remark ?? "",
    match_status: i.matchStatus ?? "unmatched",
    matched_product_id: i.productId ?? null
  }));
  if (payload.length) await supabase.from("inquiry_items").insert(payload);
  return {
    success: true,
    message: "询价单保存成功",
    data: { id: inquiryId }
  } as any;
};

const addInquiryItemsSupabase = async (
  inquiryId: number,
  items: InquiryItem[]
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const payload = items.map(i => ({
    inquiry_id: inquiryId,
    product_name: i.name,
    specification: i.specification,
    unit: i.unit,
    quantity: i.quantity,
    unit_price: i.purchasePrice,
    sale_price: i.salePrice ?? 0,
    remark: i.remark ?? "",
    match_status: i.matchStatus ?? "unmatched",
    matched_product_id: i.productId ?? null
  }));
  if (payload.length) await supabase.from("inquiry_items").insert(payload);
  return { success: true, message: "产品明细导入成功" };
};

const uploadAttachmentSupabase = async (
  inquiryId: number,
  file: File
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  // 使用通用上传工具，确保存储桶及 MIME 配置正确
  const result = await uploadFileToSupabase(file, bucket, String(inquiryId));

  if (!result.success || !result.filePath) {
    console.error("Attachment upload error:", result.error);
    return { success: false, message: result.error ?? "附件上传失败" };
  }

  console.log("Attachment uploaded successfully:", result.filePath);
  return {
    success: true,
    message: "附件上传成功",
    data: { path: result.filePath }
  };
};

const deleteAttachmentSupabase = async (
  inquiryId: number,
  attachmentId: number
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const list = await listFilesFromSupabase(bucket, String(inquiryId), 100);
  const target = (list.data ?? []).find(
    (o: any) => String(o.id ?? "") === String(attachmentId)
  );
  if (!target) return { success: false, message: "附件不存在" };
  const result = await deleteFileFromSupabase(
    `${bucket}/${inquiryId}/${target.name}`
  );
  if (!result.success) return { success: false, message: result.error || "删除失败" };
  return { success: true, message: "附件删除成功" };
};

const updateInquiryItemSupabase = async (
  data: InquiryItem
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const payload: any = {
    product_name: data.name,
    specification: data.specification,
    unit: data.unit,
    quantity: data.quantity,
    unit_price: data.purchasePrice,
    sale_price: data.salePrice ?? 0,
    remark: data.remark ?? "",
    // 新增：更新产品匹配相关字段
    supplier: data.supplier,
    matched_product_id: data.productId,
    match_status: data.matchStatus,
    tax_type: data.taxType
  };
  const res = await supabase
    .from("inquiry_items")
    .update(payload)
    .eq("id", data.id);

  if (res.error) {
    console.error("更新询价明细失败:", res.error);
    return { success: false, message: res.error.message };
  }

  return { success: true, message: "更新成功" };
};

const manualMatchProductSupabase = async (data: {
  inquiryId: number;
  itemId: number;
  productId: number;
}): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const prod = await supabase
    .from("products")
    .select(
      "id,name,specification,unit,purchase_price,remark,tax_type,supplier"
    )
    .eq("id", data.productId)
    .single();
  const p = prod.data;
  if (!p) return { success: false, message: "产品不存在" };
  await supabase
    .from("inquiry_items")
    .update({
      matched_product_id: p.id,
      match_status: "matched",
      product_name: p.name,
      specification: p.specification,
      unit: p.unit,
      unit_price: p.purchase_price,
      supplier: p.supplier,
      tax_type: p.tax_type,
      remark: p.remark ?? ""
    })
    .eq("id", data.itemId)
    .eq("inquiry_id", data.inquiryId);
  return { success: true, message: "手动匹配成功" };
};

/** 利润计算相关Supabase函数 */
const saveProfitCalculationSupabase = async (
  data: ProfitCalculation
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "Supabase未初始化" };

  const now = new Date().toISOString();

  const profitData = {
    inquiry_id: data.inquiryId,
    sale_total: Number(data.saleTotal || 0),
    purchase_total: Number(data.purchaseTotal || 0),
    taxable_purchase_total: Number(data.taxablePurchaseTotal || 0),
    calculated_tax_fee: Number(data.calculatedTaxFee || 0),
    freight_fee: Number(data.freightFee || 0),
    estimated_profit: Number(data.estimatedProfit || 0),
    profit_rate: Number(data.profitRate || 0),
    created_at: now,
    updated_at: now
  };

  try {
    // 1. 先保存利润计算数据
    const { data: existingData, error: checkError } = await supabase
      .from("profit_calculations")
      .select("id")
      .eq("inquiry_id", data.inquiryId);

    // 如果查询出错（包括表不存在或没有权限）
    if (checkError) {
      // 检查是否是表不存在的错误
      if (
        checkError.code === "PGRST116" ||
        checkError.message?.includes(
          'relation "profit_calculations" does not exist'
        )
      ) {
        return {
          success: false,
          message:
            "数据库表 'profit_calculations' 不存在。请在Supabase控制台中手动创建该表。"
        };
      }
      // 其他查询错误
      return { success: false, message: checkError.message };
    }

    if (existingData && existingData.length > 0) {
      const existing = existingData[0];
      // 更新现有数据
      const { error } = await supabase
        .from("profit_calculations")
        .update({ ...profitData, updated_at: now })
        .eq("id", existing.id);

      if (error) return { success: false, message: error.message };
    } else {
      // 插入新数据
      const { error } = await supabase
        .from("profit_calculations")
        .insert(profitData);

      if (error) return { success: false, message: error.message };
    }

    // 2. 保存自定义费用数据（即使为空也需要保存，以清理数据库中的旧记录）
    const customFeesResult = await saveCustomFeesSupabase(
      data.inquiryId,
      data.customFees || []
    );
    if (!customFeesResult.success) {
      return {
        success: false,
        message: `利润计算保存成功，但自定义费用保存失败: ${customFeesResult.message}`
      };
    }

    return { success: true, message: "利润计算数据和自定义费用保存成功" };
  } catch (error: any) {
    // 捕获表不存在的错误
    if (
      error?.code === "PGRST116" ||
      error?.message?.includes('relation "profit_calculations" does not exist')
    ) {
      return {
        success: false,
        message:
          "数据库表 'profit_calculations' 不存在。请在Supabase控制台SQL编辑器中执行以下SQL脚本创建必要的表。"
      };
    }
    return { success: false, message: `保存失败: ${error.message || error}` };
  }
};

const getProfitCalculationSupabase = async (
  inquiryId: number
): Promise<{ success: boolean; data: ProfitCalculation }> => {
  if (!supabase) return { success: false, data: {} as ProfitCalculation };

  try {
    const { data: profitData, error } = await supabase
      .from("profit_calculations")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .single();

    if (error) {
      console.error("查询利润计算数据失败:", {
        inquiryId,
        error: error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details
      });

      // PGRST116 = no rows found，这是正常情况（没有数据）
      if (error.code === "PGRST116") {
        console.log(`询价单 ${inquiryId} 没有利润计算数据`);
        return { success: true, data: {} as ProfitCalculation };
      }

      // 其他错误情况（权限问题、表不存在等）
      console.error(`询价单 ${inquiryId} 利润计算数据查询出错:`, error.message);
      return { success: false, data: {} as ProfitCalculation };
    }

    if (!profitData) {
      return { success: true, data: {} as ProfitCalculation };
    }

    // 获取自定义费用（如果表存在）
    let customFees: CustomFee[] = [];
    try {
      const { data: feesData } = await supabase
        .from("custom_fees")
        .select("*")
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: true });

      customFees = (feesData || []).map((fee: any) => ({
        id: fee.id,
        inquiryId: fee.inquiry_id,
        label: fee.label,
        amount: fee.amount,
        createTime: fee.created_at,
        updateTime: fee.updated_at
      }));
    } catch {
      console.warn("custom_fees table does not exist, using empty fees array");
      customFees = [];
    }

    const profitCalculation: ProfitCalculation = {
      id: profitData.id,
      inquiryId: profitData.inquiry_id,
      saleTotal: Number(profitData.sale_total || 0),
      purchaseTotal: Number(profitData.purchase_total || 0),
      taxablePurchaseTotal: Number(profitData.taxable_purchase_total || 0),
      calculatedTaxFee: Number(profitData.calculated_tax_fee || 0),
      freightFee: Number(profitData.freight_fee || 0),
      estimatedProfit: Number(profitData.estimated_profit || 0),
      profitRate: Number(profitData.profit_rate || 0),
      customFees: customFees,
      createTime: profitData.created_at,
      updateTime: profitData.updated_at
    };

    return { success: true, data: profitCalculation };
  } catch (error: any) {
    // 捕获表不存在的错误
    if (
      error?.code === "PGRST116" ||
      error?.message?.includes('relation "profit_calculations" does not exist')
    ) {
      console.warn(
        "profit_calculations table does not exist, returning empty data"
      );
      return { success: true, data: {} as ProfitCalculation };
    }
    return { success: false, data: {} as ProfitCalculation };
  }
};

const saveCustomFeesSupabase = async (
  inquiryId: number,
  fees: Array<{ label: string; amount: number }>
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "Supabase未初始化" };

  const now = new Date().toISOString();

  // 先删除现有费用
  await supabase.from("custom_fees").delete().eq("inquiry_id", inquiryId);

  // 批量插入新费用
  if (fees.length > 0) {
    const feesData = fees.map(fee => ({
      inquiry_id: inquiryId,
      label: fee.label,
      amount: fee.amount,
      created_at: now,
      updated_at: now
    }));

    const { error } = await supabase.from("custom_fees").insert(feesData);

    if (error) return { success: false, message: error.message };
  }

  return { success: true, message: "自定义费用保存成功" };
};

const deleteInquiryItemsSupabase = async (
  itemIds: number[]
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "Supabase未初始化" };

  try {
    const { error } = await supabase
      .from("inquiry_items")
      .delete()
      .in("id", itemIds);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: `成功删除 ${itemIds.length} 条产品明细` };
  } catch (error) {
    console.error("批量删除询价明细失败:", error);
    return { success: false, message: "删除失败，请稍后重试" };
  }
};

/**
 * 获取所有询价单的产品明细数据
 * 聚合所有询价单明细，包含询价单和公司信息
 */
const getAllInquiryDetailsSupabase = async (
  _forceRefresh: boolean = false
): Promise<{
  success: boolean;
  data?: AllInquiryDetailsItem[];
  message?: string;
}> => {
  if (!supabase) return { success: false, message: "数据库连接失败" };

  try {
    // 查询询价单明细，关联询价单信息
    // 过滤条件：排除进价为0的记录
    const { data: items, error: itemsError } = await supabase
      .from("inquiry_items")
      .select(
        `
        id,
        inquiry_id,
        product_name,
        specification,
        unit,
        quantity,
        unit_price,
        sale_price,
        supplier,
        tax_type,
        remark,
        status,
        match_status,
        created_at,
        updated_at,
        inquiries!inner (
          id,
          name,
          company,
          created_at
        )
      `
      )
      .gt("unit_price", 0) // 只查询进价大于0的记录
      .order("created_at", { ascending: false });

    if (itemsError) {
      console.error("获取询价明细失败:", itemsError);
      return { success: false, message: itemsError.message };
    }

    // 转换数据格式并进行额外的数据质量过滤
    const inquiryDetails: AllInquiryDetailsItem[] = items
      .filter((item: any) => {
        // 确保产品名称不为空，并且进价大于0
        return item.product_name && Number(item.unit_price) > 0;
      })
      .map((item: any) => ({
        id: item.id,
        inquiry_id: item.inquiry_id,
        inquiry_name: item.inquiries?.name || "",
        company_name: item.inquiries?.company || "",
        product_name: item.product_name || "",
        spec_model: item.specification || "", // 数据库字段是 specification
        unit: item.unit || "",
        quantity: item.quantity || 0,
        purchase_price: Number(item.unit_price) || 0, // 确保是数字类型
        sale_price: Number(item.sale_price) || 0,
        supplier: item.supplier || "",
        tax_type: item.tax_type || "",
        remark: item.remark || "",
        status: item.status || 1,
        matched: item.match_status === "matched", // 根据 match_status 判断是否匹配
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

    console.log(
      `[询价明细] 数据过滤完成：原始数据 ${items.length} 条，有效数据 ${inquiryDetails.length} 条`
    );
    return {
      success: true,
      data: inquiryDetails
    };
  } catch (error) {
    console.error("获取所有询价明细失败:", error);
    return {
      success: false,
      message: "获取数据失败，请稍后重试"
    };
  }
};

// 获取单个询价单的明细数据（用于缓存）
export const getInquiryItemsByInquiryId = async (
  inquiryId: number
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "Supabase未初始化" };

  try {
    console.log(`[询价明细缓存] 获取询价单 ${inquiryId} 的明细数据`);

    const { data, error } = await supabase
      .from("inquiry_items")
      .select(
        "id,inquiry_id,matched_product_id,product_name,specification,unit,quantity,unit_price,sale_price,total_price,sale_amount,remark,match_status,supplier,tax_type,created_at,updated_at"
      )
      .eq("inquiry_id", inquiryId)
      .order("id", { ascending: true });

    if (error) {
      console.error("❌ 获取询价明细失败:", error);
      return {
        success: false,
        message: `查询失败: ${error.message}`
      };
    }

    console.log(
      `✅ 成功获取询价单 ${inquiryId} 明细数据，条目数: ${data?.length || 0}`
    );

    return {
      success: true,
      message: "获取成功",
      data: data || []
    };
  } catch (error) {
    console.error("获取询价明细时发生错误:", error);
    return {
      success: false,
      message: `获取失败: ${error instanceof Error ? error.message : "未知错误"}`
    };
  }
};

export {
  getInquiryListSupabase,
  getInquiryDetailSupabase,
  addInquirySupabase,
  deleteInquirySupabase,
  saveExcelInquirySupabase,
  uploadAttachmentSupabase,
  deleteAttachmentSupabase,
  manualMatchProductSupabase,
  updateInquiryItemSupabase,
  addInquiryItemsSupabase,
  saveProfitCalculationSupabase,
  getProfitCalculationSupabase,
  saveCustomFeesSupabase,
  deleteInquiryItemsSupabase,
  getAllInquiryDetailsSupabase
};
