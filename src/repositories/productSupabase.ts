import { supabase } from "@/services/supabase";
import { ExcelParser } from "@/utils/excelParser";
import type {
  Product,
  ProductListResult,
  OperationResult
} from "@/api/product";

const getProductListSupabase = async (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<ProductListResult> => {
  if (!supabase) return { success: false, data: { list: [], total: 0 } } as any;
  const page = Number(data?.page ?? 1);
  const pageSize = Number(data?.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("products")
    .select(
      "id,name,specification,unit,purchase_price,remark,tax_type,supplier,created_at",
      { count: "exact" }
    );
  if (data?.keyword && data.keyword.trim()) {
    const kw = `%${data.keyword}%`;
    query = query.or(
      `name.ilike.${kw},specification.ilike.${kw},supplier.ilike.${kw}`
    );
  }
  const res = await query.range(from, to);
  const list: Product[] = (res.data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    specification: r.specification ?? "",
    unit: r.unit ?? "",
    price: Number(r.purchase_price ?? 0),
    supplier: r.supplier ?? "",
    taxType: r.tax_type ?? "",
    remark: r.remark ?? "",
    createTime: r.created_at ?? new Date().toISOString()
  }));
  return { success: true, data: { list, total: res.count ?? 0 } };
};

const addProductSupabase = async (
  data: Omit<Product, "id" | "createTime">
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  // 重复校验：全部字段一致则不允许添加
  const dupCandidates = await supabase
    .from("products")
    .select("id,unit,purchase_price,supplier")
    .eq("name", data.name)
    .eq("specification", data.specification)
    .eq("unit", data.unit)
    .eq("supplier", data.supplier)
    .eq("purchase_price", data.price)
    .limit(10);
  if ((dupCandidates.data ?? []).length > 0)
    return {
      success: false,
      message: "产品已存在（名称+规格型号+单位+进价+供应商 一致）"
    };

  const payload = {
    name: data.name,
    specification: data.specification,
    unit: data.unit,
    purchase_price: data.price,
    supplier: data.supplier,
    tax_type: data.taxType || null,
    remark: data.remark ?? "",
    created_at: new Date().toISOString()
  };
  const ins = await supabase
    .from("products")
    .insert(payload)
    .select("id")
    .single();
  if (ins.error) return { success: false, message: ins.error.message };
  return { success: true, message: "添加成功", data: { id: ins.data?.id } };
};

const updateProductSupabase = async (
  data: Product
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  // 重复校验（排除自身）：名称+规格型号+供应商 完全相同则不允许更新
  const dup = await supabase
    .from("products")
    .select("id")
    .eq("name", data.name)
    .eq("specification", data.specification)
    .eq("supplier", data.supplier)
    .neq("id", data.id)
    .limit(1);
  if ((dup.data ?? []).length > 0)
    return {
      success: false,
      message: "更新后与现有产品重复（名称+规格型号+供应商）"
    };

  const payload = {
    name: data.name,
    specification: data.specification,
    unit: data.unit,
    purchase_price: data.price,
    supplier: data.supplier,
    tax_type: data.taxType || null,
    remark: data.remark ?? ""
  };
  const up = await supabase.from("products").update(payload).eq("id", data.id);
  if (up.error) return { success: false, message: up.error.message };
  return { success: true, message: "更新成功" };
};

const deleteProductSupabase = async (id: number): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  try {
    // 1. 检查产品是否被询价记录引用
    const { data: inquiryItems, error: checkError } = await supabase
      .from("inquiry_items")
      .select("id")
      .eq("matched_product_id", id)
      .limit(1);

    if (checkError) {
      console.warn("检查产品引用关系失败:", checkError);
    }

    // 如果产品被询价记录引用，不允许删除
    if (inquiryItems && inquiryItems.length > 0) {
      return {
        success: false,
        message: "该产品已被询价记录引用，无法删除。请先删除相关的询价记录。"
      };
    }

    // 2. 删除产品记录
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (deleteError) return { success: false, message: deleteError.message };

    return { success: true, message: "产品删除成功" };
  } catch (error) {
    console.error("删除产品时发生错误:", error);
    return { success: false, message: "删除失败，请稍后重试" };
  }
};

const batchDeleteProductSupabase = async (
  ids: number[]
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };

  try {
    // 1. 检查是否有产品被询价记录引用
    const { data: inquiryItems, error: checkError } = await supabase
      .from("inquiry_items")
      .select("id, matched_product_id")
      .in("matched_product_id", ids)
      .limit(1);

    if (checkError) {
      console.warn("检查产品引用关系失败:", checkError);
    }

    // 如果有产品被询价记录引用，不允许删除
    if (inquiryItems && inquiryItems.length > 0) {
      return {
        success: false,
        message: "部分产品已被询价记录引用，无法删除。请先删除相关的询价记录。"
      };
    }

    // 2. 批量删除产品记录
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .in("id", ids);

    if (deleteError) return { success: false, message: deleteError.message };

    return { success: true, message: "批量删除产品成功" };
  } catch (error) {
    console.error("批量删除产品时发生错误:", error);
    return { success: false, message: "批量删除失败，请稍后重试" };
  }
};

const batchAddProductsSupabase = async (
  formData: FormData
): Promise<OperationResult> => {
  if (!supabase) return { success: false, message: "no client" };
  const file = formData.get("file") as File | null;
  if (!file) return { success: false, message: "未选择文件" };
  try {
    const items = await ExcelParser.parseProductExcelFile(file);
    if (!items.length) return { success: false, message: "Excel数据为空" };
    const allowedTax = ["含税", "普票", "不含"];
    type PendingRow = {
      rowNumber: number;
      name: string;
      specification: string;
      unit: string;
      price: number;
      supplier: string;
      tax: string;
      remark: string;
      keyExact: string;
      keyGroup: string;
      skipped?: boolean;
      failReason?: string;
    };
    const pendingRows: PendingRow[] = [];
    const failed: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const name = String(it.name || "").trim();
      const spec = String(it.specification || "").trim();
      const unit = String(it.unit || "").trim() || "个";
      const price = Number(it.purchasePrice ?? 0);
      const supplier = String(it.supplier || "").trim();
      const tax = String(it.taxType || "").trim();
      const remark = String(it.remark || "").trim();
      const rowNumber = i + 2;

      if (
        !name ||
        !spec ||
        supplier === "" ||
        isNaN(price) ||
        price < 0 ||
        !allowedTax.includes(tax)
      ) {
        failed.push({
          行号: rowNumber,
          产品名称: name,
          规格型号: spec,
          单位: unit,
          进价: it.purchasePrice,
          供应商: supplier,
          含税: tax,
          备注: remark,
          失败原因: "字段校验失败"
        });
        continue;
      }

      pendingRows.push({
        rowNumber,
        name,
        specification: spec,
        unit,
        price,
        supplier,
        tax,
        remark,
        keyExact: `${name}||${spec}||${price}||${supplier}`,
        keyGroup: `${name}||${spec}||${supplier}`
      });
    }

    // 规则1：同一文件内完全一致的记录全部失败
    const exactMap = new Map<string, PendingRow[]>();
    pendingRows.forEach(row => {
      const list = exactMap.get(row.keyExact) ?? [];
      list.push(row);
      exactMap.set(row.keyExact, list);
    });
    for (const rows of exactMap.values()) {
      if (rows.length > 1) {
        rows.forEach(row => {
          row.skipped = true;
          row.failReason = "与导入文件中重复(名称+规格+进价+供应商)";
          failed.push({
            行号: row.rowNumber,
            产品名称: row.name,
            规格型号: row.specification,
            单位: row.unit,
            进价: row.price,
            供应商: row.supplier,
            含税: row.tax,
            备注: row.remark,
            失败原因: row.failReason
          });
        });
      }
    }

    // 规则3：同品同供应商不同进价，仅保留最低
    const groupMap = new Map<string, PendingRow[]>();
    pendingRows.forEach(row => {
      const list = groupMap.get(row.keyGroup) ?? [];
      list.push(row);
      groupMap.set(row.keyGroup, list);
    });
    for (const rows of groupMap.values()) {
      if (!rows.length) continue;
      const minPrice = Math.min(...rows.map(r => r.price));
      rows.forEach(row => {
        if (row.skipped) return;
        if (row.price > minPrice) {
          row.skipped = true;
          row.failReason = "存在更低进价记录（名称+规格+供应商）";
          failed.push({
            行号: row.rowNumber,
            产品名称: row.name,
            规格型号: row.specification,
            单位: row.unit,
            进价: row.price,
            供应商: row.supplier,
            含税: row.tax,
            备注: row.remark,
            失败原因: row.failReason
          });
        }
      });
    }

    const rowsToInsert: any[] = [];
    const rowsToUpdate: Array<{
      id: number;
      rowNumber: number;
      data: any;
      originalRow?: PendingRow;
    }> = [];
    let updateCount = 0;

    for (const row of pendingRows) {
      if (row.skipped) continue;

      // 检查完全重复（名称+规格+进价+供应商）
      const exactDup = await supabase
        .from("products")
        .select("id", { head: true, count: "exact" })
        .eq("name", row.name)
        .eq("specification", row.specification)
        .eq("purchase_price", row.price)
        .eq("supplier", row.supplier);
      if ((exactDup.count ?? 0) > 0) {
        failed.push({
          行号: row.rowNumber,
          产品名称: row.name,
          规格型号: row.specification,
          单位: row.unit,
          进价: row.price,
          供应商: row.supplier,
          含税: row.tax,
          备注: row.remark,
          失败原因: "与现有数据重复(名称+规格+进价+供应商)"
        });
        continue;
      }

      // 检查同品同供应商但价格不同的情况
      const sameProduct = await supabase
        .from("products")
        .select("id, purchase_price")
        .eq("name", row.name)
        .eq("specification", row.specification)
        .eq("supplier", row.supplier)
        .limit(1)
        .maybeSingle();

      if (sameProduct.error) {
        console.error("查询同品同供应商产品失败:", sameProduct.error);
      }

      if (sameProduct.data) {
        const existingPrice = Number(sameProduct.data.purchase_price ?? 0);
        console.log(
          `[导入] 发现同品同供应商: ${row.name} ${row.specification}, 现有价格: ${existingPrice}, 导入价格: ${row.price}`
        );
        if (row.price < existingPrice) {
          // 导入价更低，更新旧记录
          console.log(
            `[导入] 准备更新产品 ID ${sameProduct.data.id}, 价格从 ${existingPrice} 更新为 ${row.price}`
          );
          rowsToUpdate.push({
            id: sameProduct.data.id,
            rowNumber: row.rowNumber,
            originalRow: row,
            data: {
              unit: row.unit,
              purchase_price: row.price,
              tax_type: row.tax,
              remark: row.remark
            }
          });
          continue;
        } else if (row.price > existingPrice) {
          // 导入价更高，标记失败
          failed.push({
            行号: row.rowNumber,
            产品名称: row.name,
            规格型号: row.specification,
            单位: row.unit,
            进价: row.price,
            供应商: row.supplier,
            含税: row.tax,
            备注: row.remark,
            失败原因: `导入价格(${row.price})高于现有价格(${existingPrice})，导入失败`
          });
          continue;
        } else {
          // 价格相同，但可能其他字段不同，检查是否完全重复
          // 如果价格相同，已经在前面检查过完全重复了，这里应该不会走到
          // 但为了安全，还是继续插入流程（会被完全重复检查拦截）
        }
      }

      // 不存在同品同供应商的产品，正常插入
      rowsToInsert.push({
        name: row.name,
        specification: row.specification,
        unit: row.unit,
        purchase_price: row.price,
        supplier: row.supplier,
        tax_type: row.tax,
        remark: row.remark,
        created_at: new Date().toISOString()
      });
    }

    if (rowsToInsert.length) {
      const ins = await supabase.from("products").insert(rowsToInsert);
      if (ins.error) return { success: false, message: ins.error.message };
    }

    // 执行更新操作
    console.log(`[导入] 准备更新 ${rowsToUpdate.length} 条记录`);
    for (const updateItem of rowsToUpdate) {
      console.log(
        `[导入] 正在更新产品 ID ${updateItem.id}, 数据:`,
        updateItem.data
      );
      const upd = await supabase
        .from("products")
        .update(updateItem.data)
        .eq("id", updateItem.id);
      if (upd.error) {
        console.error(`[导入] 更新产品 ${updateItem.id} 失败:`, upd.error);
        // 更新失败，记录到失败列表
        if (updateItem.originalRow) {
          failed.push({
            行号: updateItem.rowNumber,
            产品名称: updateItem.originalRow.name,
            规格型号: updateItem.originalRow.specification,
            单位: updateItem.originalRow.unit,
            进价: updateItem.originalRow.price,
            供应商: updateItem.originalRow.supplier,
            含税: updateItem.originalRow.tax,
            备注: updateItem.originalRow.remark,
            失败原因: `更新失败: ${upd.error.message || "未知错误"}`
          });
        }
      } else {
        console.log(`[导入] 成功更新产品 ID ${updateItem.id}`);
        updateCount++;
      }
    }

    const totalSuccess = rowsToInsert.length + updateCount;
    return {
      success: true,
      message: "导入完成",
      data: {
        successCount: totalSuccess,
        insertCount: rowsToInsert.length,
        updateCount: updateCount,
        failCount: failed.length,
        failedProducts: failed
      }
    } as any;
  } catch (e: any) {
    return { success: false, message: e?.message ?? "Excel解析失败" };
  }
};

export {
  getProductListSupabase,
  addProductSupabase,
  updateProductSupabase,
  deleteProductSupabase,
  batchDeleteProductSupabase,
  batchAddProductsSupabase
};
