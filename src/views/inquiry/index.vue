<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules, UploadFile } from "element-plus";
import * as XLSX from "xlsx";
import {
  getInquiryList,
  addInquiry,
  deleteInquiry,
  saveExcelInquiry,
  type Inquiry,
  type InquiryItem
} from "@/api/inquiry";
import {
  Plus,
  Delete,
  Refresh,
  Search,
  Download,
  UploadFilled
} from "@element-plus/icons-vue";

defineOptions({
  name: "InquiryManagement"
});

const router = useRouter();

// 表格数据
const loading = ref(false);
const tableData = ref<Inquiry[]>([]);
const total = ref(0);

// 批量选择相关
const selectedInquiries = ref<number[]>([]);
const tableRef = ref();

// 搜索关键词
const searchKeyword = ref("");
const searchCompany = ref("");

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10
});

// 新增询价对话框
const addDialogVisible = ref(false);
const addFormRef = ref<FormInstance>();
const addFormData = reactive({
  name: "",
  company: "",
  date: ""
});

const addFormRules = reactive<FormRules>({
  name: [{ required: true, message: "请输入询价名称", trigger: "blur" }],
  company: [{ required: true, message: "请输入询价公司", trigger: "blur" }],
  date: [{ required: true, message: "请选择询价日期", trigger: "change" }]
});

// Excel上传相关变量（用于新增询价）
const excelFile = ref<File | null>(null);
const excelFileList = ref<UploadFile[]>([]);

// 获取询价单列表
const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getInquiryList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value,
      company: searchCompany.value
    } as any);

    if (res.success) {
      tableData.value = res.data.list;
      total.value = res.data.total;
    }
  } catch (error) {
    // error removed
    ElMessage.error("获取询价单列表失败");
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

// 重置搜索
const handleReset = () => {
  searchKeyword.value = "";
  searchCompany.value = "";
  pagination.page = 1;
  fetchData();
};

// 刷新
const handleRefresh = () => {
  fetchData();
  ElMessage.success("刷新成功");
};

// 解析Excel文件
const parseInquiryExcelFile = (file: File): Promise<InquiryItem[]> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = e => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });

        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 将工作表转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          reject(new Error("Excel文件为空"));
          return;
        }

        // 验证Excel文件字段结构是否符合模版要求
        // 只验证核心必填字段：产品名称、规格型号、单位、数量
        const requiredFields = ["产品名称", "规格型号", "单位", "数量"];

        const fieldAliases = {
          产品名称: ["产品名称", "name", "productName"],
          规格型号: ["规格型号", "specification", "model", "productModel"],
          单位: ["单位", "unit"],
          数量: ["数量", "quantity"],
          进价: ["进价", "价格", "单价", "price", "unitPrice", "purchasePrice"],
          进价金额: ["进价金额", "金额", "amount", "purchaseAmount"],
          卖价: ["卖价", "售价", "销售价", "salePrice"],
          销售金额: ["销售金额", "卖价金额", "saleAmount"],
          供应商: ["供应商", "supplier"],
          含税类型: ["含税类型", "taxType", "含税"],
          备注: ["备注", "remark", "备注说明"]
        };

        // 检查Excel文件是否包含必要的字段
        const firstRow = jsonData[0];
        const foundFields = [];
        const missingFields = [];

        for (const requiredField of requiredFields) {
          const aliases = fieldAliases[requiredField];
          const found = aliases.some(
            alias =>
              alias in (firstRow as Record<string, any>) &&
              (firstRow as Record<string, any>)[alias] !== undefined
          );

          if (found) {
            foundFields.push(requiredField);
          } else {
            missingFields.push(requiredField);
          }
        }

        // 如果缺少必要字段，返回详细错误信息
        if (missingFields.length > 0) {
          reject(
            new Error(
              `Excel文件字段不符合模版要求，缺少字段：${missingFields.join("、")}。请下载标准模版并按照格式填写。`
            )
          );
          return;
        }

        // 解析Excel数据为询价明细项
        const items = jsonData.map((row: any, index: number) => {
          const name =
            row["产品名称"] || row["name"] || row["productName"] || "";
          const specification =
            row["规格型号"] ||
            row["specification"] ||
            row["model"] ||
            row["productModel"] ||
            "";
          const unit = row["单位"] || row["unit"] || "";
          const quantity = Number(row["数量"] || row["quantity"] || 0);
          const purchasePrice = Number(
            row["进价"] ||
              row["价格"] ||
              row["单价"] ||
              row["price"] ||
              row["unitPrice"] ||
              row["purchasePrice"] ||
              0
          );
          const purchaseAmount = Number(
            row["进价金额"] ||
              row["金额"] ||
              row["amount"] ||
              row["purchaseAmount"] ||
              quantity * purchasePrice
          );
          const salePrice = Number(
            row["卖价"] ||
              row["售价"] ||
              row["销售价"] ||
              row["salePrice"] ||
              row["sale_price"] ||
              0
          );
          const saleAmount = Number(
            row["销售金额"] ||
              row["卖价金额"] ||
              row["saleAmount"] ||
              row["sale_amount"] ||
              quantity * salePrice
          );
          const supplier = row["供应商"] || row["supplier"] || "";
          const taxType =
            row["含税类型"] || row["taxType"] || row["含税"] || "含税";
          const remark = row["备注"] || row["remark"] || row["备注说明"] || "";

          const resolvedQuantity = quantity > 0 ? quantity : 1;
          const resolvedPurchasePrice = purchasePrice > 0 ? purchasePrice : 0;
          const resolvedPurchaseAmount =
            purchaseAmount > 0
              ? purchaseAmount
              : resolvedQuantity * resolvedPurchasePrice;
          const resolvedSalePrice =
            salePrice > 0
              ? salePrice
              : saleAmount > 0 && resolvedQuantity > 0
                ? parseFloat((saleAmount / resolvedQuantity).toFixed(2))
                : 0;
          const resolvedSaleAmount =
            saleAmount > 0
              ? saleAmount
              : parseFloat((resolvedQuantity * resolvedSalePrice).toFixed(2));

          return {
            id: index + 1, // 临时ID，保存时会重新生成
            inquiryId: 0, // 临时ID，保存时会更新
            name: name || `产品${index + 1}`,
            specification: specification || "",
            unit: unit || "个",
            quantity: resolvedQuantity,
            purchasePrice: resolvedPurchasePrice,
            purchaseAmount: parseFloat(resolvedPurchaseAmount.toFixed(2)),
            salePrice: resolvedSalePrice,
            saleAmount: resolvedSaleAmount,
            amount: parseFloat(resolvedPurchaseAmount.toFixed(2)),
            supplier: supplier || "",
            taxType: ["含税", "普票", "不含"].includes(taxType)
              ? taxType
              : "含税",
            remark: remark,
            matchStatus: "unmatched" as const,
            productId: null,
            matchedProducts: []
          };
        });

        // 基本验证
        const validItems = items.filter(item => item.name.trim() !== "");

        if (validItems.length === 0) {
          reject(new Error("Excel文件中没有找到有效的产品数据"));
          return;
        }

        // 数据完整性验证
        const invalidRows = [];
        jsonData.forEach((row: any, index: number) => {
          const name =
            row["产品名称"] || row["name"] || row["productName"] || "";
          if (!name || name.toString().trim() === "") {
            invalidRows.push(index + 1);
          }
        });

        if (invalidRows.length > 0) {
          reject(
            new Error(
              `第 ${invalidRows.join(", ")} 行的产品名称为空，请检查数据完整性`
            )
          );
          return;
        }

        resolve(validItems);
      } catch (error) {
        reject(new Error("Excel文件解析失败：" + (error as Error).message));
      }
    };

    fileReader.onerror = () => reject(new Error("文件读取失败"));
    fileReader.readAsBinaryString(file);
  });
};

// 下载Excel模版
const downloadTemplate = () => {
  // 创建模版数据
  const templateData = [
    {
      产品名称: "示例产品1",
      规格型号: "示例规格1",
      单位: "个",
      数量: 10,
      价格: 100.0,
      进价金额: 1000.0,
      卖价: 120.0,
      销售金额: 1200.0,
      供应商: "示例供应商1",
      含税类型: "含税",
      备注: "示例备注1"
    },
    {
      产品名称: "示例产品2",
      规格型号: "示例规格2",
      单位: "台",
      数量: 5,
      价格: 500.0,
      进价金额: 2500.0,
      卖价: 650.0,
      销售金额: 3250.0,
      供应商: "示例供应商2",
      含税类型: "普票",
      备注: "示例备注2"
    }
  ];

  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // 设置列宽
  const columnWidths = [
    { wpx: 150 }, // 产品名称
    { wpx: 120 }, // 规格型号
    { wpx: 60 }, // 单位
    { wpx: 80 }, // 数量
    { wpx: 80 }, // 进价
    { wpx: 100 }, // 进价金额
    { wpx: 80 }, // 卖价
    { wpx: 100 }, // 销售金额
    { wpx: 120 }, // 供应商
    { wpx: 80 }, // 含税类型
    { wpx: 120 } // 备注
  ];
  worksheet["!cols"] = columnWidths;

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, "询价明细");

  // 导出Excel文件
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  // 创建下载链接
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "询价单上传模版.xlsx";
  link.click();

  // 清理URL对象
  URL.revokeObjectURL(link.href);
};

// 打开新增对话框
const handleAdd = () => {
  addDialogVisible.value = true;
  // 默认日期为今天
  addFormData.date = new Date().toISOString().split("T")[0];
};

// 提交新增表单
const handleAddSubmit = async () => {
  if (!addFormRef.value) return;

  await addFormRef.value.validate(async valid => {
    if (valid) {
      // 判断是否有Excel文件
      if (excelFile.value) {
        // 有Excel文件，解析并创建询价单
        try {
          loading.value = true;

          // 在前端解析Excel文件
          const excelItems = await parseInquiryExcelFile(excelFile.value);

          // 直接保存Excel解析结果为询价单，不进行产品匹配
          const saveRes = await saveExcelInquiry({
            name: addFormData.name,
            company: addFormData.company,
            date: addFormData.date,
            items: excelItems
          });

          if (saveRes.success) {
            ElMessage.success(
              `Excel上传成功，已导入 ${excelItems.length} 条产品明细`
            );
            addDialogVisible.value = false;
            resetAddForm();
            // 跳转到详情页面查看上传的数据
            router.push(`/inquiry/detail/${saveRes.data.id}`);
          } else {
            ElMessage.error(saveRes.message || "保存询价单失败");
          }
        } catch (error) {
          console.error("Excel解析错误:", error);
          const errorMessage = (error as Error).message;

          // 显示详细的错误提示
          ElMessage({
            type: "error",
            message: "Excel文件上传失败",
            duration: 5000,
            showClose: true,
            dangerouslyUseHTMLString: true,
            customClass: "excel-error-message"
          });

          // 延迟显示具体错误信息
          setTimeout(() => {
            ElMessage({
              type: "warning",
              message: errorMessage,
              duration: 8000,
              showClose: true
            });
          }, 100);
        } finally {
          loading.value = false;
        }
      } else {
        // 没有Excel文件，创建空询价单
        try {
          const res = await addInquiry(addFormData);
          if (res.success) {
            ElMessage.success("新增成功");
            addDialogVisible.value = false;
            resetAddForm();
            // 跳转到详情页面
            router.push(`/inquiry/detail/${res.data.id}`);
          } else {
            ElMessage.error(res.message);
          }
        } catch (error) {
          // error removed
          ElMessage.error("新增失败");
        }
      }
    }
  });
};

// 重置新增表单
const resetAddForm = () => {
  addFormData.name = "";
  addFormData.company = "";
  addFormData.date = "";
  excelFile.value = null;
  excelFileList.value = [];
  addFormRef.value?.clearValidate();
};

// 关闭新增对话框
const handleAddDialogClose = () => {
  resetAddForm();
};

// 删除询价单
const handleDelete = async (row: Inquiry) => {
  try {
    await ElMessageBox.confirm("确定要删除该询价单吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });

    const res = await deleteInquiry(row.id);
    if (res.success) {
      ElMessage.success("删除成功");
      fetchData();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    if (error !== "cancel") {
      // error removed
      ElMessage.error("删除失败");
    }
  }
};

// 批量选择相关方法
const handleSelectionChange = (selection: Inquiry[]) => {
  selectedInquiries.value = selection.map(item => item.id);
};

const handleSelectAll = (selection: Inquiry[]) => {
  if (selection.length === 0) {
    selectedInquiries.value = [];
  } else {
    selectedInquiries.value = selection.map(item => item.id);
  }
};

// 批量删除询价单
const handleBatchDelete = async () => {
  if (selectedInquiries.value.length === 0) {
    ElMessage.warning("请先选择要删除的询价单");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedInquiries.value.length} 个询价单吗？此操作不可恢复。`,
      "批量删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    // 批量删除询价单
    const promises = selectedInquiries.value.map(id => deleteInquiry(id));
    const results = await Promise.allSettled(promises);

    // 统计成功和失败的数量
    const successCount = results.filter(
      result => result.status === "fulfilled"
    ).length;
    const failedCount = results.length - successCount;

    if (successCount > 0) {
      ElMessage.success(`成功删除 ${successCount} 个询价单`);
      selectedInquiries.value = [];
      await fetchData();
    }

    if (failedCount > 0) {
      ElMessage.error(`${failedCount} 个询价单删除失败`);
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("批量删除失败");
    }
  }
};

// 查看详情
const handleViewDetail = (row: Inquiry) => {
  router.push(`/inquiry/detail/${row.id}`);
};

// Excel文件改变（用于新增询价）
const handleExcelFileChange = (file: UploadFile) => {
  excelFile.value = file.raw || null;
  // 提供用户反馈
  if (file.raw) {
    ElMessage.success(`文件 ${file.name} 已选择`);
  }
};

// 文件数量超限处理
const handleExceed = (files: File[]) => {
  ElMessage.warning(`只能选择1个文件，当前选择了${files.length}个文件`);
};

// 上传前验证
const beforeUpload = (file: File) => {
  const isExcel =
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel";
  const isLt10M = file.size / 1024 / 1024 < 10;

  if (!isExcel) {
    ElMessage.error("只能上传 Excel 文件 (.xlsx 或 .xls)");
    return false;
  }
  if (!isLt10M) {
    ElMessage.error("文件大小不能超过 10MB");
    return false;
  }
  return false; // 阻止自动上传
};

// 分页改变
const handlePageChange = (page: number) => {
  pagination.page = page;
  fetchData();
};

const handleSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  fetchData();
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
};

// 初始化
onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="inquiry-container">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true">
        <el-form-item label="询价名称">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入询价名称"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="询价公司">
          <el-input
            v-model="searchCompany"
            placeholder="请输入询价公司"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 主表格区域 -->
    <el-card shadow="never" class="mb-4">
      <!-- 操作按钮 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            新增询价
          </el-button>
          <el-button
            type="danger"
            :disabled="selectedInquiries.length === 0"
            @click="handleBatchDelete"
          >
            批量删除 ({{ selectedInquiries.length }})
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
        @select-all="handleSelectAll"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column label="询价名称" min-width="200">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              style="font-size: 14px"
              @click="handleViewDetail(row)"
            >
              {{ row.name }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column
          prop="company"
          label="询价公司"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column label="询价日期" width="120" align="center">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="itemCount"
          label="产品明细数"
          width="120"
          align="center"
        />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="danger"
              link
              :icon="Delete"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 新增询价对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="新增询价"
      width="600px"
      :close-on-click-modal="false"
      @close="handleAddDialogClose"
    >
      <el-form
        ref="addFormRef"
        :model="addFormData"
        :rules="addFormRules"
        label-width="100px"
      >
        <el-form-item label="询价名称" prop="name">
          <el-input
            v-model="addFormData.name"
            placeholder="请输入询价名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="询价公司" prop="company">
          <el-input
            v-model="addFormData.company"
            placeholder="请输入询价公司"
            clearable
          />
        </el-form-item>
        <el-form-item label="询价日期" prop="date">
          <el-date-picker
            v-model="addFormData.date"
            type="date"
            placeholder="请选择询价日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="Excel文件">
          <el-upload
            v-model:file-list="excelFileList"
            :auto-upload="false"
            :on-change="handleExcelFileChange"
            :on-exceed="handleExceed"
            :before-upload="beforeUpload"
            :limit="1"
            accept=".xlsx,.xls"
            drag
            :show-file-list="true"
            :multiple="false"
          >
            <div class="upload-content">
              <el-icon :size="48" color="#409EFF">
                <UploadFilled />
              </el-icon>
              <div class="upload-text">
                <p>点击或拖拽文件到此处上传</p>
                <p class="upload-tip">支持 .xlsx、.xls 格式文件（可选）</p>
                <div class="template-download">
                  <el-button
                    type="primary"
                    link
                    size="small"
                    @click="downloadTemplate"
                  >
                    <el-icon><Download /></el-icon>
                    下载Excel模版
                  </el-button>
                </div>
              </div>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.inquiry-container {
  padding: 8px;
}

.search-card {
  margin-bottom: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;

  .toolbar-left {
    display: flex;
    gap: 10px;
  }

  .toolbar-right {
    display: flex;
    gap: 10px;
  }
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
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

/* Excel上传区域样式 */
.template-download {
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px dashed #e4e7ed;
}

.template-download .el-button {
  padding: 4px 8px;
  font-size: 12px;
}

/* Excel错误消息样式 */
:deep(.excel-error-message) {
  z-index: 3000 !important;
}

:deep(.excel-error-message .el-message__content) {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

/* 上传内容样式优化 */
.upload-content-simple {
  text-align: center;
}

.upload-text p {
  margin: 8px 0;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
}
</style>
