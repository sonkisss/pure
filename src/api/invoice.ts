import {
  invoicesRepository,
  type SalesInvoice,
  type PurchaseInvoice,
  type InvoiceQueryParams,
  type InvoiceStats
} from "@/repositories/invoicesSupabase";

// 销售发票类型定义
export type { SalesInvoice };

// 进项发票类型定义
export type { PurchaseInvoice };

// 发票查询参数
export type { InvoiceQueryParams };

// 发票统计
export type { InvoiceStats };

// 公司统计信息
export interface CompanyStats {
  companyId?: number;
  companyName: string;
  monthlySales: number; // 本月销项金额
  monthlyPurchase?: number; // 本月进项金额
  pendingPurchaseCount?: number; // 未开进项笔数
  estimatedTax?: number; // 预估缴税
  taxBreakdown?: string; // 税收计算明细
  buyers?: Array<{
    name: string;
    amount: number;
  }>;
  sellers?: Array<{
    name: string;
    amount: number;
  }>;
}

// 获取销售发票列表
export const getSalesInvoices = async (params?: InvoiceQueryParams) => {
  try {
    const { data, error } = await invoicesRepository.getSalesInvoices(params);
    if (error) {
      console.error("获取销售发票列表失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("获取销售发票列表异常:", error);
    return { data: null, success: false, error };
  }
};

// 获取进项发票统计（分组）
export const getPurchaseInvoiceStatsGrouped = async (
  companyId?: number,
  year?: number,
  month?: number
) => {
  try {
    const { data, error } =
      await invoicesRepository.getPurchaseInvoiceStatsGrouped(
        companyId,
        year,
        month
      );
    if (error) {
      console.error("获取进项发票统计失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("获取进项发票统计异常:", error);
    return { data: null, success: false, error };
  }
};

// 获取进项发票列表
export const getPurchaseInvoices = async (params?: InvoiceQueryParams) => {
  try {
    const { data, error } =
      await invoicesRepository.getPurchaseInvoices(params);
    if (error) {
      console.error("获取进项发票列表失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("获取进项发票列表异常:", error);
    return { data: [], success: false, error };
  }
};

// 创建销售发票
export const createSalesInvoice = async (
  invoice: Omit<SalesInvoice, "id" | "created_at" | "updated_at">
) => {
  try {
    const { data, error } =
      await invoicesRepository.createSalesInvoice(invoice);
    if (error) {
      console.error("创建销售发票失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("创建销售发票异常:", error);
    return { data: null, success: false, error };
  }
};

// 创建进项发票
export const createPurchaseInvoice = async (
  invoice: Omit<PurchaseInvoice, "id" | "created_at" | "updated_at">
) => {
  try {
    const { data, error } =
      await invoicesRepository.createPurchaseInvoice(invoice);
    if (error) {
      console.error("创建进项发票失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("创建进项发票异常:", error);
    return { data: null, success: false, error };
  }
};

// 更新销售发票
export const updateSalesInvoice = async (
  id: number,
  updates: Partial<SalesInvoice>
) => {
  try {
    const { data, error } = await invoicesRepository.updateSalesInvoice(
      id,
      updates
    );
    if (error) {
      console.error("更新销售发票失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("更新销售发票异常:", error);
    return { data: null, success: false, error };
  }
};

// 更新进项发票
export const updatePurchaseInvoice = async (
  id: number,
  updates: Partial<PurchaseInvoice>
) => {
  try {
    const { data, error } = await invoicesRepository.updatePurchaseInvoice(
      id,
      updates
    );
    if (error) {
      console.error("更新进项发票失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("更新进项发票异常:", error);
    return { data: null, success: false, error };
  }
};

// 删除销售发票
export const deleteSalesInvoice = async (id: number) => {
  try {
    const { error } = await invoicesRepository.deleteSalesInvoice(id);
    if (error) {
      console.error("删除销售发票失败:", error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error("删除销售发票异常:", error);
    return { success: false, error };
  }
};

// 删除进项发票
export const deletePurchaseInvoice = async (id: number) => {
  try {
    const { error } = await invoicesRepository.deletePurchaseInvoice(id);
    if (error) {
      console.error("删除进项发票失败:", error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error("删除进项发票异常:", error);
    return { success: false, error };
  }
};

// 获取销售发票统计
export const getSalesInvoiceStats = async (
  companyId?: number,
  year?: number,
  month?: number
) => {
  try {
    const { data, error } = await invoicesRepository.getSalesInvoiceStats(
      companyId,
      year,
      month
    );
    if (error) {
      console.error("获取销售发票统计失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("获取销售发票统计异常:", error);
    return { data: null, success: false, error };
  }
};

// 获取进项发票统计
export const getPurchaseInvoiceStats = async (
  companyId?: number,
  year?: number,
  month?: number
) => {
  try {
    const { data, error } = await invoicesRepository.getPurchaseInvoiceStats(
      companyId,
      year,
      month
    );
    if (error) {
      console.error("获取进项发票统计失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("获取进项发票统计异常:", error);
    return { data: null, success: false, error };
  }
};

// 获取未开进项发票数量
export const getPendingPurchaseInvoiceCount = async (
  companyId?: number,
  year?: number,
  month?: number
) => {
  try {
    const { data, error } =
      await invoicesRepository.getPendingPurchaseInvoiceCount(
        companyId,
        year,
        month
      );
    if (error) {
      console.error("获取未开进项发票数量失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("获取未开进项发票数量异常:", error);
    return { data: 0, success: false, error };
  }
};

// 上传发票文件
export const uploadInvoiceFile = async (
  file: File,
  fileName: string,
  type: "sales" | "purchase"
) => {
  try {
    // 验证输入参数
    if (!file) {
      throw new Error("文件对象为空");
    }
    if (!fileName || typeof fileName !== "string") {
      fileName = file.name || `invoice_${Date.now()}.pdf`;
    }
    if (!type || !["sales", "purchase"].includes(type)) {
      type = "sales";
    }

    // 提取文件扩展名
    const fileExtension = fileName.includes(".")
      ? fileName.split(".").pop()
      : "pdf";

    // 生成安全的文件名（不包含中文字符）
    const timestamp = new Date().getTime();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeFileName = `invoice_${timestamp}_${randomSuffix}.${fileExtension}`;

    // 构建完整的文件路径
    const folderPrefix =
      type === "sales" ? "sales_invoices/" : "purchase_invoices/";
    const filePath = `${folderPrefix}${safeFileName}`;

    console.log("🚀 开始上传文件:", {
      originalFileName: file.name,
      safeFileName: safeFileName,
      type: type,
      filePath: filePath,
      fileSize: file.size,
      fileType: file.type
    });

    const { data, error } = await invoicesRepository.uploadInvoiceFile(
      file,
      filePath
    );
    if (error) {
      console.error("❌ 上传发票文件失败:", error);
      throw new Error(`文件上传失败: ${error.message || error}`);
    }

    // 获取公共URL
    const { data: urlData } =
      await invoicesRepository.getInvoicePublicUrl(filePath);
    if (!urlData) {
      throw new Error("获取文件访问URL失败");
    }

    const accessibleUrl = urlData.signedUrl || urlData.publicUrl;

    console.log("✅ 文件上传成功:", {
      path: data?.path || filePath,
      url: accessibleUrl,
      safeFileName: safeFileName,
      originalName: file.name
    });

    return {
      data: {
        path: data?.path || filePath,
        url: accessibleUrl,
        publicUrl: urlData.publicUrl,
        signedUrl: urlData.signedUrl,
        fileName: safeFileName, // 数据库中存储安全文件名
        originalName: file.name // 保留原始文件名用于显示
      },
      success: true
    };
  } catch (error) {
    console.error("❌ 上传发票文件异常:", error);
    const errorMessage =
      error instanceof Error ? error.message : "上传过程中发生未知错误";
    return {
      data: null,
      success: false,
      error: new Error(errorMessage)
    };
  }
};

// 删除发票文件
export const deleteInvoiceFile = async (filePath: string) => {
  try {
    const { error } = await invoicesRepository.deleteInvoiceFile(filePath);
    if (error) {
      console.error("删除发票文件失败:", error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error("删除发票文件异常:", error);
    return { success: false, error };
  }
};

// 批量导入销售发票
export const batchImportSalesInvoices = async (
  invoices: Omit<SalesInvoice, "id" | "created_at" | "updated_at">[]
) => {
  try {
    const { data, error } =
      await invoicesRepository.batchCreateSalesInvoices(invoices);
    if (error) {
      console.error("批量导入销售发票失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("批量导入销售发票异常:", error);
    return { data: null, success: false, error };
  }
};

// 批量导入进项发票
export const batchImportPurchaseInvoices = async (
  invoices: Omit<PurchaseInvoice, "id" | "created_at" | "updated_at">[]
) => {
  try {
    const { data, error } =
      await invoicesRepository.batchCreatePurchaseInvoices(invoices);
    if (error) {
      console.error("批量导入进项发票失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("批量导入进项发票异常:", error);
    return { data: null, success: false, error };
  }
};

// 导出销售发票到Excel
export const exportSalesInvoicesToExcel = async (
  params?: InvoiceQueryParams
) => {
  try {
    const { data } = await getSalesInvoices(params);
    if (!data || data.length === 0) {
      return { data: null, success: false, error: "没有数据可导出" };
    }

    const exportData = data.map(invoice => ({
      销售方: invoice.seller_name,
      购买方: invoice.buyer_name,
      发票金额: invoice.total_amount,
      开票日期: invoice.invoice_date,
      发票号码: invoice.invoice_number || "",
      备注: invoice.remarks || ""
    }));

    return { data: exportData, success: true };
  } catch (error) {
    console.error("导出销售发票异常:", error);
    return { data: null, success: false, error };
  }
};

// 导出进项发票到Excel
export const exportPurchaseInvoicesToExcel = async (
  params?: InvoiceQueryParams
) => {
  try {
    const { data } = await getPurchaseInvoices(params);
    if (!data || data.length === 0) {
      return { data: null, success: false, error: "没有数据可导出" };
    }

    const exportData = data.map(invoice => ({
      销售方: invoice.seller_name,
      购买方: invoice.buyer_name,
      打款金额: invoice.payment_amount,
      打款日期: invoice.payment_date,
      发票类型: invoice.invoice_type,
      发票号码: invoice.invoice_number || "",
      是否开票: invoice.invoice_issued ? "已开" : "未开",
      备注: invoice.remarks || ""
    }));

    return { data: exportData, success: true };
  } catch (error) {
    console.error("导出进项发票异常:", error);
    return { data: null, success: false, error };
  }
};

// 兼容性方法，保持与原有接口的兼容性
export const getSalesInvoiceList = getSalesInvoices;
export const getPurchaseInvoiceList = getPurchaseInvoices;
export const addInvoice = (data: any) => {
  if (data.type === "sales") {
    return createSalesInvoice(data);
  } else {
    return createPurchaseInvoice(data);
  }
};
export const updateInvoice = (data: any) => {
  if (data.type === "sales") {
    return updateSalesInvoice(data.id, data);
  } else {
    return updatePurchaseInvoice(data.id, data);
  }
};
export const deleteInvoice = (data: any) => {
  if (data.type === "sales") {
    return deleteSalesInvoice(data.id);
  } else {
    return deletePurchaseInvoice(data.id);
  }
};

// 导出获取发票公共URL的方法
export const getInvoicePublicUrl = async (
  filePath: string,
  options?: { inline?: boolean; fileName?: string }
) => {
  try {
    const { data, error } =
      await invoicesRepository.getInvoicePublicUrl(filePath, options);
    if (error) {
      console.error("获取发票URL失败:", error);
      throw error;
    }
    return { data, success: true };
  } catch (error) {
    console.error("获取发票URL异常:", error);
    return { data: null, success: false, error };
  }
};
