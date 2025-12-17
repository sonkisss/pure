import { http } from "@/utils/http";
import { supabase } from "@/services/supabase";
import {
  getProductListSupabase,
  addProductSupabase,
  updateProductSupabase,
  deleteProductSupabase,
  batchDeleteProductSupabase,
  batchAddProductsSupabase
} from "@/repositories/productSupabase";

/** 含税类型 */
export type TaxType = "含税" | "普票" | "不含";

/** 产品类型定义 */
export type Product = {
  id: number;
  name: string; // 产品名称
  specification: string; // 规格型号
  unit: string; // 单位
  price: number; // 进价
  supplier: string; // 供应商（纯文本）
  taxType: TaxType | ""; // 含税类型（可以为空）
  remark: string; // 备注
  createTime: string; // 创建时间
};

/** 产品列表返回类型 */
export type ProductListResult = {
  success: boolean;
  data: {
    list: Product[];
    total: number;
  };
};

/** 操作结果返回类型 */
export type OperationResult = {
  success: boolean;
  message: string;
  data?: any;
};

/** 产品统计信息 */
export type ProductStatistics = {
  totalProducts: number; // 产品总数
  averagePrice: number; // 平均进价
  supplierCount: number; // 供应商数量
};

export type ProductStatisticsResult = {
  success: boolean;
  data: ProductStatistics;
};

/** 获取产品列表 */
export const getProductList = (data?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}) => {
  if (supabase) return getProductListSupabase(data);
  return http.request<ProductListResult>("get", "/product/list", {
    params: data
  });
};

/** 添加产品 */
export const addProduct = (data: Omit<Product, "id" | "createTime">) => {
  if (supabase) return addProductSupabase(data);
  return http.request<OperationResult>("post", "/product/add", { data });
};

/** 更新产品 */
export const updateProduct = (data: Product) => {
  if (supabase) return updateProductSupabase(data);
  return http.request<OperationResult>("put", "/product/update", { data });
};

/** 删除产品 */
export const deleteProduct = (id: number) => {
  if (supabase) return deleteProductSupabase(id);
  return http.request<OperationResult>("delete", `/product/delete/${id}`);
};

/** 批量删除产品 */
export const batchDeleteProduct = (ids: number[]) => {
  if (supabase) return batchDeleteProductSupabase(ids);
  return http.request<OperationResult>("post", "/product/batch-delete", {
    data: { ids }
  });
};

/** 批量添加产品（Excel导入） */
export const batchAddProducts = (formData: FormData) => {
  if (supabase) return batchAddProductsSupabase(formData) as any;
  return http.request<OperationResult>("post", "/product/batch-add", {
    data: formData,
    headers: { "Content-Type": "multipart/form-data" }
  });
};

/** 获取产品统计信息 */
export const getProductStatistics = () => {
  return http.request<ProductStatisticsResult>("get", "/product/statistics");
};
