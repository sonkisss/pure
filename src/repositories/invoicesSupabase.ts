import { supabase } from "@/services/supabase";
import {
  uploadFileToPath,
  getPublicFileUrl,
  getSignedFileUrl,
  deleteFileFromSupabase
} from "@/services/storage";

// 销售发票类型定义
export interface SalesInvoice {
  id?: number;
  seller_id: number;
  buyer_id: number;
  seller_name: string;
  buyer_name: string;
  total_amount: number;
  invoice_date: string;
  invoice_number?: string;
  invoice_url?: string;
  invoice_file_name?: string;
  original_file_name?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// 进项发票类型定义
export interface PurchaseInvoice {
  id?: number;
  seller_id: number;
  buyer_id: number;
  seller_name: string;
  buyer_name: string;
  payment_amount: number;
  payment_date: string;
  invoice_type: "专票" | "普票" | "其他";
  invoice_number?: string;
  invoice_issued?: boolean;
  invoice_url?: string;
  invoice_file_name?: string;
  original_file_name?: string;
  payment_voucher_url?: string;
  payment_voucher_file_name?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// 发票查询参数
export interface InvoiceQueryParams {
  seller_id?: number;
  buyer_id?: number;
  company_id?: number; // 用于查询与指定公司相关的发票
  start_date?: string;
  end_date?: string;
  year?: number;
  month?: number;
  invoice_type?: string;
  invoice_issued?: boolean;
  limit?: number;
  offset?: number;
  order_by?: string;
  ascending?: boolean;
}

// 发票统计
export interface InvoiceStats {
  total_amount: number;
  total_count: number;
  month_amount: number;
  month_count: number;
}

export class InvoicesSupabaseRepository {
  // 销售发票相关方法
  async getSalesInvoices(
    params?: InvoiceQueryParams
  ): Promise<{ data: SalesInvoice[]; error: any }> {
    let query = supabase.from("sales_invoices").select("*");

    // 应用筛选条件
    if (params) {
      if (params.company_id) {
        query = query.or(
          `seller_id.eq.${params.company_id},buyer_id.eq.${params.company_id}`
        );
      }
      if (params.seller_id) {
        query = query.eq("seller_id", params.seller_id);
      }
      if (params.buyer_id) {
        query = query.eq("buyer_id", params.buyer_id);
      }
      if (params.start_date) {
        query = query.gte("invoice_date", params.start_date);
      }
      if (params.end_date) {
        query = query.lte("invoice_date", params.end_date);
      }
      if (params.year && params.month) {
        const startDate = `${params.year}-${params.month.toString().padStart(2, "0")}-01`;
        const endDate = new Date(params.year, params.month, 0)
          .toISOString()
          .split("T")[0];
        query = query
          .gte("invoice_date", startDate)
          .lte("invoice_date", endDate);
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = (query as any).offset(params.offset);
      }
      if (params.order_by) {
        query = query.order(params.order_by, {
          ascending: params.ascending ?? false
        });
      } else {
        query = query.order("created_at", { ascending: false });
      }
    }

    const { data, error } = await query;
    return { data: data || [], error };
  }

  async createSalesInvoice(
    invoice: Omit<SalesInvoice, "id" | "created_at" | "updated_at">
  ): Promise<{ data: SalesInvoice | null; error: any }> {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data, error } = await supabase
      .from("sales_invoices")
      .insert([
        {
          ...invoice,
          created_by: userId
        }
      ])
      .select()
      .single();

    return { data, error };
  }

  async updateSalesInvoice(
    id: number,
    updates: Partial<SalesInvoice>
  ): Promise<{ data: SalesInvoice | null; error: any }> {
    const { data, error } = await supabase
      .from("sales_invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  }

  async deleteSalesInvoice(id: number): Promise<{ error: any }> {
    const { error } = await supabase
      .from("sales_invoices")
      .delete()
      .eq("id", id);

    return { error };
  }

  // 进项发票相关方法
  async getPurchaseInvoices(
    params?: InvoiceQueryParams
  ): Promise<{ data: PurchaseInvoice[]; error: any }> {
    let query = supabase.from("purchase_invoices").select("*");

    // 应用筛选条件
    if (params) {
      if (params.company_id) {
        query = query.or(
          `seller_id.eq.${params.company_id},buyer_id.eq.${params.company_id}`
        );
      }
      if (params.seller_id) {
        query = query.eq("seller_id", params.seller_id);
      }
      if (params.buyer_id) {
        query = query.eq("buyer_id", params.buyer_id);
      }
      if (params.start_date) {
        query = query.gte("payment_date", params.start_date);
      }
      if (params.end_date) {
        query = query.lte("payment_date", params.end_date);
      }
      if (params.year && params.month) {
        const startDate = `${params.year}-${params.month.toString().padStart(2, "0")}-01`;
        const endDate = new Date(params.year, params.month, 0)
          .toISOString()
          .split("T")[0];
        query = query
          .gte("payment_date", startDate)
          .lte("payment_date", endDate);
      }
      if (params.invoice_type) {
        query = query.eq("invoice_type", params.invoice_type);
      }
      if (params.invoice_issued !== undefined) {
        query = query.eq("invoice_issued", params.invoice_issued);
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = (query as any).offset(params.offset);
      }
      if (params.order_by) {
        query = query.order(params.order_by, {
          ascending: params.ascending ?? false
        });
      } else {
        query = query.order("created_at", { ascending: false });
      }
    }

    const { data, error } = await query;
    return { data: data || [], error };
  }

  async createPurchaseInvoice(
    invoice: Omit<PurchaseInvoice, "id" | "created_at" | "updated_at">
  ): Promise<{ data: PurchaseInvoice | null; error: any }> {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data, error } = await supabase
      .from("purchase_invoices")
      .insert([
        {
          ...invoice,
          created_by: userId
        }
      ])
      .select()
      .single();

    return { data, error };
  }

  async updatePurchaseInvoice(
    id: number,
    updates: Partial<PurchaseInvoice>
  ): Promise<{ data: PurchaseInvoice | null; error: any }> {
    const { data, error } = await supabase
      .from("purchase_invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  }

  async deletePurchaseInvoice(id: number): Promise<{ error: any }> {
    const { error } = await supabase
      .from("purchase_invoices")
      .delete()
      .eq("id", id);

    return { error };
  }

  // 统计方法
  async getSalesInvoiceStats(
    companyId?: number,
    year?: number,
    month?: number
  ): Promise<{ data: any | null; error: any }> {
    let query = supabase.from("sales_invoices").select("*");

    if (companyId) {
      query = query.or(`seller_id.eq.${companyId},buyer_id.eq.${companyId}`);
    }

    if (year && month) {
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      query = query.gte("invoice_date", startDate).lte("invoice_date", endDate);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return { data: null, error };
    }

    // 按 seller_name 分组统计
    const sellerMap = new Map<
      string,
      {
        totalAmount: number;
        buyers: Map<string, number>;
      }
    >();

    data.forEach(item => {
      const sellerName = item.seller_name || "未知销售方";
      const buyerName = item.buyer_name || "未知购买方";
      const amount = item.total_amount || 0;

      if (!sellerMap.has(sellerName)) {
        sellerMap.set(sellerName, {
          totalAmount: 0,
          buyers: new Map()
        });
      }

      const sellerData = sellerMap.get(sellerName)!;
      sellerData.totalAmount += amount;

      const currentBuyerAmount = sellerData.buyers.get(buyerName) || 0;
      sellerData.buyers.set(buyerName, currentBuyerAmount + amount);
    });

    // 转换为前端需要的格式
    const result = Array.from(sellerMap.entries())
      .map(([sellerName, data]) => ({
        companyName: sellerName,
        monthlySales: data.totalAmount,
        buyers: Array.from(data.buyers.entries())
          .map(([buyerName, amount]) => ({
            name: buyerName,
            amount: amount
          }))
          .sort((a, b) => b.amount - a.amount)
      }))
      .sort((a, b) => b.monthlySales - a.monthlySales);

    return { data: result, error: null };
  }

  // 获取进项发票统计（分组）
  async getPurchaseInvoiceStatsGrouped(
    companyId?: number,
    year?: number,
    month?: number
  ): Promise<{ data: any | null; error: any }> {
    let query = supabase.from("purchase_invoices").select("*");

    if (companyId) {
      query = query.or(`seller_id.eq.${companyId},buyer_id.eq.${companyId}`);
    }

    if (year && month) {
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      query = query.gte("payment_date", startDate).lte("payment_date", endDate);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return { data: null, error };
    }

    // 按 buyer_name (购买方，即我们公司) 分组统计
    // 同时也需要收集 company_id (buyer_id)，但要注意同一 buyer_name 可能对应多个 buyer_id (如果数据不一致)
    // 或者我们直接使用 buyer_id 作为 key，然后再获取名称？
    // 为了稳妥，我们使用 buyer_id 作为主要分组依据，如果 buyer_id 为空则回退到 buyer_name

    // 重新设计数据结构
    interface BuyerInfo {
      id: number | null;
      name: string;
      totalAmount: number;
      sellers: Map<string, number>;
    }

    const buyerMap = new Map<string, BuyerInfo>();

    data.forEach((item: any) => {
      const buyerName = item.buyer_name || "未知购买方";
      const buyerId = item.buyer_id;
      const sellerName = item.seller_name || "未知销售方";
      const amount = item.payment_amount || 0;

      // 使用 "ID_NAME" 作为唯一键，防止同名不同ID或同ID不同名（虽然理论上不应发生）
      // 如果没有ID，则只用Name
      const uniqueKey = buyerId ? `${buyerId}` : buyerName;

      if (!buyerMap.has(uniqueKey)) {
        buyerMap.set(uniqueKey, {
          id: buyerId || null,
          name: buyerName,
          totalAmount: 0,
          sellers: new Map()
        });
      }

      const buyerData = buyerMap.get(uniqueKey)!;
      buyerData.totalAmount += amount;

      // 如果之前没有ID现在有了，更新ID
      if (!buyerData.id && buyerId) {
        buyerData.id = buyerId;
      }

      const currentSellerAmount = buyerData.sellers.get(sellerName) || 0;
      buyerData.sellers.set(sellerName, currentSellerAmount + amount);
    });

    // 并行获取未开票数量
    const finalResult = await Promise.all(
      Array.from(buyerMap.values()).map(async info => {
        let pendingCount = 0;
        if (info.id) {
          const countRes = await this.getPendingPurchaseInvoiceCount(
            info.id,
            year,
            month
          );
          pendingCount = countRes.data || 0;
        } else {
          // 如果没有ID，尝试用名字去匹配 ID (备选方案，或者直接返回0)
          // 暂时返回0
        }

        return {
          companyName: info.name,
          monthlyPurchase: info.totalAmount,
          pendingPurchaseCount: pendingCount,
          sellers: Array.from(info.sellers.entries())
            .map(([sellerName, amount]) => ({
              name: sellerName,
              amount: amount
            }))
            .sort((a, b) => b.amount - a.amount)
        };
      })
    );

    return {
      data: finalResult.sort((a, b) => b.monthlyPurchase - a.monthlyPurchase),
      error: null
    };
  }

  async getPurchaseInvoiceStats(
    companyId?: number,
    year?: number,
    month?: number
  ): Promise<{ data: InvoiceStats | null; error: any }> {
    let query = supabase.from("purchase_invoices").select("payment_amount");

    if (companyId) {
      query = query.or(`seller_id.eq.${companyId},buyer_id.eq.${companyId}`);
    }

    if (year && month) {
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      query = query.gte("payment_date", startDate).lte("payment_date", endDate);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return { data: null, error };
    }

    const stats: InvoiceStats = {
      total_amount: data.reduce(
        (sum, item) => sum + (item.payment_amount || 0),
        0
      ),
      total_count: data.length,
      month_amount: data.reduce(
        (sum, item) => sum + (item.payment_amount || 0),
        0
      ),
      month_count: data.length
    };

    return { data: stats, error: null };
  }

  // 获取未开进项发票数量
  async getPendingPurchaseInvoiceCount(
    companyId?: number,
    year?: number,
    month?: number
  ): Promise<{ data: number; error: any }> {
    let query = supabase
      .from("purchase_invoices")
      .select("id", { count: "exact" })
      .eq("invoice_issued", false);

    if (companyId) {
      // 进项发票的未开票统计，应该只统计作为购买方（buyer_id）的情况
      // 如果作为销售方出现在 purchase_invoices 表中，那应该是数据异常或是别人的进项
      query = query.eq("buyer_id", companyId);
    }

    if (year && month) {
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      query = query.gte("payment_date", startDate).lte("payment_date", endDate);
    }

    const { error, count } = await query;

    if (error) {
      return { data: 0, error };
    }

    return { data: count || 0, error: null };
  }

  // 批量操作
  async batchCreateSalesInvoices(
    invoices: Omit<SalesInvoice, "id" | "created_at" | "updated_at">[]
  ): Promise<{ data: SalesInvoice[] | null; error: any }> {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data, error } = await supabase
      .from("sales_invoices")
      .insert(
        invoices.map(invoice => ({
          ...invoice,
          created_by: userId
        }))
      )
      .select();

    return { data, error };
  }

  async batchCreatePurchaseInvoices(
    invoices: Omit<PurchaseInvoice, "id" | "created_at" | "updated_at">[]
  ): Promise<{ data: PurchaseInvoice[] | null; error: any }> {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data, error } = await supabase
      .from("purchase_invoices")
      .insert(
        invoices.map(invoice => ({
          ...invoice,
          created_by: userId
        }))
      )
      .select();

    return { data, error };
  }

  // 文件上传方法
  async uploadInvoiceFile(
    file: File,
    filePath: string
  ): Promise<{ data: { path: string } | null; error: any }> {
    const fullPath = `invoices/${filePath}`;
    const result = await uploadFileToPath(file, fullPath);

    if (result.success) {
      return { data: { path: filePath }, error: null };
    } else {
      return { data: null, error: new Error(result.error) };
    }
  }

  async getInvoicePublicUrl(
    filePath: string,
    options?: { inline?: boolean; fileName?: string }
  ): Promise<{ data: { publicUrl: string; signedUrl: string } | null; error: any }> {
    const fullPath = `invoices/${filePath}`;
    // 私有 Bucket 需要签名 URL，生成一个可用的临时访问地址（默认 7 天有效）
    const signedUrlRaw = await getSignedFileUrl(fullPath, 7 * 24 * 3600, {
      inline: options?.inline ?? true,
      fileName: options?.fileName
    });
    if (!signedUrlRaw) {
      return { data: null, error: new Error("签名URL生成失败") };
    }
    return { data: { publicUrl: "", signedUrl: signedUrlRaw }, error: null };
  }

  // 上传打款凭证文件
  async uploadVoucherFile(
    file: File,
    filePath: string
  ): Promise<{ data: { path: string } | null; error: any }> {
    const fullPath = `supplier-vouchers/${filePath}`;
    const result = await uploadFileToPath(file, fullPath);

    if (result.success) {
      return { data: { path: filePath }, error: null };
    } else {
      return { data: null, error: new Error(result.error) };
    }
  }

  // 获取打款凭证公共URL
  async getVoucherPublicUrl(
    filePath: string
  ): Promise<{ data: { publicUrl: string } | null; error: any }> {
    const fullPath = `supplier-vouchers/${filePath}`;
    const url = getPublicFileUrl(fullPath);
    return { data: { publicUrl: url }, error: null };
  }

  async deleteInvoiceFile(filePath: string): Promise<{ error: any }> {
    const fullPath = `invoices/${filePath}`;
    const result = await deleteFileFromSupabase(fullPath);
    
    if (result.success) {
      return { error: null };
    } else {
      return { error: new Error(result.error) };
    }
  }
}

// 导出单例实例
export const invoicesRepository = new InvoicesSupabaseRepository();
