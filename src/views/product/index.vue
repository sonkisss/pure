<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules, UploadFile } from "element-plus";
import {
  getProductList,
  addProduct,
  deleteProduct,
  batchDeleteProduct,
  batchAddProducts,
  type Product,
  type TaxType
} from "@/api/product";
import {
  Plus,
  Delete,
  Refresh,
  Download,
  Upload,
  Loading
} from "@element-plus/icons-vue";
import * as XLSX from "xlsx";
import { formatMoney } from "@/utils/format";
import TableSkeleton from "@/components/TableSkeleton.vue";
import { productDataCache } from "@/utils/productCache";
import { createDebounce } from "@/utils/debounce";

defineOptions({
  name: "ProductManagement"
});

// 表格数据
const loading = ref(false);
const initialLoading = ref(true); // 初始加载状态
const tableData = ref<Product[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 搜索关键词
const searchKeyword = ref("");

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10
});

// 添加请求取消控制器
let currentRequestController: AbortController | null = null;

// 创建防抖搜索函数
const debouncedSearch = createDebounce(() => {
  pagination.page = 1;
  loadProducts();
}, 500);

// 智能预加载
let isPreloading = false;

// 添加/编辑产品对话框
const dialogVisible = ref(false);
const dialogTitle = ref("添加产品");
const formRef = ref<FormInstance>();
// 取消编辑功能：不再使用编辑相关状态

// 含税类型选项
const taxTypeOptions: { label: string; value: TaxType }[] = [
  { label: "含税", value: "含税" },
  { label: "普票", value: "普票" },
  { label: "不含", value: "不含" }
];

// 表单数据
const formData = reactive({
  name: "",
  specification: "",
  unit: "",
  price: 0,
  supplier: "",
  taxType: "" as TaxType | "",
  remark: ""
});

// 表单验证规则
const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入产品名称", trigger: "blur" }],
  specification: [
    { required: true, message: "请输入规格型号", trigger: "blur" }
  ],
  unit: [{ required: true, message: "请输入单位", trigger: "blur" }],
  price: [
    { required: true, message: "请输入进价", trigger: "blur" },
    {
      type: "number",
      min: 0,
      message: "进价不能小于0",
      trigger: "blur"
    }
  ],
  supplier: [{ required: true, message: "请输入供应商", trigger: "blur" }],
  taxType: [{ required: true, message: "请选择含税类型", trigger: "change" }]
});

// Excel导入对话框
const importDialogVisible = ref(false);
const uploadFileList = ref<UploadFile[]>([]);
const uploadLoading = ref(false);

// 加载产品列表（优化版本）
const loadProducts = async (forceRefresh: boolean = false) => {
  // 取消之前的请求
  if (currentRequestController) {
    currentRequestController.abort();
  }

  currentRequestController = new AbortController();

  // 如果不是强制刷新，先检查缓存
  if (!forceRefresh && !initialLoading.value) {
    const cachedData = await productDataCache.get(
      pagination.page,
      pagination.pageSize,
      searchKeyword.value.trim()
    );

    if (cachedData) {
      tableData.value = cachedData.data;
      total.value = cachedData.total;
      loading.value = false;
      currentRequestController = null;
      return;
    }
  }

  loading.value = true;

  try {
    const res = await getProductList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value
    });

    if (res.success && !currentRequestController.signal.aborted) {
      const data = res.data.list;
      const totalItems = res.data.total;

      // 更新UI
      tableData.value = data;
      total.value = totalItems;

      // 缓存数据
      productDataCache.set(
        pagination.page,
        pagination.pageSize,
        searchKeyword.value.trim(),
        data,
        totalItems
      );

      // 智能预加载下一页
      if (!isPreloading && data.length > 0) {
        isPreloading = true;
        setTimeout(() => {
          productDataCache.preloadNextPage(
            pagination.page,
            pagination.pageSize,
            searchKeyword.value.trim(),
            totalItems,
            async (p: number, s: number, k: string) => {
              const res = await getProductList({
                page: p,
                pageSize: s,
                keyword: k
              });
              if (res.success) {
                productDataCache.set(p, s, k, res.data.list, res.data.total);
              }
            }
          );
          isPreloading = false;
        }, 1000);
      }
    }
  } catch (error: any) {
    if (error.name !== "AbortError") {
      ElMessage.error("加载失败");
    }
  } finally {
    if (!currentRequestController.signal.aborted) {
      loading.value = false;
      initialLoading.value = false;
    }
    currentRequestController = null;
  }
};

// 实时搜索（防抖）
const handleRealtimeSearch = () => {
  debouncedSearch();
};

// 立即搜索
const handleSearch = () => {
  debouncedSearch.cancel(); // 取消防抖
  pagination.page = 1;
  loadProducts();
};

// 重置搜索
const handleResetSearch = () => {
  debouncedSearch.cancel(); // 取消防抖
  searchKeyword.value = "";
  pagination.page = 1;
  loadProducts();
};

// 搜索关键词变化监听
const handleSearchKeywordChange = () => {
  if (searchKeyword.value.trim() === "") {
    handleResetSearch();
  } else {
    handleRealtimeSearch();
  }
};

// 打开添加对话框
const handleAdd = () => {
  dialogTitle.value = "添加产品";
  resetForm();
  dialogVisible.value = true;
};

// 取消编辑功能：移除编辑入口

// 重置表单
const resetForm = () => {
  formData.name = "";
  formData.specification = "";
  formData.unit = "";
  formData.price = 0;
  formData.supplier = "";
  formData.taxType = "" as TaxType | "";
  formData.remark = "";
  formRef.value?.clearValidate();
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async valid => {
    if (valid) {
      try {
        const res = await addProduct(formData);
        if (res.success) {
          ElMessage.success(res.message);
          dialogVisible.value = false;
          loadProducts();
        } else {
          ElMessage.error(res.message || "添加失败");
        }
      } catch (error) {
        ElMessage.error("操作失败");
      }
    }
  });
};

// 删除产品
const handleDelete = async (row: Product) => {
  try {
    await ElMessageBox.confirm(`确定要删除产品"${row.name}"吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });

    // 乐观删除：立即从本地数据中移除，提供即时反馈
    const originalData = [...tableData.value];
    const deletedIndex = tableData.value.findIndex(item => item.id === row.id);

    if (deletedIndex !== -1) {
      // 立即从列表中移除该产品
      tableData.value.splice(deletedIndex, 1);
      // 更新总数
      total.value = Math.max(0, total.value - 1);

      // 显示正在删除的提示
      const deletingMessage = ElMessage({
        message: "正在删除...",
        type: "info",
        duration: 0,
        showClose: false
      });
    }

    // 执行实际的删除操作
    const res = await deleteProduct(row.id);

    // 关闭删除提示
    ElMessage.closeAll();

    if (res.success) {
      ElMessage.success(res.message);
      // 重新加载一次数据以确保数据一致性
      loadProducts();
    } else {
      // 删除失败，恢复数据
      ElMessage.error(res.message || "删除失败");
      tableData.value = originalData;
      total.value = originalData.length;
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("操作失败");
    }
  }
};

// 表格选择变化
const handleSelectionChange = (selection: Product[]) => {
  selectedIds.value = selection.map(item => item.id);
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要删除的产品");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个产品吗？`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    // 乐观删除：立即从本地数据中移除
    const originalData = [...tableData.value];
    const originalSelectedIds = [...selectedIds.value];
    const deletedIndices: number[] = [];

    // 找出要删除的产品索引
    selectedIds.value.forEach(id => {
      const index = tableData.value.findIndex(item => item.id === id);
      if (index !== -1) {
        deletedIndices.push(index);
      }
    });

    // 按索引从大到小排序，避免索引变化影响
    deletedIndices.sort((a, b) => b - a);

    // 立即从列表中移除选中产品
    deletedIndices.forEach(index => {
      tableData.value.splice(index, 1);
    });

    // 更新总数
    total.value = Math.max(0, total.value - selectedIds.value.length);

    // 清空选中状态
    selectedIds.value = [];

    // 显示正在删除的提示
    const deletingMessage = ElMessage({
      message: `正在删除 ${originalSelectedIds.length} 个产品...`,
      type: "info",
      duration: 0,
      showClose: false
    });

    // 执行实际的批量删除操作
    const res = await batchDeleteProduct(originalSelectedIds);

    // 关闭删除提示
    ElMessage.closeAll();

    if (res.success) {
      ElMessage.success(res.message);
      // 重新加载一次数据以确保数据一致性
      loadProducts();
    } else {
      // 删除失败，恢复数据
      ElMessage.error(res.message || "批量删除失败");
      tableData.value = originalData;
      total.value = originalData.length;
      selectedIds.value = originalSelectedIds;
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("操作失败");
    }
  }
};

// 刷新数据（强制刷新，清除缓存）
const handleRefresh = () => {
  // 清除当前关键词相关的所有缓存
  productDataCache.invalidateKeyword(searchKeyword.value.trim());
  // 强制刷新
  loadProducts(true);
};

// 分页大小变化
const handleSizeChange = (val: number) => {
  pagination.pageSize = val;
  pagination.page = 1;
  loadProducts();
};

// 当前页变化
const handleCurrentChange = (val: number) => {
  pagination.page = val;
  loadProducts();
};

// 打开导入对话框
const handleOpenImport = () => {
  uploadFileList.value = [];
  importDialogVisible.value = true;
};

// 文件变化
const handleFileChange = (file: UploadFile) => {
  uploadFileList.value = [file];
};

// 下载Excel模板
const handleDownloadTemplate = () => {
  try {
    const headers = [
      "产品名称",
      "规格型号",
      "单位",
      "进价",
      "供应商",
      "含税",
      "备注"
    ];
    const rows = [
      ["示例产品", "ABC-001", "个", 100, "示例供应商", "普票", "这是一个示例"]
    ];
    const sheet = [headers, ...rows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, "模板");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "产品导入模板.xlsx";
    link.click();
    URL.revokeObjectURL(url);

    ElMessage.success("模板下载成功");
  } catch (error) {
    ElMessage.error("模板下载失败");
  }
};

// 执行导入
const handleImport = async () => {
  if (uploadFileList.value.length === 0) {
    ElMessage.warning("请选择要上传的文件");
    return;
  }

  uploadLoading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", uploadFileList.value[0].raw as File);

    const res = await batchAddProducts(formData);
    if (res.success) {
      const { successCount, failCount, failedProducts } = res.data;

      // 显示导入结果
      if (failCount > 0) {
        ElMessageBox.confirm(
          `成功导入 ${successCount} 条，${failCount} 条失败。是否下载失败明细？`,
          "导入完成",
          {
            confirmButtonText: "下载失败明细",
            cancelButtonText: "关闭",
            type: "warning"
          }
        )
          .then(() => {
            // 下载失败明细
            downloadFailedRecords(failedProducts);
          })
          .catch(() => {
            // 用户点击关闭
          });
      } else {
        ElMessage.success(res.message);
      }

      importDialogVisible.value = false;
      loadProducts();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    ElMessage.error("导入失败");
  } finally {
    uploadLoading.value = false;
  }
};

// 下载失败记录
const downloadFailedRecords = (failedProducts: any[]) => {
  try {
    // 创建CSV内容
    const headers = [
      "行号",
      "产品名称",
      "规格型号",
      "单位",
      "进价",
      "供应商",
      "含税",
      "备注",
      "失败原因"
    ];

    const csvContent = [
      headers.join(","),
      ...failedProducts.map(row => {
        const values = [
          row.行号 || "",
          row.产品名称 || "",
          row.规格型号 || "",
          row.单位 || "",
          row.进价 !== undefined ? row.进价 : "",
          row.供应商 || "",
          row.含税 || "",
          row.备注 || "",
          row.失败原因 || ""
        ];
        // 处理包含逗号的字段
        return values
          .map(value => {
            const strValue = String(value);
            return strValue.includes(",") || strValue.includes('"')
              ? `"${strValue.replace(/"/g, '""')}"`
              : strValue;
          })
          .join(",");
      })
    ].join("\n");

    // 添加BOM以支持中文
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `产品导入失败明细_${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    ElMessage.success("失败明细已下载");
  } catch (error) {
    ElMessage.error("下载失败明细失败");
  }
};

// 将文本中的链接转换为可点击的HTML
const renderRemark = (remark: string) => {
  if (!remark) return "-";

  // URL正则表达式（匹配http/https/ftp链接）
  const urlRegex = /(https?:\/\/[^\s]+|ftp:\/\/[^\s]+)/gi;

  // 替换URL为可点击的链接
  const result = remark.replace(urlRegex, url => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #409eff; text-decoration: underline;">${url}</a>`;
  });

  return result;
};

// 页面加载
onMounted(() => {
  loadProducts();
});
</script>

<template>
  <div class="product-container">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true">
        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="产品名称/规格型号/供应商"
            clearable
            style="width: 240px"
            @input="handleSearchKeywordChange"
            @keyup.enter="handleSearch"
          >
            <template #suffix>
              <el-icon v-if="loading" class="is-loading">
                <Loading />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleResetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 产品列表 -->
    <el-card shadow="never">
      <!-- 操作栏 -->
      <div class="mb-4 flex justify-between">
        <div>
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            添加产品
          </el-button>
          <el-button type="success" :icon="Upload" @click="handleOpenImport">
            Excel导入
          </el-button>
          <el-button
            type="danger"
            :icon="Delete"
            :disabled="selectedIds.length === 0"
            @click="handleBatchDelete"
          >
            批量删除
          </el-button>
        </div>
        <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-if="initialLoading"
        :data="[]"
        border
        stripe
        :show-header="true"
        class="skeleton-table"
      >
        <el-table-column type="selection" width="55" align="center" />
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
        <el-table-column prop="price" label="进价" width="120" align="right" />
        <el-table-column
          prop="supplier"
          label="供应商"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="taxType"
          label="含税类型"
          width="110"
          align="center"
        />
        <el-table-column prop="remark" label="备注" min-width="200" />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default>
            <el-skeleton-item
              variant="rect"
              style="width: 50px; height: 28px"
            />
          </template>
        </el-table-column>
      </el-table>

      <TableSkeleton v-else-if="loading && tableData.length === 0" />

      <el-table
        v-else
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
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
        <el-table-column prop="price" label="进价" width="120" align="right">
          <template #default="{ row }">
            <span class="text-green-600 font-semibold">
              ¥{{ formatMoney(row.price) }}
            </span>
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
          width="110"
          align="center"
        >
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
            >
              {{ row.taxType }}
            </el-tag>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200">
          <template #default="{ row }">
            <div class="remark-content" v-html="renderRemark(row.remark)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="danger"
              :icon="Delete"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑产品对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="产品名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入产品名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="规格型号" prop="specification">
          <el-input
            v-model="formData.specification"
            placeholder="请输入规格型号"
            clearable
          />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input
            v-model="formData.unit"
            placeholder="如：个、箱、台、套等"
            clearable
          />
        </el-form-item>
        <el-form-item label="进价" prop="price">
          <el-input-number
            v-model="formData.price"
            :min="0"
            :step="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="供应商" prop="supplier">
          <el-input
            v-model="formData.supplier"
            placeholder="请输入供应商名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="含税类型" prop="taxType">
          <el-select
            v-model="formData.taxType"
            placeholder="请选择含税类型"
            style="width: 100%"
          >
            <el-option
              v-for="item in taxTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Excel导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="Excel批量导入"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="mb-4">
        <el-alert
          title="导入说明"
          type="info"
          :closable="false"
          show-icon
          class="mb-4"
        >
          <p>1. 请先下载 Excel 模板（.xlsx），按照模板格式填写数据</p>
          <p>2. 含税类型不可留空，必须为"含税"、"普票"或"不含"</p>
          <p>3. 进价必须为数字，不能小于0</p>
          <p>4. 产品名称、规格型号、单位、进价、供应商为必填项</p>
        </el-alert>

        <el-alert
          title="重复数据处理规则"
          type="warning"
          :closable="false"
          show-icon
          class="mb-4"
        >
          <p>1. 产品名称+规格型号+进价+供应商 完全相同时，导入失败</p>
          <p>2. 产品名称+规格型号 相同但供应商不同时，可正常导入</p>
          <p>
            3. 产品名称+规格型号+供应商 相同但进价不同时，只保留进价最低的记录
          </p>
          <p>4. 导入完成后，失败的记录会提供下载，包含详细失败原因</p>
        </el-alert>

        <el-button
          type="primary"
          :icon="Download"
          class="mb-4"
          @click="handleDownloadTemplate"
        >
          下载Excel模板
        </el-button>

        <el-upload
          :file-list="uploadFileList"
          :on-change="handleFileChange"
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls,.csv"
          drag
        >
          <el-icon class="el-icon--upload">
            <Upload />
          </el-icon>
          <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">仅支持 .xlsx、.xls 格式文件</div>
          </template>
        </el-upload>
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploadLoading"
          @click="handleImport"
        >
          开始导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
@keyframes loading {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.product-container {
  padding: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

/* 骨架屏表格样式 */
.skeleton-table {
  :deep(.el-table__empty-text) {
    display: none;
  }

  :deep(.el-table__body) {
    .el-table__row {
      td {
        .el-skeleton-item {
          background: linear-gradient(
            90deg,
            #f2f2f2 25%,
            #e6e6e6 50%,
            #f2f2f2 75%
          );
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }
      }
    }
  }
}

.remark-content {
  line-height: 1.5;
  word-break: break-all;
  white-space: normal;

  :deep(a) {
    color: #409eff;
    text-decoration: underline;
    cursor: pointer;

    &:hover {
      color: #66b1ff;
      text-decoration: underline;
    }
  }
}

/* 搜索框加载状态样式 */
:deep(.el-input__suffix) {
  .el-icon.is-loading {
    animation: rotating 2s linear infinite;
  }
}

/* 表格性能优化 */
:deep(.el-table) {
  .el-table__body-wrapper {
    // 固定表头，优化滚动性能
    overflow-y: auto;

    // 优化大数据量时的渲染性能
    .el-table__row {
      will-change: transform;
    }
  }

  // 固定列优化
  .el-table__fixed,
  .el-table__fixed-right {
    background: #fff;
    box-shadow: 0 0 10px rgb(0 0 0 / 10%);
  }
}

/* 分页优化 */
:deep(.el-pagination) {
  // 分页组件性能优化
  .el-pager li {
    transition: none;
  }
}
</style>
