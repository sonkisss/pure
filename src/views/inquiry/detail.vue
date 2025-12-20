<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Close } from "@element-plus/icons-vue";
import type { UploadFile, FormInstance, FormRules } from "element-plus";
import type { TableColumnCtx } from "element-plus/es/components/table/src/table-column/defaults";
import {
  getInquiryDetail,
  uploadAttachment,
  deleteAttachment,
  selectMatchedProduct,
  manualMatchProduct,
  uploadInquiryExcel,
  addInquiryItems,
  updateInquiryItem,
  getMatchedProducts,
  saveProfitCalculation,
  getProfitCalculation,
  saveCustomFees,
  deleteInquiryItems,
  type Inquiry,
  type InquiryItem,
  type Attachment,
  type ProfitCalculation,
  type CustomFee
} from "@/api/inquiry";
import { getProductList, type Product } from "@/api/product";
import {
  oneClickProductSelection,
  type ProductMatchResult
} from "@/api/business";
import {
  ArrowLeft,
  Refresh,
  Upload,
  Delete,
  Download,
  UploadFilled,
  MoreFilled,
  MagicStick,
  Money,
  ZoomIn,
  Picture,
  Document,
  DocumentCopy,
  Files
} from "@element-plus/icons-vue";
import * as XLSX from "xlsx";
import { ExcelParser } from "@/utils/excelParser";
import { formatMoney } from "@/utils/format";
import ImagePreview from "@/components/ImagePreview";
import { extractOssObjectPath, getSignedFileUrl } from "@/services/storage";

defineOptions({
  name: "InquiryDetail"
});

const route = useRoute();
const router = useRouter();

// 询价单数据
const inquiry = ref<Inquiry | null>(null);
const loading = ref(false);

// 批量选择相关
const selectedItems = ref<number[]>([]);
const selectAll = ref(false);
const tableRef = ref();

// 一键选择产品相关
const oneClickLoading = ref(false);

// 一键填入卖价相关
const fillPriceLoading = ref(false);
const fillPriceDialogVisible = ref(false);
const fillPriceMethodDialogVisible = ref(false);
const supplierPriceDialogVisible = ref(false);
const taxTypePriceDialogVisible = ref(false);

// 卖价设置数据
const priceSettings = ref({
  supplierPrices: {} as Record<string, number>,
  taxTypePrices: {
    含税: 0,
    不含税: 0,
    普票: 0
  }
});

// 获取所有供应商
const getAllSuppliers = computed(() => {
  const suppliers = new Set<string>();
  inquiry.value?.items?.forEach(item => {
    if (item.supplier) {
      suppliers.add(item.supplier);
    }
  });
  return Array.from(suppliers);
});

const calculatePurchaseAmount = (item: InquiryItem) =>
  Number(
    (Number(item.quantity ?? 0) * Number(item.purchasePrice ?? 0)).toFixed(2)
  );
const calculateSaleAmount = (item: InquiryItem) =>
  Number((Number(item.quantity ?? 0) * Number(item.salePrice ?? 0)).toFixed(2));

const normalizeItemAmounts = (item: InquiryItem) => {
  // 确保使用 purchasePrice 作为唯一的进价字段
  const purchasePrice = Number(item.purchasePrice ?? 0);
  item.purchaseAmount =
    typeof item.purchaseAmount === "number"
      ? item.purchaseAmount
      : calculatePurchaseAmount(item);
  item.salePrice = Number(item.salePrice ?? 0);
  if (
    (!item.salePrice || item.salePrice === 0) &&
    item.saleAmount &&
    item.quantity
  ) {
    item.salePrice = Number((item.saleAmount / item.quantity).toFixed(2));
  }
  item.saleAmount =
    typeof item.saleAmount === "number"
      ? item.saleAmount
      : calculateSaleAmount(item);
  item.amount = item.purchaseAmount;
};

const normalizeInquiryItems = () => {
  if (!inquiry.value?.items) return;
  inquiry.value.items.forEach(normalizeItemAmounts);
};

const purchaseTotal = computed(() => {
  if (!inquiry.value?.items) return 0;
  return inquiry.value.items.reduce(
    (sum, item) => sum + (item.purchaseAmount ?? calculatePurchaseAmount(item)),
    0
  );
});

const saleTotal = computed(() => {
  if (!inquiry.value?.items) return 0;
  return inquiry.value.items.reduce(
    (sum, item) => sum + (item.saleAmount ?? calculateSaleAmount(item)),
    0
  );
});

const taxablePurchaseTotal = computed(() => {
  if (!inquiry.value?.items) return 0;
  return inquiry.value.items
    .filter(item => item.taxType === "含税")
    .reduce(
      (sum, item) =>
        sum + (item.purchaseAmount ?? calculatePurchaseAmount(item)),
      0
    );
});

const taxFee = ref(0);
const freightFee = ref<number | null>(null);
const miscFee = ref(0);

// 自定义费用管理
const customFees = ref<Array<{ label: string; amount: number }>>([]);

// 利润计算数据管理
const profitCalculation = ref<ProfitCalculation | null>(null);

const totalCustomFees = computed(() => {
  return customFees.value.reduce((sum, fee) => sum + fee.amount, 0);
});
const miscFeeLabel = ref("杂费");
const miscFeeLabelDisplay = computed(() => miscFeeLabel.value.trim() || "杂费");
const manualTaxFee = ref(false);

const autoTaxFee = computed(() => {
  const diff = saleTotal.value - taxablePurchaseTotal.value;
  if (diff <= 0) return 0;
  return diff / 0.87;
});

watch([saleTotal, taxablePurchaseTotal], () => {
  if (!manualTaxFee.value) {
    taxFee.value = Math.max(0, Math.round(autoTaxFee.value));
  }
});

// 添加一个标记，用于跟踪数据初始化状态
let isInitializing = ref(true);

// 监听运费变化，自动保存
watch(
  freightFee,
  async (newValue, oldValue) => {
    // 只有在非初始化状态且值真正改变时才保存
    if (
      !isInitializing.value &&
      oldValue !== undefined &&
      newValue !== oldValue
    ) {
      console.log(
        `[运费变化] 询价单 ${inquiry.value?.id} 运费从 ${oldValue} 变为 ${newValue}`
      );
      try {
        await saveProfitCalculationDataImmediate();
        ElMessage.success("运费已自动保存");
      } catch (error) {
        console.error("自动保存运费失败:", error);
        ElMessage.error("运费保存失败");
      }
    }
  },
  { deep: true }
);

// 监听自定义费用变化，自动保存
watch(
  customFees,
  async (newValue, oldValue) => {
    // 只有在非初始化状态且值真正改变时才保存
    if (
      !isInitializing.value &&
      oldValue !== undefined &&
      JSON.stringify(newValue) !== JSON.stringify(oldValue)
    ) {
      console.log(
        `[自定义费用变化] 询价单 ${inquiry.value?.id} 自定义费用已更新`
      );
      try {
        await saveProfitCalculationDataImmediate();
        ElMessage.success("自定义费用已自动保存");
      } catch (error) {
        console.error("自动保存自定义费用失败:", error);
        ElMessage.error("自定义费用保存失败");
      }
    }
  },
  { deep: true }
);

const handleTaxFeeInput = () => {
  manualTaxFee.value = true;
};

// 编辑运费
const editFreightFee = () => {
  miscFeeForm.label = "运费";
  miscFeeForm.amount = freightFee.value || 0;
  currentEditingFee.value = { label: "运费", amount: freightFee.value || 0 };
  currentEditingIndex.value = -1; // 使用特殊索引标识运费
  miscFeeDialogVisible.value = true;
};

const resetTaxFeeToFormula = () => {
  manualTaxFee.value = false;
  taxFee.value = Math.max(0, Math.round(autoTaxFee.value));
};

const calculatedTaxFee = computed(() => {
  return (saleTotal.value - taxablePurchaseTotal.value) * 0.13;
});

const estimatedProfit = computed(() => {
  return (
    saleTotal.value -
    purchaseTotal.value -
    calculatedTaxFee.value -
    (freightFee.value || 0) -
    totalCustomFees.value
  );
});

const profitRate = computed(() => {
  if (saleTotal.value <= 0) return 0;
  return (estimatedProfit.value / saleTotal.value) * 100;
});

// 对话框标题
const miscFeeDialogTitle = computed(() => {
  if (currentEditingIndex.value === -1) {
    return "编辑运费";
  } else if (currentEditingIndex.value >= 0) {
    return "编辑自定义费用";
  } else if (currentEditingIndex.value === -2) {
    return "添加自定义费用";
  } else {
    return "添加自定义费用";
  }
});

// 对话框按钮文本
const miscFeeSubmitText = computed(() => {
  if (currentEditingIndex.value === -1) {
    return "保存运费";
  } else if (currentEditingIndex.value >= 0) {
    return "保存修改";
  } else if (currentEditingIndex.value === -2) {
    return "确定添加";
  } else {
    return "确定添加";
  }
});

const tableSummaryMethod = ({
  columns
}: {
  columns: TableColumnCtx<any>[];
}) => {
  const sums: string[] = [];
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = "合计";
      return;
    }
    if (column.property === "unitPrice") {
      sums[index] = "进价合计";
      return;
    }
    if (column.property === "purchaseAmount") {
      sums[index] = formatMoney(purchaseTotal.value);
      return;
    }
    if (column.property === "salePrice") {
      sums[index] = "卖价合计";
      return;
    }
    if (column.property === "saleAmount") {
      sums[index] = formatMoney(saleTotal.value);
      return;
    }
    sums[index] = "";
  });
  return sums;
};

// 附件上传
const attachmentFile = ref<File | null>(null);
const attachmentFileList = ref<UploadFile[]>([]);
const uploadDialogVisible = ref(false);
const uploadLoading = ref(false);

// 图片预览相关
const imagePreviewVisible = ref(false);
const previewImages = ref<string[]>([]);
const currentImageIndex = ref(0);

// 产品选择对话框
const productSelectDialogVisible = ref(false);
const currentSelectItem = ref<InquiryItem | null>(null);
const productList = ref<Product[]>([]);
const productLoading = ref(false);

// Excel导入
const importExcelDialogVisible = ref(false);
const importExcelFile = ref<File | null>(null);
const importExcelFileList = ref<UploadFile[]>([]);

// 杂费对话框
const miscFeeDialogVisible = ref(false);
const miscFeeFormRef = ref<FormInstance>();
const miscFeeForm = reactive({
  label: "",
  amount: 0
});

const miscFeeFormRules: FormRules = {
  label: [{ required: true, message: "请输入费用名称", trigger: "blur" }],
  amount: [{ required: true, message: "请输入费用金额", trigger: "change" }]
};

// 费用选项相关
const currentEditingFee = ref<{ label: string; amount: number } | null>(null);
const currentEditingIndex = ref(-1);

const editDialogVisible = ref(false);
const editFormRef = ref<FormInstance>();
const editForm = reactive({
  id: 0,
  inquiryId: 0,
  productId: null as number | null,
  name: "",
  specification: "",
  unit: "个",
  quantity: 1,
  purchasePrice: 0,
  unitPrice: 0,
  salePrice: 0,
  supplier: "",
  taxType: "含税" as InquiryItem["taxType"],
  remark: "",
  matchStatus: "unmatched" as InquiryItem["matchStatus"],
  matchedProducts: [] as InquiryItem["matchedProducts"]
});

const editFormRules: FormRules = {
  name: [{ required: true, message: "请输入产品名称", trigger: "blur" }],
  specification: [
    { required: true, message: "请输入规格型号", trigger: "blur" }
  ],
  unit: [{ required: true, message: "请输入单位", trigger: "blur" }],
  quantity: [{ required: true, message: "请输入数量", trigger: "change" }],
  purchasePrice: [{ required: true, message: "请输入进价", trigger: "change" }],
  salePrice: [{ required: true, message: "请输入卖价", trigger: "change" }]
};

const editPurchaseAmount = computed(() =>
  Number((editForm.quantity * editForm.purchasePrice).toFixed(2))
);
const editSaleAmount = computed(() =>
  Number((editForm.quantity * editForm.salePrice).toFixed(2))
);

const openEditDialog = (row: InquiryItem) => {
  Object.assign(editForm, {
    id: row.id,
    inquiryId: row.inquiryId,
    productId: row.productId ?? null,
    name: row.name,
    specification: row.specification,
    unit: row.unit,
    quantity: row.quantity,
    purchasePrice: row.unitPrice ?? row.purchasePrice, // 优先使用 unitPrice，其次是 purchasePrice
    unitPrice: row.unitPrice ?? row.purchasePrice,
    salePrice: row.salePrice ?? 0,
    supplier: row.supplier,
    taxType: row.taxType,
    remark: row.remark,
    matchStatus: row.matchStatus,
    matchedProducts: row.matchedProducts ?? []
  });
  editDialogVisible.value = true;
};

const resetEditForm = () => {
  editFormRef.value?.clearValidate();
  Object.assign(editForm, {
    id: 0,
    inquiryId: inquiry.value?.id ?? 0,
    productId: null,
    name: "",
    specification: "",
    unit: "个",
    quantity: 1,
    purchasePrice: 0,
    unitPrice: 0,
    salePrice: 0,
    supplier: "",
    taxType: "含税" as InquiryItem["taxType"],
    remark: "",
    matchStatus: "unmatched" as InquiryItem["matchStatus"],
    matchedProducts: []
  });
};

const handleEditDialogClosed = () => {
  resetEditForm();
};

const handleEditSubmit = async () => {
  if (!editFormRef.value) return;
  await editFormRef.value.validate(async valid => {
    if (!valid) return;
    const payload: InquiryItem = {
      id: editForm.id,
      inquiryId: editForm.inquiryId,
      productId: editForm.productId,
      name: editForm.name,
      specification: editForm.specification,
      unit: editForm.unit,
      quantity: editForm.quantity,
      purchasePrice: editForm.purchasePrice,
      unitPrice: editForm.purchasePrice, // 确保unitPrice和purchasePrice一致
      purchaseAmount: editPurchaseAmount.value,
      salePrice: editForm.salePrice,
      saleAmount: editSaleAmount.value,
      amount: editPurchaseAmount.value,
      supplier: editForm.supplier,
      taxType: editForm.taxType,
      remark: editForm.remark,
      matchStatus: editForm.matchStatus,
      matchedProducts: editForm.matchedProducts
    };

    try {
      const res = await updateInquiryItem(payload);
      if (res.success) {
        ElMessage.success("更新成功");
        editDialogVisible.value = false;
        resetEditForm();

        // 同时清除产品模块的询价明细缓存
        import("@/utils/inquiryDetailsCache").then(
          ({ clearInquiryDetailsCache }) => {
            clearInquiryDetailsCache();
            console.log("[询价管理] 询价明细更新，已清除产品模块缓存");
          }
        );

        await fetchDetail();
      } else {
        ElMessage.error(res.message);
      }
    } catch (error) {
      ElMessage.error("更新失败");
    }
  });
};

// 临时ID计数器（用于模拟）
let currentItemId = 10000;

// 获取询价单详情
const fetchDetail = async () => {
  loading.value = true;
  try {
    const id = parseInt(route.params.id as string);
    const res = await getInquiryDetail(id);

    if (res.success) {
      inquiry.value = res.data;
      normalizeInquiryItems();
      resetTaxFeeToFormula();
      // 加载利润计算数据
      await loadProfitCalculation();
    } else {
      ElMessage.error("获取询价单详情失败");
      router.back();
    }
  } catch (error) {
    ElMessage.error("获取询价单详情失败");
    router.back();
  } finally {
    loading.value = false;
  }
};

// 返回列表
const handleBack = () => {
  router.push("/inquiry/index");
};

// 刷新数据
const handleRefresh = async () => {
  await fetchDetail();
  ElMessage.success("刷新成功");
};

// 一键选择产品
const handleOneClickProductSelection = async () => {
  if (!inquiry.value) {
    ElMessage.error("询价单数据不存在");
    return;
  }

  try {
    // 检查是否有进价和卖价都为0的产品
    const allItems = inquiry.value.items || [];

    // 筛选所有进价卖价为0的产品
    const targetItems =
      allItems.filter(
        item => item.purchasePrice === 0 && item.salePrice === 0
      ) || [];

    if (targetItems.length === 0) {
      ElMessage.info("没有进价和卖价都为0的产品，无需执行一键选择");
      return;
    }

    // 确认对话框
    await ElMessageBox.confirm(
      `系统将自动匹配 ${targetItems.length} 个进价和卖价都为0的产品，是否继续？`,
      "一键选择产品",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "info",
        draggable: true
      }
    );

    oneClickLoading.value = true;

    // 调用一键选择产品API
    console.log(
      `[API调用] 开始调用一键选择产品API，询价单ID: ${inquiry.value.id}`
    );
    const result = await oneClickProductSelection(inquiry.value.id);
    console.log(`[API调用] API返回结果:`, result);

    if (result.success && result.data) {
      const { totalItems, matchedItems, unmatchedItems, results } = result.data;
      console.log(`[API调用] 解析后的数据:`, {
        totalItems,
        matchedItems,
        unmatchedItems,
        results
      });

      // 先不显示提示消息，等数据库更新完成后再显示最终结果
      let baseMessage = `一键选择产品`;
      let matchSummary = `匹配 ${matchedItems} 个产品`;
      if (unmatchedItems > 0) {
        matchSummary += `，未匹配 ${unmatchedItems} 个产品`;
      }

      // 批量更新匹配的产品数据到数据库
      if (inquiry.value?.items && matchedItems > 0) {
        const updatePromises: Promise<any>[] = [];

        results.forEach(result => {
          // 判断是否匹配成功：有productId且purchasePrice大于0
          if (result.productId && result.purchasePrice > 0) {
            const item = inquiry.value.items.find(
              i => i.id === result.inquiryItemId
            );
            if (item) {
              // 准备更新的数据
              const updatedItem = {
                ...item,
                // 🔧 修复：如果匹配源不是产品库（如合同明细），则不设置关联产品ID，避免外键约束错误
                productId:
                  result.source === "products" || !result.source
                    ? result.productId
                    : null,
                supplier: result.supplier,
                taxType: result.taxType || "含税", // 使用匹配到的含税类型
                remark: result.remark || "",
                matchStatus: "matched",
                // 更新价格信息
                purchasePrice: result.purchasePrice,
                purchaseAmount: Number(
                  (item.quantity * result.purchasePrice).toFixed(2)
                ),
                // 如果有卖价也更新
                salePrice:
                  result.salePrice && result.salePrice > 0
                    ? result.salePrice
                    : item.salePrice,
                saleAmount:
                  result.salePrice && result.salePrice > 0
                    ? Number((item.quantity * result.salePrice).toFixed(2))
                    : item.saleAmount
              };

              // 添加到批量更新队列
              updatePromises.push(updateInquiryItem(updatedItem));

              // 同时更新前端显示数据
              item.productId = result.productId;
              item.supplier = result.supplier;
              item.taxType = result.taxType || "含税";
              item.remark = result.remark || "";
              item.matchStatus = "matched";
              item.purchasePrice = result.purchasePrice;
              item.purchaseAmount = Number(
                (item.quantity * result.purchasePrice).toFixed(2)
              );
              if (result.salePrice && result.salePrice > 0) {
                item.salePrice = result.salePrice;
                item.saleAmount = Number(
                  (item.quantity * result.salePrice).toFixed(2)
                );
              }
            }
          }
        });

        // 批量执行数据库更新
        if (updatePromises.length > 0) {
          console.log(
            `[数据库更新] 开始批量更新 ${updatePromises.length} 个询价明细到数据库`
          );
          try {
            const updateResults = await Promise.all(updatePromises);
            const successCount = updateResults.filter(
              result => result.success
            ).length;
            const failCount = updateResults.length - successCount;

            console.log(
              `[数据库更新] 批量更新完成：成功 ${successCount} 个，失败 ${failCount} 个`
            );

            // 根据数据库保存结果和匹配结果显示最终提示
            let finalMessage = `${baseMessage}：${matchSummary}`;

            if (failCount > 0) {
              ElMessage.warning(
                `${finalMessage}，数据保存失败 ${failCount} 条记录`
              );
            } else if (matchedItems > 0) {
              ElMessage.success(`${finalMessage}，数据已保存`);
            } else {
              ElMessage.warning(finalMessage);
            }
          } catch (updateError) {
            console.error("[数据库更新] 批量更新失败:", updateError);
            ElMessage.error(
              `${baseMessage}：${matchSummary}，数据保存失败，请刷新页面检查`
            );
          }
        } else {
          // 没有需要更新的数据，直接显示匹配结果
          if (matchedItems > 0) {
            ElMessage.success(`${baseMessage}：${matchSummary}，数据已保存`);
          } else {
            ElMessage.warning(`${baseMessage}：${matchSummary}`);
          }
        }
      }
    } else {
      console.log(`[API调用] API调用失败:`, result);
      ElMessage.error((result as any).message || "一键选择产品失败");
    }
  } catch (error: any) {
    if (error === "cancel") {
      // 用户取消操作
      return;
    }
    console.error("[一键选择] 执行失败:", error);
    ElMessage.error(
      `一键选择产品失败: ${error.message || error || "未知错误"}`
    );
  } finally {
    oneClickLoading.value = false;
  }
};

// 一键填入卖价功能
const handleFillPrice = () => {
  fillPriceMethodDialogVisible.value = true;
};

// 按供应商填入卖价
const handleFillPriceBySupplier = () => {
  fillPriceMethodDialogVisible.value = false;
  supplierPriceDialogVisible.value = true;
  // 初始化供应商价格设置
  priceSettings.value.supplierPrices = {};
  getAllSuppliers.value.forEach(supplier => {
    priceSettings.value.supplierPrices[supplier] = 1.2; // 默认20%利润
  });
};

// 按含税类型填入卖价
const handleFillPriceByTaxType = () => {
  fillPriceMethodDialogVisible.value = false;
  taxTypePriceDialogVisible.value = true;
  // 初始化含税类型价格设置
  priceSettings.value.taxTypePrices = {
    含税: 1.2, // 默认20%利润
    不含税: 1.15, // 默认15%利润
    普票: 1.18 // 默认18%利润
  };
};

// 执行按供应商填入卖价
const executeFillPriceBySupplier = async () => {
  if (!inquiry.value) return;

  try {
    fillPriceLoading.value = true;

    // 更新每个产品的卖价
    inquiry.value.items?.forEach(item => {
      if (item.supplier && item.purchasePrice > 0) {
        const ratio = priceSettings.value.supplierPrices[item.supplier] || 1.2;
        item.salePrice = Number((item.purchasePrice * ratio).toFixed(2));
        item.saleAmount = Number((item.quantity * item.salePrice).toFixed(2));
      }
    });

    // 保存到数据库
    const promises = inquiry.value.items
      .filter(item => item.salePrice > 0)
      .map(item =>
        updateInquiryItem({
          id: item.id,
          inquiryId: inquiry.value?.id || 10,
          productId: item.productId,
          name: item.name,
          specification: item.specification,
          unit: item.unit,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          purchaseAmount: item.purchaseAmount,
          salePrice: item.salePrice,
          saleAmount: item.saleAmount,
          supplier: item.supplier,
          taxType: item.taxType,
          remark: item.remark,
          matchStatus: item.matchStatus
        })
      );

    await Promise.all(promises);

    ElMessage.success("按供应商填入卖价成功");
    supplierPriceDialogVisible.value = false;
    await fetchDetail();
  } catch (error) {
    console.error("按供应商填入卖价失败:", error);
    ElMessage.error("按供应商填入卖价失败");
  } finally {
    fillPriceLoading.value = false;
  }
};

// 执行按含税类型填入卖价
const executeFillPriceByTaxType = async () => {
  if (!inquiry.value) return;

  try {
    fillPriceLoading.value = true;

    // 更新每个产品的卖价
    inquiry.value.items?.forEach(item => {
      if (item.purchasePrice > 0 && item.taxType) {
        const ratio =
          priceSettings.value.taxTypePrices[
            item.taxType as keyof typeof priceSettings.value.taxTypePrices
          ] || 1.2;
        item.salePrice = Number((item.purchasePrice * ratio).toFixed(2));
        item.saleAmount = Number((item.quantity * item.salePrice).toFixed(2));
      }
    });

    // 保存到数据库
    const promises = inquiry.value.items
      .filter(item => item.salePrice > 0)
      .map(item =>
        updateInquiryItem({
          id: item.id,
          inquiryId: inquiry.value?.id || 10,
          productId: item.productId,
          name: item.name,
          specification: item.specification,
          unit: item.unit,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          purchaseAmount: item.purchaseAmount,
          salePrice: item.salePrice,
          saleAmount: item.saleAmount,
          supplier: item.supplier,
          taxType: item.taxType,
          remark: item.remark,
          matchStatus: item.matchStatus
        })
      );

    await Promise.all(promises);

    ElMessage.success("按含税类型填入卖价成功");
    taxTypePriceDialogVisible.value = false;
    await fetchDetail();
  } catch (error) {
    console.error("按含税类型填入卖价失败:", error);
    ElMessage.error("按含税类型填入卖价失败");
  } finally {
    fillPriceLoading.value = false;
  }
};

// 打开上传附件对话框
const handleUploadAttachment = () => {
  uploadDialogVisible.value = true;
  attachmentFile.value = null;
  attachmentFileList.value = [];
  uploadLoading.value = false;
};

// 附件文件改变
const handleAttachmentFileChange = (file: UploadFile) => {
  attachmentFile.value = file.raw || null;
};

// 提交附件上传
const handleAttachmentUploadSubmit = async () => {
  if (!attachmentFile.value || !inquiry.value) {
    ElMessage.warning("请选择文件");
    return;
  }

  uploadLoading.value = true;
  try {
    const res = await uploadAttachment(inquiry.value.id, attachmentFile.value);
    if (res.success) {
      ElMessage.success("附件上传成功");
      uploadDialogVisible.value = false;
      // 重置文件选择状态
      attachmentFile.value = null;
      attachmentFileList.value = [];
      await fetchDetail();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    // error removed
    ElMessage.error("附件上传失败");
  } finally {
    uploadLoading.value = false;
  }
};

// 预览附件
const getAttachmentSignedUrl = async (attachment: Attachment) => {
  const raw = attachment.fileUrl || "";
  const clean = raw.split("?")[0];
  const objectPath = extractOssObjectPath(clean);
  if (!objectPath) {
    throw new Error("附件路径无效");
  }
  const signed = await getSignedFileUrl(objectPath, 3600, {
    inline: true,
    fileName: attachment.fileName || "attachment"
  });
  if (!signed) {
    throw new Error("附件签名生成失败");
  }
  return signed;
};

const resolveAttachmentType = (attachment: Attachment) => {
  const type = attachment.fileType || "";
  if (type && type !== "application/octet-stream") return type;
  const url = (attachment.fileUrl || "").toLowerCase().split("?")[0];
  const name = (attachment.fileName || "").toLowerCase();
  const source = url || name;
  if (source.endsWith(".png")) return "image/png";
  if (source.endsWith(".jpg") || source.endsWith(".jpeg")) return "image/jpeg";
  if (source.endsWith(".gif")) return "image/gif";
  if (source.endsWith(".webp")) return "image/webp";
  if (source.endsWith(".pdf")) return "application/pdf";
  if (source.endsWith(".xls")) return "application/vnd.ms-excel";
  if (source.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
};

const getAttachmentIcon = (fileType: string) => {
  const t = fileType || "";
  if (t.startsWith("image/")) return Picture;
  if (t === "application/pdf") return Document;
  if (
    t.includes("excel") ||
    t.includes("spreadsheet") ||
    t.includes("sheet")
  )
    return DocumentCopy;
  return Files;
};

const handleViewAttachment = async (attachment: Attachment) => {
  const url = attachment.fileUrl;
  if (!url) {
    ElMessage.error("附件不可用，请重新上传");
    return;
  }

  try {
    const signedUrl = await getAttachmentSignedUrl(attachment);

    const type = resolveAttachmentType(attachment);

    if (type.startsWith("image/")) {
      // 直接使用签名 URL，交由 ImagePreview 展示，支持工具栏/滚轮缩放
      previewImages.value = [signedUrl];
      currentImageIndex.value = 0;
      imagePreviewVisible.value = true;
      return;
    }

    const win = window.open(signedUrl, "_blank");
    if (!win) throw new Error("无法打开附件窗口");
  } catch (err) {
    console.error("附件预览失败:", err);
    ElMessage.error("附件预览失败，请重新上传后再试");
  }
};

// 上传对话框关闭事件
const handleUploadDialogClosed = () => {
  // 重置所有上传相关状态
  attachmentFile.value = null;
  attachmentFileList.value = [];
  uploadLoading.value = false;
};

// 删除附件
const handleDeleteAttachment = async (attachment: Attachment) => {
  if (!inquiry.value) return;

  try {
    await ElMessageBox.confirm("确定要删除该附件吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });

    const res = await deleteAttachment(inquiry.value.id, attachment.id);
    if (res.success) {
      ElMessage.success("附件删除成功");
      await fetchDetail();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    if (error !== "cancel") {
      // error removed
      ElMessage.error("附件删除失败");
    }
  }
};

// 批量选择相关方法
const handleSelectionChange = (selection: InquiryItem[]) => {
  selectedItems.value = selection.map(item => item.id);
};

const handleSelectAll = (selection: InquiryItem[]) => {
  if (selection.length === 0) {
    selectedItems.value = [];
  } else {
    selectedItems.value = selection.map(item => item.id);
  }
};

// 批量删除产品明细
const handleBatchDeleteItems = async () => {
  if (!inquiry.value || selectedItems.value.length === 0) {
    ElMessage.warning("请先选择要删除的产品明细");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedItems.value.length} 条产品明细吗？此操作不可恢复。`,
      "批量删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    const res = await deleteInquiryItems(selectedItems.value);
    if (res.success) {
      ElMessage.success(res.message);
      selectedItems.value = [];
      selectAll.value = false;

      // 同时清除产品模块的询价明细缓存
      import("@/utils/inquiryDetailsCache").then(
        ({ clearInquiryDetailsCache }) => {
          clearInquiryDetailsCache();
          console.log("[询价管理] 询价明细删除，已清除产品模块缓存");
        }
      );

      await fetchDetail();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("批量删除失败");
    }
  }
};

// 打开产品选择对话框
const handleSelectProduct = (item: InquiryItem) => {
  currentSelectItem.value = item;
  productSelectDialogVisible.value = true;

  // 根据产品名称和规格型号进行智能匹配
  fetchMatchedProducts(item);
};

// 智能匹配产品（后端匹配）
const fetchMatchedProducts = async (inquiryItem: InquiryItem) => {
  productLoading.value = true;
  try {
    // 调用后端API进行精确匹配
    const res = await getMatchedProducts({
      name: inquiryItem.name,
      specification: inquiryItem.specification
    });

    if (res.success) {
      // 设置产品列表
      productList.value = res.data;

      // 显示提示信息
      if (res.data.length > 0) {
        ElMessage.success(`找到 ${res.data.length} 个匹配产品`);
      } else {
        ElMessage.warning("未匹配到产品");
      }
    } else {
      ElMessage.error(res.message || "获取匹配产品失败");
    }
  } catch (error) {
    ElMessage.error("获取匹配产品失败");
  } finally {
    productLoading.value = false;
  }
};

// 选择产品
const handleProductSelect = async (product: Product) => {
  if (!currentSelectItem.value || !inquiry.value) return;

  try {
    // 调用后端API
    const res = await manualMatchProduct({
      inquiryId: inquiry.value.id,
      itemId: currentSelectItem.value.id,
      productId: product.id
    });

    if (res.success) {
      // 找到并更新当前项
      const item = inquiry.value.items?.find(
        i => i.id === currentSelectItem.value?.id
      );
      if (item) {
        // 完全使用产品库的数据，确保数据一致性
        const originalQuantity = item.quantity; // 保存原始数量
        item.productId = product.id;
        item.name = product.name; // 使用产品库的名称
        item.specification = product.specification; // 使用产品库的规格
        item.unit = product.unit; // 使用产品库的单位
        item.quantity = originalQuantity; // 保持原始数量
        item.purchasePrice = product.price; // 使用产品库的价格
        item.supplier = product.supplier; // 使用产品库的供应商
        item.taxType = product.taxType || "含税"; // 使用产品库的含税类型
        item.remark = product.remark; // 使用产品库的备注
        normalizeItemAmounts(item);
        item.matchStatus = "matched";
      }

      ElMessage.success("产品选择成功");
      productSelectDialogVisible.value = false;

      // 重新获取数据确保前后端同步
      await fetchDetail();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    ElMessage.error("产品选择失败");
  }
};

// 打开Excel导入对话框
const handleImportExcel = () => {
  importExcelDialogVisible.value = true;
  importExcelFile.value = null;
  importExcelFileList.value = [];
};

// 下载Excel模板
const handleDownloadTemplate = () => {
  try {
    // 创建模板数据
    const templateData = [
      {
        产品名称: "笔记本电脑",
        规格型号: "I5-12450H/16GB/512GB",
        单位: "台",
        数量: 5,
        进价: 0,
        供应商: "",
        含税类型: "含税",
        备注: ""
      },
      {
        产品名称: "机械键盘",
        规格型号: "RGB-104键",
        单位: "把",
        数量: 10,
        进价: 0,
        供应商: "",
        含税类型: "普票",
        备注: ""
      },
      {
        产品名称: "无线鼠标",
        规格型号: "USB-2.4G",
        单位: "个",
        数量: 20,
        进价: 0,
        供应商: "",
        含税类型: "不含",
        备注: ""
      }
    ];

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "询价单明细模板");

    // 设置列宽
    ws["!cols"] = [
      { wch: 20 }, // 产品名称
      { wch: 20 }, // 规格型号
      { wch: 8 }, // 单位
      { wch: 8 }, // 数量
      { wch: 12 }, // 进价
      { wch: 20 }, // 供应商
      { wch: 10 }, // 含税类型
      { wch: 20 } // 备注
    ];

    // 导出文件
    XLSX.writeFile(wb, "询价单导入模板.xlsx");
    ElMessage.success("模板下载成功");
  } catch (error) {
    ElMessage.error("模板下载失败");
  }
};

// Excel文件改变
const handleImportExcelFileChange = (file: UploadFile) => {
  importExcelFile.value = file.raw || null;
};

// 上传Excel导入
const handleImportExcelUpload = async () => {
  if (!importExcelFile.value) {
    ElMessage.warning("请选择Excel文件");
    return;
  }

  try {
    loading.value = true;

    // 在生产环境中，可以选择以下两种方式之一：

    // 方式1: 前端解析 + 后端验证（推荐）
    // 先在前端解析Excel，显示预览，确认后再发送到后端
    // if (importExcelFile.value) {
    //   const validation = ExcelParser.validateExcelFile(importExcelFile.value);
    //   if (!validation.valid) {
    //     ElMessage.error(validation.message);
    //     return;
    //   }

    //   const parsedData = await ExcelParser.parseExcelFile(importExcelFile.value);
    //   console.log("前端解析的数据:", parsedData);

    //   // 可以在这里添加数据预览确认步骤
    //   // 然后将解析后的数据发送到后端进行验证和保存
    // }

    // 方式2: 纯后端解析（当前实现）
    // 直接将文件发送到后端进行解析
    const formData = new FormData();
    formData.append("file", importExcelFile.value);

    console.log("开始上传Excel文件:", importExcelFile.value.name); // 调试信息

    // 改为前端解析，确保与用户文件内容一致
    const validation = ExcelParser.validateExcelFile(importExcelFile.value);
    if (!validation.valid) {
      ElMessage.error(validation.message);
      return;
    }
    const parsedItems = await ExcelParser.parseExcelFile(importExcelFile.value);
    console.log("前端解析到的数据条数:", parsedItems.length);
    console.log("前端解析到的数据内容:", parsedItems);

    // 持久化到当前询价单（Supabase 优先）
    if (inquiry.value) {
      const saveRes = await addInquiryItems(inquiry.value.id, parsedItems);
      if (saveRes.success) {
        ElMessage.success(`成功导入 ${parsedItems.length} 条数据到产品明细`);
        importExcelDialogVisible.value = false;
        importExcelFile.value = null;
        importExcelFileList.value = [];

        // 同时清除产品模块的询价明细缓存
        import("@/utils/inquiryDetailsCache").then(
          ({ clearInquiryDetailsCache }) => {
            clearInquiryDetailsCache();
            console.log("[询价管理] 询价明细新增，已清除产品模块缓存");
          }
        );

        await fetchDetail();
      } else {
        ElMessage.error(saveRes.message || "保存导入数据失败");
      }
    }
  } catch (error) {
    console.error("上传Excel错误:", error); // 调试信息
    ElMessage.error("Excel上传失败");
  } finally {
    loading.value = false;
  }
};

// 选择匹配结果中的产品
const handleMatchResultProductSelect = async (product: Product) => {
  if (!currentSelectItem.value) return;

  // 更新当前项的数据
  currentSelectItem.value.productId = product.id;
  currentSelectItem.value.name = product.name;
  currentSelectItem.value.specification = product.specification;
  currentSelectItem.value.unit = product.unit;
  currentSelectItem.value.purchasePrice = product.price;
  currentSelectItem.value.supplier = product.supplier;
  currentSelectItem.value.taxType = product.taxType || "含税";
  currentSelectItem.value.remark = product.remark;

  // 持久化匹配关系并刷新详情
  if (inquiry.value) {
    const res = await selectMatchedProduct({
      inquiryId: inquiry.value.id,
      itemId: currentSelectItem.value.id,
      productId: product.id
    });
    if (res.success) {
      // 本地直接更新金额，避免刷新导致排序变化
      normalizeItemAmounts(currentSelectItem.value);
      ElMessage.success("产品选择成功");
      productSelectDialogVisible.value = false;
    } else {
      ElMessage.error(res.message || "匹配失败");
    }
  }
};

// 生成预估利润汇总文本
const generateProfitSummary = () => {
  try {
    // 构建基础部分
    let summaryText = `预估利润(${formatMoney(estimatedProfit.value)})=销售额(${formatMoney(saleTotal.value)})-进货金额(${formatMoney(purchaseTotal.value)})-税费(${formatMoney(calculatedTaxFee.value)})-运费(${formatMoney(freightFee.value || 0)})`;

    // 添加自定义费用部分（如果有）
    if (customFees.value.length > 0) {
      summaryText += `-自定义费用(${formatMoney(totalCustomFees.value)})`;
    }

    // 添加利润率和含税金额
    summaryText += ` ; 销售利润率(${profitRate.value.toFixed(1)}%) ; 含税金额(${formatMoney(taxablePurchaseTotal.value)})`;

    return summaryText;
  } catch (error) {
    console.error("生成利润汇总文本失败:", error);
    // 降级处理：返回基础文本
    return "预估利润计算异常，请检查数据";
  }
};

// 导出Excel
const handleExportExcel = () => {
  if (
    !inquiry.value ||
    !inquiry.value.items ||
    inquiry.value.items.length === 0
  ) {
    ElMessage.warning("暂无数据可导出");
    return;
  }

  try {
    // 准备导出数据
    const exportData = inquiry.value.items.map((item, index) => ({
      序号: index + 1,
      产品名称: item.name,
      规格型号: item.specification,
      单位: item.unit,
      数量: item.quantity,
      进价: item.purchasePrice,
      进价金额: item.purchaseAmount,
      卖价: item.salePrice,
      销售金额: item.saleAmount,
      供应商: item.supplier,
      含税类型: item.taxType || "",
      备注: item.remark || ""
    }));

    // 添加合计行
    const totalRow: any = {
      序号: "合计",
      产品名称: "",
      规格型号: "",
      单位: "",
      数量: "",
      进价: "",
      进价金额: purchaseTotal.value,
      卖价: "",
      销售金额: saleTotal.value,
      供应商: "",
      含税类型: "",
      备注: ""
    };

    // 将合计行添加到导出数据
    exportData.push(totalRow as any);

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "询价单明细");

    // 为合计行添加样式
    const totalRowIndex = exportData.length; // 合计行是最后一行
    const totalPurchaseAmountCell = `G${totalRowIndex}`; // 进价金额列
    const totalSaleAmountCell = `I${totalRowIndex}`; // 销售金额列

    // 设置进价金额合计单元格样式（粗体、绿色背景）
    if (!ws[totalPurchaseAmountCell]) ws[totalPurchaseAmountCell] = {};
    ws[totalPurchaseAmountCell].s = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: "E8F5E8" } }, // 浅绿色背景
      alignment: { horizontal: "right" }
    };

    // 设置销售金额合计单元格样式（粗体、蓝色背景）
    if (!ws[totalSaleAmountCell]) ws[totalSaleAmountCell] = {};
    ws[totalSaleAmountCell].s = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: "E6F7FF" } }, // 浅蓝色背景
      alignment: { horizontal: "right" }
    };

    // 设置列宽
    ws["!cols"] = [
      { wch: 8 }, // 序号
      { wch: 20 }, // 产品名称
      { wch: 15 }, // 规格型号
      { wch: 8 }, // 单位
      { wch: 8 }, // 数量
      { wch: 12 }, // 进价
      { wch: 12 }, // 进价金额
      { wch: 12 }, // 卖价
      { wch: 12 }, // 销售金额
      { wch: 20 }, // 供应商
      { wch: 12 }, // 含税类型
      { wch: 20 } // 备注
    ];

    // 添加预估利润汇总行
    try {
      const profitSummary = generateProfitSummary();

      // 获取当前工作表的范围
      const range = XLSX.utils.decode_range(ws["!ref"]);
      const summaryRowIndex = range.e.r + 3; // 在数据下方3行添加汇总（留2行空行）

      // 添加空行
      XLSX.utils.sheet_add_aoa(ws, [[""]], { origin: `A${range.e.r + 2}` });

      // 添加汇总行
      XLSX.utils.sheet_add_aoa(ws, [[profitSummary]], {
        origin: `A${summaryRowIndex}`
      });

      // 设置汇总行样式
      const summaryCell = `A${summaryRowIndex}`;

      // 应用单元格样式（粗体文字、黄色背景、红色字体）
      if (!ws[summaryCell]) ws[summaryCell] = {};
      ws[summaryCell].s = {
        font: {
          bold: true,
          sz: 12,
          color: { rgb: "FF0000" } // 红色字体
        },
        fill: {
          fgColor: { rgb: "FFFF00" } // 黄色背景
        },
        alignment: {
          horizontal: "left",
          vertical: "center",
          wrapText: true // 自动换行
        },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      // 合并单元格以适应长文本（合并到最后一列）
      const lastCol = range.e.c;
      const lastColLetter = XLSX.utils.encode_col(lastCol);
      ws["!merges"] = ws["!merges"] || [];
      ws["!merges"].push({
        s: { r: summaryRowIndex - 1, c: 0 },
        e: { r: summaryRowIndex - 1, c: lastCol }
      });
    } catch (summaryError) {
      console.error("添加利润汇总行失败:", summaryError);
      // 不影响主要导出功能，继续执行
    }

    // 导出文件
    const fileName = `${inquiry.value.name}.xlsx`;
    XLSX.writeFile(wb, fileName);

    ElMessage.success("导出成功");
  } catch (error) {
    // error removed
    ElMessage.error("导出失败");
  }
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
};

// 格式化时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return "";
  return dateStr.replace("T", " ").split(".")[0];
};

// 加载利润计算数据
const loadProfitCalculation = async () => {
  if (!inquiry.value) return;

  try {
    const result = await getProfitCalculation(inquiry.value.id);
    if (result.success && result.data) {
      profitCalculation.value = result.data;
      // 恢复自定义费用（过滤掉运费，避免重复存储）
      if (result.data.customFees && result.data.customFees.length > 0) {
        customFees.value = result.data.customFees
          .filter(fee => fee.label !== "运费") // 过滤掉运费记录
          .map(fee => ({
            label: fee.label,
            amount: fee.amount
          }));

        // 调试日志
        const freightFeeRecord = result.data.customFees.find(
          fee => fee.label === "运费"
        );
        if (freightFeeRecord) {
          console.log(
            `[数据清理] 询价单 ${inquiry.value.id} 发现重复运费记录，已过滤:`,
            {
              profitTableFreight: result.data.freightFee,
              customTableFreight: freightFeeRecord.amount,
              filteredCustomFees: customFees.value.length
            }
          );
        }
      }
      // 恢复运费（确保数字类型，包括运费为0的情况）
      if (
        typeof result.data.freightFee === "number" &&
        !isNaN(result.data.freightFee)
      ) {
        freightFee.value = result.data.freightFee;
        console.log(
          `[运费恢复] 询价单 ${inquiry.value.id} 运费已恢复为:`,
          result.data.freightFee
        );
      } else {
        freightFee.value = null;
        console.log(
          `[运费恢复] 询价单 ${inquiry.value.id} 运费数据无效或不存在，设置为null`
        );
      }
    }
  } catch (error) {
    console.error("加载利润计算数据失败:", error);
    freightFee.value = null;
  } finally {
    // 数据加载完成后，设置初始化完成标记，启用监听器
    setTimeout(() => {
      isInitializing.value = false;
      console.log(
        `[数据初始化完成] 询价单 ${inquiry.value?.id} 启用自动保存监听器`
      );
    }, 100); // 延迟100ms确保所有数据都已设置完成
  }
};

// 防抖保存计时器
let saveTimer: NodeJS.Timeout | null = null;

// 保存利润计算数据（防抖）
const saveProfitCalculationData = async () => {
  if (!inquiry.value) return;

  // 清除之前的计时器
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  // 设置新的计时器，延迟500ms保存
  saveTimer = setTimeout(async () => {
    try {
      const data: ProfitCalculation = {
        inquiryId: inquiry.value!.id,
        saleTotal: saleTotal.value,
        purchaseTotal: purchaseTotal.value,
        taxablePurchaseTotal: taxablePurchaseTotal.value,
        calculatedTaxFee: calculatedTaxFee.value,
        freightFee: freightFee.value || 0,
        estimatedProfit: estimatedProfit.value,
        profitRate: profitRate.value,
        customFees: customFees.value.map(fee => ({
          label: fee.label,
          amount: fee.amount,
          inquiryId: inquiry.value!.id
        }))
      };

      await saveProfitCalculation(data);
    } catch (error) {
      console.error("保存利润计算数据失败:", error);
    }
  }, 500);
};

// 立即保存利润计算数据（不防抖）
const saveProfitCalculationDataImmediate = async () => {
  if (!inquiry.value) return;

  try {
    const data: ProfitCalculation = {
      inquiryId: inquiry.value.id,
      saleTotal: saleTotal.value,
      purchaseTotal: purchaseTotal.value,
      taxablePurchaseTotal: taxablePurchaseTotal.value,
      calculatedTaxFee: calculatedTaxFee.value,
      freightFee: freightFee.value || 0,
      estimatedProfit: estimatedProfit.value,
      profitRate: profitRate.value,
      customFees: customFees.value
        .filter(fee => fee.label !== "运费") // 确保不会保存运费到自定义费用表
        .map(fee => ({
          label: fee.label,
          amount: fee.amount,
          inquiryId: inquiry.value!.id
        }))
    };

    await saveProfitCalculation(data);
  } catch (error) {
    console.error("保存利润计算数据失败:", error);
  }
};

// 自定义费用相关方法
const showMiscFeeDialog = () => {
  miscFeeForm.label = "";
  miscFeeForm.amount = 0;
  currentEditingFee.value = null;
  currentEditingIndex.value = -2; // -2 表示添加新费用，-1 保留给运费编辑
  miscFeeDialogVisible.value = true;
};

const handleMiscFeeSubmit = async () => {
  if (!miscFeeFormRef.value) return;
  await miscFeeFormRef.value.validate(async valid => {
    if (!valid) return;

    // 检查是否为运费编辑（特殊索引 -1）
    if (currentEditingIndex.value === -1) {
      // 运费编辑模式
      const oldFreightFee = freightFee.value;
      freightFee.value = miscFeeForm.amount;
      console.log(`[运费编辑] 询价单 ${inquiry.value?.id} 运费更新:`, {
        原运费: oldFreightFee,
        新运费: miscFeeForm.amount,
        差异: miscFeeForm.amount - (oldFreightFee || 0)
      });
    } else if (currentEditingIndex.value >= 0) {
      // 编辑模式：更新现有费用项
      customFees.value[currentEditingIndex.value] = {
        label: miscFeeForm.label,
        amount: miscFeeForm.amount
      };
    } else {
      // 添加模式：添加新的自定义费用项
      customFees.value.push({
        label: miscFeeForm.label,
        amount: miscFeeForm.amount
      });
    }

    miscFeeDialogVisible.value = false;
    currentEditingFee.value = null;
    currentEditingIndex.value = -1;

    // 保存到数据库
    await saveProfitCalculationDataImmediate();
    ElMessage.success("保存成功");
  });
};

const removeCustomFee = async (index: number) => {
  customFees.value.splice(index, 1);
  await saveProfitCalculationDataImmediate();
};

// 直接删除费用（悬停按钮）
const removeCustomFeeDirectly = (index: number) => {
  ElMessageBox.confirm(
    `确定要删除费用"${customFees.value[index].label}"吗？此操作不可恢复。`,
    "删除确认",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    }
  )
    .then(async () => {
      customFees.value.splice(index, 1);
      await saveProfitCalculationDataImmediate();
    })
    .catch(() => {
      // 用户取消删除
    });
};

// 直接编辑费用
const editCustomFeeDirectly = (
  fee: { label: string; amount: number },
  index: number
) => {
  currentEditingFee.value = { ...fee };
  currentEditingIndex.value = index;
  miscFeeForm.label = currentEditingFee.value.label;
  miscFeeForm.amount = currentEditingFee.value.amount;
  miscFeeDialogVisible.value = true;
};

// 显示费用选项
const showFeeOptions = async (
  fee: { label: string; amount: number },
  index: number,
  event: MouseEvent
) => {
  event.stopPropagation();

  try {
    const result = await ElMessageBox({
      title: "费用操作",
      message: `请选择对"${fee.label}"的操作：`,
      confirmButtonText: "编辑费用",
      cancelButtonText: "删除费用",
      distinguishCancelAndClose: true,
      type: "info"
    });

    // 用户点击了"编辑费用"
    if (result === "confirm") {
      currentEditingFee.value = { ...fee };
      currentEditingIndex.value = index;
      miscFeeForm.label = currentEditingFee.value.label;
      miscFeeForm.amount = currentEditingFee.value.amount;
      miscFeeDialogVisible.value = true;
    }
  } catch (action) {
    if (action === "cancel") {
      // 用户点击了"删除费用"
      currentEditingIndex.value = index;
      deleteCustomFee();
    }
    // 用户点击了关闭或其他操作，不做处理
  }
};

// 编辑费用
const editCustomFee = () => {
  if (currentEditingFee.value && currentEditingIndex.value >= 0) {
    miscFeeForm.label = currentEditingFee.value.label;
    miscFeeForm.amount = currentEditingFee.value.amount;
    miscFeeDialogVisible.value = true;
  }
  currentEditingFee.value = null;
  currentEditingIndex.value = -1;
};

// 删除费用
const deleteCustomFee = () => {
  if (currentEditingIndex.value >= 0) {
    ElMessageBox.confirm(
      `确定要删除费用"${customFees.value[currentEditingIndex.value].label}"吗？此操作不可恢复。`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
      .then(() => {
        customFees.value.splice(currentEditingIndex.value, 1);
      })
      .catch(() => {
        // 用户取消删除
      });
  }
  currentEditingFee.value = null;
  currentEditingIndex.value = -1;
};

// 保持原有的杂费方法兼容性
const clearMiscFee = () => {
  miscFeeLabel.value = "";
  miscFee.value = 0;
  // 同时清空所有自定义费用
  customFees.value = [];
};

// 初始化
onMounted(() => {
  fetchDetail();
});
</script>

<template>
  <div v-loading="loading" class="inquiry-detail-container">
    <div v-if="inquiry">
      <!-- 顶部操作栏 -->
      <div class="top-toolbar">
        <div class="toolbar-left">
          <el-button :icon="ArrowLeft" @click="handleBack">返回列表</el-button>
          <div class="inquiry-name">{{ inquiry.name }}</div>
        </div>
        <div class="toolbar-right">
          <el-button type="success" :icon="Upload" @click="handleImportExcel">
            导入数据
          </el-button>
          <el-button type="primary" :icon="Download" @click="handleExportExcel">
            导出数据
          </el-button>
          <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
        </div>
      </div>

      <!-- 产品明细列表 -->
      <el-card shadow="never" class="items-card">
        <template #header>
          <div class="card-header">
            <div class="card-header-left">
              <span class="card-title">产品明细</span>
              <el-button
                v-if="inquiry.items && inquiry.items.length > 0"
                type="danger"
                size="small"
                :disabled="selectedItems.length === 0"
                @click="handleBatchDeleteItems"
              >
                批量删除 ({{ selectedItems.length }})
              </el-button>
              <el-button
                v-if="inquiry.items && inquiry.items.length > 0"
                type="warning"
                size="small"
                :icon="MagicStick"
                :loading="oneClickLoading"
                :disabled="
                  !inquiry?.items?.some(
                    item =>
                      (!item.productId || item.matchStatus === 'unmatched') &&
                      item.purchasePrice === 0 &&
                      item.salePrice === 0
                  )
                "
                @click="handleOneClickProductSelection"
              >
                一键选择产品
              </el-button>
              <el-button
                v-if="inquiry.items && inquiry.items.length > 0"
                type="success"
                size="small"
                :icon="Money"
                :loading="fillPriceLoading"
                @click="handleFillPrice"
              >
                一键填入卖价
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          ref="tableRef"
          :data="inquiry.items"
          border
          stripe
          style="width: 100%"
          :default-sort="{ prop: 'id', order: 'ascending' }"
          show-summary
          :summary-method="tableSummaryMethod"
          @selection-change="handleSelectionChange"
          @select-all="handleSelectAll"
        >
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column
            type="index"
            label="序号"
            width="60"
            align="center"
          />
          <el-table-column
            label="产品名称"
            min-width="200"
            show-overflow-tooltip
            align="left"
          >
            <template #default="{ row }">
              <span class="cell-text-left">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="规格型号"
            min-width="180"
            show-overflow-tooltip
            align="left"
          >
            <template #default="{ row }">
              <span class="cell-text-left">{{ row.specification }}</span>
            </template>
          </el-table-column>
          <el-table-column label="单位" width="60" align="center">
            <template #default="{ row }">
              <span class="cell-text">{{ row.unit }}</span>
            </template>
          </el-table-column>
          <el-table-column label="数量" width="70" align="center">
            <template #default="{ row }">
              <span class="cell-text font-medium">{{ row.quantity }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="进价"
            prop="unitPrice"
            width="80"
            align="right"
          >
            <template #default="{ row }">
              <span class="cell-text-right emphasis">{{
                formatMoney(row.unitPrice ?? row.purchasePrice)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="purchaseAmount"
            label="进价金额"
            width="90"
            align="right"
          >
            <template #default="{ row }">
              <span class="cell-text-right emphasis">{{
                formatMoney(row.purchaseAmount)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="卖价"
            prop="salePrice"
            width="80"
            align="right"
          >
            <template #default="{ row }">
              <span class="cell-text-right positive">{{
                formatMoney(row.salePrice)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="saleAmount"
            label="卖价金额"
            width="90"
            align="right"
          >
            <template #default="{ row }">
              <span class="cell-text-right positive">{{
                formatMoney(row.saleAmount)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="供应商"
            min-width="140"
            show-overflow-tooltip
            align="left"
          >
            <template #default="{ row }">
              <span class="cell-text-left">{{ row.supplier || "-" }}</span>
            </template>
          </el-table-column>
          <el-table-column label="含税" width="100" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="row.taxType"
                :type="
                  row.taxType === '含税'
                    ? 'success'
                    : row.taxType === '普票'
                      ? 'warning'
                      : 'info'
                "
                size="small"
              >
                {{ row.taxType }}
              </el-tag>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>
          <el-table-column
            label="备注"
            min-width="120"
            show-overflow-tooltip
            align="left"
          >
            <template #default="{ row }">
              <span class="cell-text-left">{{ row.remark || "-" }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="200"
            align="center"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                @click="handleSelectProduct(row)"
                >选择产品</el-button
              >
              <el-button
                type="warning"
                size="small"
                @click="openEditDialog(row)"
                >编辑</el-button
              >
            </template>
          </el-table-column>
        </el-table>

        <div class="profit-summary">
          <div class="summary-cards">
            <div class="profit-card-wrapper">
              <div class="summary-card profit-card">
                <div class="card-label">预估利润</div>
                <div
                  class="card-value"
                  :class="{
                    positive: estimatedProfit >= 0,
                    negative: estimatedProfit < 0
                  }"
                >
                  {{ formatMoney(estimatedProfit) }}
                </div>
              </div>
              <div class="profit-card-equal">=</div>
              <div class="summary-card">
                <div class="card-label">销售额</div>
                <div class="card-value positive">
                  {{ formatMoney(saleTotal) }}
                </div>
              </div>
              <div class="profit-card-equal">-</div>
              <div class="summary-card">
                <div class="card-label">进货金额</div>
                <div class="card-value negative">
                  {{ formatMoney(purchaseTotal) }}
                </div>
              </div>
              <div class="profit-card-equal">-</div>
              <div class="summary-card">
                <div class="card-label">税费</div>
                <div class="card-value negative">
                  {{ formatMoney(calculatedTaxFee) }}
                </div>
              </div>
              <div class="profit-card-equal">-</div>
              <div
                class="summary-card misc-card fee-card freight-card"
                @click="editFreightFee"
              >
                <el-icon class="edit-icon freight-edit-icon">
                  <MoreFilled />
                </el-icon>
                <div class="card-label">运费</div>
                <div class="card-value negative">
                  <template v-if="freightFee !== null">
                    {{ formatMoney(freightFee) }}
                  </template>
                  <template v-else>
                    <el-skeleton-item
                      variant="text"
                      style="width: 60px; height: 20px"
                    />
                  </template>
                </div>
              </div>
              <div class="profit-card-equal">-</div>
              <!-- 动态显示所有自定义费用项 -->
              <div
                v-for="(fee, index) in customFees"
                :key="index"
                class="summary-card misc-card fee-card"
                @click="editCustomFeeDirectly(fee, index)"
              >
                <el-icon
                  class="delete-icon"
                  @click.stop="removeCustomFeeDirectly(index)"
                >
                  <Close />
                </el-icon>
                <div class="card-label">{{ fee.label }}</div>
                <div class="card-value negative">
                  {{ formatMoney(fee.amount) }}
                </div>
              </div>
              <!-- 添加费用占位卡片 -->
              <div
                class="summary-card add-misc-card"
                @click="showMiscFeeDialog"
              >
                <div class="card-label">添加费用</div>
                <div class="card-value">+</div>
              </div>
              <div class="profit-card-separator">|</div>
              <div class="metric">
                <div class="metric-title">销售利润率</div>
                <div class="metric-value">{{ profitRate.toFixed(1) }}%</div>
              </div>
              <div class="metric">
                <div class="metric-title">含税金额</div>
                <div class="metric-value">
                  {{ formatMoney(taxablePurchaseTotal) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <el-dialog
        v-model="editDialogVisible"
        title="编辑产品明细"
        width="520px"
        :close-on-click-modal="false"
        @closed="handleEditDialogClosed"
      >
        <el-form
          ref="editFormRef"
          :model="editForm"
          :rules="editFormRules"
          label-width="90px"
        >
          <el-form-item label="产品名称" prop="name">
            <el-input v-model="editForm.name" />
          </el-form-item>
          <el-form-item label="规格型号" prop="specification">
            <el-input v-model="editForm.specification" />
          </el-form-item>
          <el-form-item label="单位" prop="unit">
            <el-input v-model="editForm.unit" />
          </el-form-item>
          <el-form-item label="数量" prop="quantity">
            <el-input-number
              v-model="editForm.quantity"
              :min="0"
              :precision="2"
            />
          </el-form-item>
          <el-form-item label="进价" prop="purchasePrice">
            <div style="display: flex; gap: 12px; align-items: center">
              <el-input-number
                v-model="editForm.purchasePrice"
                :min="0"
                :precision="2"
                style="flex: 1"
              />
              <span class="dialog-summary" style="white-space: nowrap"
                >进价金额: {{ formatMoney(editPurchaseAmount) }}</span
              >
            </div>
          </el-form-item>
          <el-form-item label="卖价" prop="salePrice">
            <div style="display: flex; gap: 12px; align-items: center">
              <el-input-number
                v-model="editForm.salePrice"
                :min="0"
                :precision="2"
                style="flex: 1"
              />
              <span class="dialog-summary positive" style="white-space: nowrap"
                >卖价金额: {{ formatMoney(editSaleAmount) }}</span
              >
            </div>
          </el-form-item>
          <el-form-item label="供应商">
            <el-input v-model="editForm.supplier" />
          </el-form-item>
          <el-form-item label="含税">
            <el-select v-model="editForm.taxType">
              <el-option label="含税" value="含税" />
              <el-option label="普票" value="普票" />
              <el-option label="不含" value="不含" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="editForm.remark as any"
              type="textarea"
              :rows="2"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleEditSubmit">保存</el-button>
        </template>
      </el-dialog>

      <!-- 附件管理区域 -->
      <el-card shadow="never" class="attachment-card">
        <template #header>
          <div class="card-header">
            <div class="card-header-left">
              <span class="card-title">附件管理</span>
              <el-button
                type="primary"
                size="small"
                :icon="Upload"
                @click="handleUploadAttachment"
              >
                上传附件
              </el-button>
            </div>
          </div>
        </template>

        <div v-if="inquiry.attachments.length > 0" class="attachment-list">
          <div
            v-for="attachment in inquiry.attachments"
            :key="attachment.id"
            class="attachment-item"
            role="button"
            tabindex="0"
            @click="handleViewAttachment(attachment)"
          >
            <div class="attachment-icon">
              <el-tooltip :content="attachment.fileType || '附件'">
                <el-icon
                  :size="36"
                  color="#409EFF"
                  class="cursor-pointer"
                >
                  <component
                    :is="getAttachmentIcon(resolveAttachmentType(attachment))"
                  />
                </el-icon>
              </el-tooltip>
            </div>
            <div class="attachment-info">
              <div class="attachment-time">
                {{ formatDateTime(attachment.uploadTime) }}
              </div>
            </div>
            <div class="attachment-actions">
              <el-button
                type="danger"
                link
                :icon="Delete"
                @click.stop="handleDeleteAttachment(attachment)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无附件" :image-size="100" />
      </el-card>
    </div>

    <!-- 上传附件对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传附件"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleUploadDialogClosed"
    >
      <el-upload
        v-model:file-list="attachmentFileList"
        :auto-upload="false"
        :on-change="handleAttachmentFileChange"
        :limit="1"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        drag
      >
        <div class="upload-content">
          <el-icon :size="48" color="#409EFF">
            <UploadFilled />
          </el-icon>
          <div class="upload-text">
            <p>点击或拖拽文件到此处上传</p>
            <p class="upload-tip">支持图片、PDF、Word、Excel格式</p>
          </div>
        </div>
      </el-upload>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploadLoading"
          @click="handleAttachmentUploadSubmit"
        >
          确定上传
        </el-button>
      </template>
    </el-dialog>

    <!-- 增强图片预览对话框 -->
    <ImagePreview
      v-model="imagePreviewVisible"
      :images="previewImages"
      :initial-index="currentImageIndex"
      title="图片预览"
    />

    <!-- 产品选择对话框 -->
    <el-dialog
      v-model="productSelectDialogVisible"
      title="选择匹配产品"
      width="80%"
      :close-on-click-modal="false"
    >
      <el-alert
        v-if="productList.length > 0"
        title="找到匹配的产品，请选择需要关联的产品"
        type="success"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />
      <el-alert
        v-else-if="!productLoading"
        title="未匹配到产品"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />

      <el-table
        v-if="productList.length > 0"
        v-loading="productLoading"
        :data="productList"
        border
        stripe
        max-height="400"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column
          prop="name"
          label="产品名称"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="specification"
          label="规格型号"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column prop="unit" label="单位" width="80" align="center" />
        <el-table-column label="进价" width="100" align="center">
          <template #default="{ row }">
            ¥{{ formatMoney(row.price) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="supplier"
          label="供应商"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="taxType"
          label="含税类型"
          width="100"
          align="center"
        />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleProductSelect(row)"
            >
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-else-if="!productLoading" class="empty-state">
        <el-empty description="未匹配到产品" />
      </div>
    </el-dialog>

    <!-- Excel导入对话框 -->
    <el-dialog
      v-model="importExcelDialogVisible"
      title="导入Excel数据"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-alert
        title="上传Excel文件，数据将直接添加到产品明细中"
        type="success"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>✅ 必填字段：产品名称、规格型号、单位、数量</p>
          <p>✅ 可选字段：进价、供应商、含税类型、备注</p>
          <p>📝 上传成功后可在产品明细中选择对应产品进行匹配</p>
        </template>
      </el-alert>

      <el-form label-width="100px">
        <el-form-item label="模板下载">
          <el-button
            type="success"
            :icon="Download"
            @click="handleDownloadTemplate"
          >
            下载Excel模板
          </el-button>
          <span class="form-item-tip">请先下载模板，按格式填写数据</span>
        </el-form-item>
        <el-form-item label="Excel文件" required>
          <el-upload
            v-model:file-list="importExcelFileList"
            :auto-upload="false"
            :on-change="handleImportExcelFileChange"
            :limit="1"
            accept=".xlsx,.xls"
            drag
          >
            <div class="upload-content">
              <el-icon :size="48" color="#67C23A">
                <UploadFilled />
              </el-icon>
              <div class="upload-text">
                <p>点击或拖拽文件到此处上传</p>
                <p class="upload-tip">支持 .xlsx、.xls 格式文件</p>
              </div>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importExcelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImportExcelUpload">
          上传到产品明细
        </el-button>
      </template>
    </el-dialog>

    <!-- 费用输入对话框 -->
    <el-dialog
      v-model="miscFeeDialogVisible"
      :title="miscFeeDialogTitle"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="miscFeeFormRef"
        :model="miscFeeForm"
        :rules="miscFeeFormRules"
        label-width="80px"
      >
        <el-form-item label="费用名称" prop="label">
          <el-input v-model="miscFeeForm.label" placeholder="请输入费用名称" />
        </el-form-item>
        <el-form-item label="费用金额" prop="amount">
          <el-input-number
            v-model="miscFeeForm.amount"
            :precision="2"
            :min="0"
            placeholder="请输入费用金额"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="miscFeeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleMiscFeeSubmit">{{
          miscFeeSubmitText
        }}</el-button>
      </template>
    </el-dialog>

    <!-- 一键填入卖价方式选择对话框 -->
    <el-dialog
      v-model="fillPriceMethodDialogVisible"
      title="选择填入卖价方式"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="fill-price-methods">
        <el-button
          type="primary"
          size="large"
          class="method-button"
          @click="handleFillPriceBySupplier"
        >
          按供应商
        </el-button>
        <el-button
          type="success"
          size="large"
          class="method-button"
          @click="handleFillPriceByTaxType"
        >
          按含税类型
        </el-button>
      </div>
      <template #footer>
        <el-button @click="fillPriceMethodDialogVisible = false"
          >取消</el-button
        >
      </template>
    </el-dialog>

    <!-- 按供应商填入卖价对话框 -->
    <el-dialog
      v-model="supplierPriceDialogVisible"
      title="按供应商设置卖价比例"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="supplier-price-settings">
        <div
          v-for="supplier in getAllSuppliers"
          :key="supplier"
          class="supplier-price-item"
        >
          <span class="supplier-name">供应商: {{ supplier }}</span>
          <el-input-number
            v-model="priceSettings.supplierPrices[supplier]"
            :min="1"
            :max="10"
            :precision="2"
            :step="0.01"
            placeholder="比例"
            style="width: 120px"
          />
          <span class="ratio-label">倍</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="supplierPriceDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="fillPriceLoading"
          @click="executeFillPriceBySupplier"
        >
          确定填入
        </el-button>
      </template>
    </el-dialog>

    <!-- 按含税类型填入卖价对话框 -->
    <el-dialog
      v-model="taxTypePriceDialogVisible"
      title="按含税类型设置卖价比例"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="tax-type-price-settings">
        <div class="tax-type-price-item">
          <span class="tax-type-name">含税产品比例</span>
          <el-input-number
            v-model="priceSettings.taxTypePrices.含税"
            :min="1"
            :max="10"
            :precision="2"
            :step="0.01"
            placeholder="比例"
            style="width: 120px"
          />
          <span class="ratio-label">倍</span>
        </div>
        <div class="tax-type-price-item">
          <span class="tax-type-name">不含税产品比例</span>
          <el-input-number
            v-model="priceSettings.taxTypePrices.不含税"
            :min="1"
            :max="10"
            :precision="2"
            :step="0.01"
            placeholder="比例"
            style="width: 120px"
          />
          <span class="ratio-label">倍</span>
        </div>
        <div class="tax-type-price-item">
          <span class="tax-type-name">普票产品比例</span>
          <el-input-number
            v-model="priceSettings.taxTypePrices.普票"
            :min="1"
            :max="10"
            :precision="2"
            :step="0.01"
            placeholder="比例"
            style="width: 120px"
          />
          <span class="ratio-label">倍</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="taxTypePriceDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="fillPriceLoading"
          @click="executeFillPriceByTaxType"
        >
          确定填入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.inquiry-detail-container {
  min-height: calc(100vh - 40px);
  padding: 8px;
}

.top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  .toolbar-left {
    display: flex;
    gap: 16px;
    align-items: center;

    .inquiry-name {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
  }

  .toolbar-right {
    display: flex;
    gap: 10px;
  }
}

.attachment-card,
.items-card {
  margin-bottom: 20px;
}

.cell-text {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 24px;
  color: #303133;
  text-align: center;

  &.emphasis {
    font-weight: 600;
    color: #f56c6c;
  }

  &.positive {
    font-weight: 600;
    color: #67c23a;
  }
}

.cell-text-left {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: 24px;
  color: #303133;
  text-align: left;

  &.emphasis {
    font-weight: 600;
    color: #f56c6c;
  }

  &.positive {
    font-weight: 600;
    color: #67c23a;
  }
}

.cell-text-right {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  min-height: 24px;
  color: #303133;
  text-align: right;

  &.emphasis {
    font-weight: 600;
    color: #f56c6c;
  }

  &.positive {
    font-weight: 600;
    color: #67c23a;
  }
}

:deep(.el-table__footer .cell) {
  font-weight: 600;
}

// 进价相关列（第6、7列）使用红色，与数据行的进价样式一致
:deep(.el-table__footer) td.el-table__cell:nth-child(7) .cell,
:deep(.el-table__footer) td.el-table__cell:nth-child(8) .cell {
  font-weight: 600 !important;
  color: #f56c6c !important;
}

// 卖价相关列（第8、9列）使用绿色，与数据行的卖价样式一致
:deep(.el-table__footer) td.el-table__cell:nth-child(9) .cell,
:deep(.el-table__footer) td.el-table__cell:nth-child(10) .cell {
  font-weight: 600 !important;
  color: #67c23a !important;
}

.profit-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  margin-top: 20px;
  background: #fafcff;
  border: 1px dashed #ebeef5;
  border-radius: 12px;
}

.summary-cards {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding-bottom: 8px;
  overflow-x: auto;
}

.summary-card {
  width: fit-content;
  min-width: fit-content;
  max-width: fit-content;
  padding: 12px 16px;
  cursor: pointer;
  background: #fff;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px #ebeef5;
  transition: all 0.3s;

  .card-label {
    font-size: 13px;
    color: #909399;
    text-align: center;
  }

  .card-value {
    margin-top: 6px;
    font-size: 22px;
    font-weight: 700;
    color: #303133;
    text-align: center;

    &.negative {
      color: #f56c6c;
    }

    &.positive {
      color: #67c23a;
    }
  }

  .card-tip {
    margin-top: 4px;
    font-size: 12px;
    color: #a8abb2;
  }

  &:hover {
    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
    transform: translateY(-1px);
  }
}

.profit-card-wrapper {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: center;
  overflow-x: auto;
}

.profit-card {
  flex: 1 1 auto;
  width: fit-content;
}

.profit-card-equal {
  display: flex;
  align-items: center;
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  color: #c0c4cc;
}

.profit-card-separator {
  display: flex;
  align-items: center;
  padding: 0 4px;
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  color: #c0c4cc;
}

.metric {
  width: fit-content;
  min-width: 120px;
  padding: 12px 12px 12px 4px;
  cursor: pointer;
  background: #fff;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px #ebeef5;
  transition: all 0.3s;

  .metric-title {
    width: 100%;
    font-size: 13px;
    color: #909399;
    text-align: center;
  }

  .metric-value {
    margin-top: 6px;
    font-size: 26px;
    font-weight: 700;
    color: #303133;
    text-align: center;
  }

  &:hover {
    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
    transform: translateY(-1px);
  }
}

.fee-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px #ebeef5;
}

.fee-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.fee-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.misc-label-input {
  width: 120px;
}

.fee-tip {
  font-size: 12px;
  color: #a8abb2;
}

.dialog-summary {
  font-size: 18px;
  font-weight: 600;
  color: #303133;

  &.positive {
    color: #67c23a;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.attachment-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;

  .attachment-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    transition: all 0.3s;
    cursor: pointer;

    &:hover {
      border-color: #409eff;
      box-shadow: 0 2px 8px rgb(64 158 255 / 20%);
    }

    .attachment-icon {
      margin-right: 12px;
    }

    .attachment-info {
      flex: 1;
      min-width: 0;

      .attachment-name {
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 14px;
        font-weight: 500;
        color: #303133;
        white-space: nowrap;
      }

      .attachment-time {
        font-size: 12px;
        color: #909399;
      }
    }

    .attachment-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.upload-content {
  padding: 40px 20px;
  text-align: center;

  .upload-text {
    margin-top: 16px;

    p {
      margin: 0;
      font-size: 14px;
      color: #606266;
    }

    .upload-tip {
      margin-top: 8px;
      font-size: 12px;
      color: #909399;
    }
  }
}

.attachment-preview-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.image-view {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 80vh;
  padding: 16px;
  overflow: auto;
  background-color: #000;

  :deep(.el-image) {
    max-width: 100%;
    max-height: 80vh;
  }
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.form-item-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}

/* 杂费卡片样式 */
.misc-card {
  .card-value {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

/* 费用卡片样式 */
.fee-card {
  position: relative;

  .delete-icon {
    position: absolute;
    top: -4px;
    right: -4px;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    font-size: 10px;
    color: #f56c6c;
    cursor: pointer;
    background: rgb(245 108 108 / 90%);
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgb(0 0 0 / 15%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover .delete-icon {
    opacity: 1;
  }

  .delete-icon:hover {
    background: rgb(245 108 108 / 20%);
    transform: scale(1.1);
  }

  .card-value {
    justify-content: center;
    text-align: center;
  }
}

.add-misc-card {
  background: #fafafa;
  border: 2px dashed #c0c4cc;

  &:hover {
    background: #f0f9ff;
    border-color: #409eff;
    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
    transform: translateY(-1px);
  }

  .card-value {
    font-size: 24px;
    font-weight: 600;
    color: #c0c4cc;
  }

  .card-label {
    color: #909399;
  }
}

/* 运费输入框样式 */
:deep(.el-input-number) {
  .el-input__inner {
    font-weight: 600;
    color: #f56c6c;
    text-align: center;
  }
}

/* 编辑图标样式 */
.edit-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  padding: 2px;
  font-size: 14px;
  color: #409eff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
}

.fee-card:hover .edit-icon {
  opacity: 1;
}

/* 隐藏运费卡片的编辑图标 */
.freight-card:hover .freight-edit-icon {
  opacity: 0;
}

.freight-card:hover .edit-icon:hover {
  opacity: 0;
}

.edit-icon:hover {
  color: #337ecc;
  transform: scale(1.1);
}

:deep(.el-table .cell) {
  padding: 6px 8px;
}

:deep(.el-card__body) {
  padding: 12px;
}

.card-header-simple {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.card-header-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.card-header-left .card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

// 一键填入卖价功能样式
.fill-price-methods {
  display: flex;
  flex-direction: row;
  gap: 16px;
  justify-content: center;
  padding: 20px 0;
}

.method-button {
  width: 120px;
  height: 50px;
  font-size: 16px;
  font-weight: 500;
}

.supplier-price-settings,
.tax-type-price-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 0;
}

.supplier-price-item,
.tax-type-price-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.supplier-name,
.tax-type-name {
  min-width: 120px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.ratio-label {
  margin-left: 8px;
  font-size: 14px;
  color: #909399;
}

/* 附件缩略图样式 */
.attachment-thumbnail {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  transition: all 0.3s;
}

.attachment-thumbnail-wrapper {
  position: relative;
  width: 50px;
  height: 50px;
  overflow: hidden;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
    transform: scale(1.05);

    .thumbnail-overlay {
      opacity: 1;
    }
  }

  .attachment-thumbnail {
    display: block;
    width: 100%;
    height: 100%;
  }

  .thumbnail-overlay {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: rgb(0 0 0 / 40%);
    border-radius: 6px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
}

.pdf-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  cursor: pointer;
  background-color: #fef6e7;
  border: 2px solid #f7ba2a;
  border-radius: 6px;
  transition: all 0.3s;

  &:hover {
    background-color: #f7ba2a;
    transform: scale(1.05);

    .file-type-label {
      opacity: 1;
    }
  }

  .file-type-label {
    position: absolute;
    bottom: -1px;
    padding: 1px 3px;
    font-size: 10px;
    font-weight: 600;
    color: #d97706;
    background: #fff;
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
}

.image-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  border-radius: 6px;

  .el-icon {
    margin-bottom: 4px;
  }
}

// 优化询价详情页表格行高，显示更多数据
:deep(.el-table) {
  .el-table__row {
    height: 28px !important; // 进一步缩小到 28px，增加显示密度

    td {
      padding: 4px 0 !important; // 进一步减少单元格内边距
      font-size: 13px !important; // 略微减小字体大小以适应更紧凑的行高
      line-height: 1.1 !important; // 进一步减少行间距
    }
  }

  .el-table__header {
    th {
      height: 32px !important; // 表头也相应缩小
      padding: 6px 0 !important; // 减少表头内边距
      font-size: 13px !important; // 表头字体也相应调整
      line-height: 1.1 !important;
    }
  }

  .el-table__cell {
    padding: 4px 0 !important; // 统一单元格内边距
  }

  // 确保按钮在紧凑行高中也能正常显示
  .el-button {
    height: auto !important;
    padding: 4px 8px !important;
    font-size: 12px !important;
  }

  // 确保复选框在紧凑行高中居中显示
  .el-checkbox {
    .el-checkbox__input {
      .el-checkbox__inner {
        width: 14px !important;
        height: 14px !important;
      }
    }
  }
}

// 优化小标签显示，适配紧凑行高
:deep(.el-tag) {
  height: 18px !important; // 减小标签高度
  padding: 0 4px !important; // 减少内边距
  margin: 1px 0 !important; // 添加微小边距
  font-size: 11px !important; // 略微减小字体
  line-height: 16px !important; // 调整行高
}
</style>
