<template>
  <div class="contract-container">
    <!-- 顶部返回按钮 -->
    <div class="top-back-button">
      <div class="flex items-center gap-4">
        <el-button :icon="ArrowLeft" @click="handleBack">返回列表</el-button>
        <div class="company-name">{{ route.query.company_name || "" }}</div>
      </div>
    </div>

    <!-- 统计信息卡片 -->
    <el-card class="statistics-card" shadow="never">
      <div class="statistics-container">
        <div class="stat-item">
          <div class="year-selector">
            <el-select
              v-model="currentYear"
              placeholder="选择年度"
              style="width: 100px"
              @change="handleYearChange"
            >
              <el-option
                v-for="year in yearOptions"
                :key="year"
                :label="year"
                :value="year"
              />
            </el-select>
          </div>
        </div>
        <el-divider direction="vertical" />
        <div class="stat-item">
          <div class="stat-wrapper">
            <div class="stat-number">
              ¥{{ formatMoney(statistics.total_sales) }}
            </div>
            <div class="stat-label">{{ currentYear }}年销售总额</div>
          </div>
        </div>
        <el-divider direction="vertical" />
        <div class="stat-item">
          <div class="stat-wrapper">
            <div class="stat-number">
              ¥{{ formatMoney(statistics.total_profit) }}
            </div>
            <div class="stat-label">{{ currentYear }}年利润</div>
          </div>
        </div>
        <el-divider direction="vertical" />
        <div class="stat-item">
          <div class="stat-wrapper">
            <div class="stat-number">
              ¥{{ formatMoney(statistics.total_uncredited_amount || 0) }}
            </div>
            <div class="stat-label">未挂账金额</div>
          </div>
        </div>
        <el-divider direction="vertical" />
        <div class="stat-item">
          <div class="stat-wrapper">
            <div class="stat-number">{{ statistics.contract_count }}</div>
            <div class="stat-label">{{ currentYear }}年合同数</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 操作栏和表格 -->
    <el-card shadow="never">
      <!-- 操作按钮 -->
      <div class="mb-4 flex justify-between">
        <div>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            添加合同
          </el-button>
        </div>
        <el-button :icon="Refresh" @click="loadContractList">刷新</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="contractList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column
          prop="contract_name"
          label="合同名称"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link
              type="primary"
              :underline="false"
              @click="handleViewContract(row)"
            >
              {{ row.contract_name }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column
          prop="contract_amount"
          label="合同金额"
          width="120"
          align="right"
        >
          <template #default="{ row }">
            ¥{{ formatMoney(row.contract_amount) }}
          </template>
        </el-table-column>

        <el-table-column
          prop="contract_year"
          label="所属年度"
          width="100"
          align="center"
        />

        <el-table-column
          prop="contract_date"
          label="签订日期"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            {{ row.contract_date || "-" }}
          </template>
        </el-table-column>

        <el-table-column label="附件" width="100" align="center">
          <template #default="{ row }">
            <div class="attachment-icons">
              <el-button
                v-if="row.image_count > 0"
                link
                type="primary"
                size="small"
                class="attachment-button"
                :title="`点击预览图片 (${row.image_count}个)`"
                @click="handlePreviewAttachment(row.id, 'image')"
              >
                <el-icon class="attachment-icon" style="color: #67c23a">
                  <PictureFilled />
                </el-icon>
                <span v-if="row.image_count > 1" class="attachment-count">{{
                  row.image_count
                }}</span>
              </el-button>

              <el-button
                v-if="row.pdf_count > 0"
                link
                type="primary"
                size="small"
                class="attachment-button"
                :title="`点击预览PDF (${row.pdf_count}个)`"
                @click="handlePreviewAttachment(row.id, 'pdf')"
              >
                <el-icon class="attachment-icon" style="color: #e6a23c">
                  <Document />
                </el-icon>
                <span v-if="row.pdf_count > 1" class="attachment-count">{{
                  row.pdf_count
                }}</span>
              </el-button>

              <el-button
                v-if="row.other_count > 0"
                link
                type="primary"
                size="small"
                class="attachment-button"
                :title="`点击查看文件 (${row.other_count}个)`"
                @click="handlePreviewAttachment(row.id, 'other')"
              >
                <el-icon class="attachment-icon" style="color: #909399">
                  <Files />
                </el-icon>
                <span v-if="row.other_count > 1" class="attachment-count">{{
                  row.other_count
                }}</span>
              </el-button>

              <span
                v-if="row.attachment_count === 0"
                class="no-attachment"
                title="无附件"
                >-</span
              >
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleEdit(row)"
            >
              修改
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
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
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑合同弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="合同名称" prop="contract_name">
          <el-input
            v-model="formData.contract_name"
            placeholder="请输入合同名称"
          />
        </el-form-item>

        <el-form-item label="所属年度" prop="contract_year">
          <el-date-picker
            v-model="formData.contract_year"
            type="year"
            placeholder="根据签订日期自动生成"
            format="YYYY"
            value-format="YYYY"
            style="width: 100%"
            disabled
          />
        </el-form-item>

        <el-form-item label="签订日期" prop="contract_date">
          <el-date-picker
            v-model="formData.contract_date"
            type="date"
            placeholder="请选择签订日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="合同附件">
          <el-upload
            ref="uploadRef"
            v-model:file-list="fileList"
            :auto-upload="false"
            :limit="5"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :disabled="attachmentUploading"
            action="#"
            multiple
          >
            <el-button type="primary" :loading="attachmentUploading"
              >选择文件</el-button
            >
            <template #tip>
              <div class="el-upload__tip">
                支持图片、PDF、Excel、Word等格式，最多上传5个文件，单个文件不超过50MB
              </div>
            </template>
          </el-upload>
          <div
            v-if="contractAttachments.length > 0"
            class="mt-2 text-sm text-gray-500"
          >
            已上传附件：{{ contractAttachments.length }} 个文件
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="submitLoading"
            @click="handleSubmit"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 附件查看对话框 -->
    <el-dialog
      v-model="attachmentDialogVisible"
      title="合同附件"
      width="600px"
      :close-on-click-modal="false"
    >
      <div
        v-if="currentAttachments.length === 0"
        class="text-center py-8 text-gray-500"
      >
        暂无附件
      </div>
      <div v-else class="attachment-list">
        <div
          v-for="attachment in currentAttachments"
          :key="attachment.id"
          class="attachment-item"
        >
          <div class="attachment-info">
            <div class="attachment-name" :title="attachment.file_name">
              {{ attachment.file_name }}
            </div>
            <div class="attachment-meta">
              <span class="attachment-size">
                {{ formatFileSize(attachment.file_size) }}
              </span>
              <span class="attachment-type">
                {{ getFileTypeLabel(attachment.file_type) }}
              </span>
            </div>
          </div>
          <div class="attachment-actions">
            <el-button
              link
              type="primary"
              size="small"
              @click="handleDownloadAttachment(attachment)"
            >
              下载
            </el-button>
            <el-button
              v-if="isImageFile(attachment.file_type)"
              link
              type="success"
              size="small"
              @click="handlePreviewImage(attachment)"
            >
              预览
            </el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="attachmentDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 图片预览组件（与供应商详情页保持一致） -->
    <ImagePreview
      v-model="imagePreviewVisible"
      :images="previewImages"
      :initial-index="currentImageIndex"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, h } from "vue";

defineOptions({
  name: "ContractList"
});
import { useRoute, useRouter } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
  type UploadFile
} from "element-plus";
import {
  Plus,
  ArrowLeft,
  Refresh,
  PictureFilled,
  Document,
  DocumentCopy,
  Loading,
  Files
} from "@element-plus/icons-vue";
import {
  getContractList,
  addContract,
  updateContract,
  deleteContract,
  getContractStatistics,
  getCompanyList,
  getAllCompanies,
  uploadContractFile,
  getContractAttachments,
  uploadContractAttachment,
  type Contract,
  type Company,
  type ContractStatistics,
  type ContractAttachment
} from "@/api/business";
import { formatMoney } from "@/utils/format";
import ImagePreview from "@/components/ImagePreview";
import { getSignedFileUrl, extractOssObjectPath } from "@/services/storage";

const route = useRoute();
const router = useRouter();

// 响应式数据
const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = computed(() => {
  const baseTitle = isEdit.value ? "编辑合同" : "添加合同";

  // 如果从公司页面进入，在标题中显示公司名称
  if (isFromCompanyPage.value && !isEdit.value) {
    return `${baseTitle} - ${route.query.company_name}`;
  }

  return baseTitle;
});
const companyOptions = ref<{ id: number; company_name: string }[]>([]);
const contractListTitle = computed(() => {
  if (route.query.company_name) {
    return `${route.query.company_name}`;
  }
  return "";
});

// 判断是否从公司页面进入（用于智能设置默认公司）
const isFromCompanyPage = computed(() => {
  return !!(route.query.company_id && route.query.company_name);
});

const isEdit = ref(false);
const uploadRef = ref();
const uploading = ref(false);
const fileList = ref<UploadFile[]>([]);

const searchForm = reactive({
  company_id: undefined as number | undefined,
  contract_year: new Date().getFullYear() as number | undefined // 默认使用当前农历年度
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

const contractList = ref<Contract[]>([]);
const statistics = ref<ContractStatistics>({
  total_sales: 0,
  total_profit: 0,
  total_uncredited_amount: 0,
  contract_count: 0,
  year: new Date().getFullYear()
});

const currentYear = ref(new Date().getFullYear()); // 默认使用当前农历年度
const yearOptions = computed(() => {
  const currentYearValue = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYearValue - 2 + i);
});

const DEFAULT_CONTRACT_STATUS: 1 | 0 = 1;
const DEFAULT_CREATED_BY = 1;

type ContractFormState = Omit<Contract, "contract_year" | "contract_date"> & {
  contract_year: string;
  contract_date?: string;
};

const formData = reactive<ContractFormState>({
  id: 0,
  contract_name: "",
  company_id: undefined as number | undefined,
  contract_amount: 0,
  contract_year: new Date().getFullYear().toString(),
  contract_date: undefined,
  remark: "",
  status: DEFAULT_CONTRACT_STATUS,
  created_by: DEFAULT_CREATED_BY,
  created_at: "",
  updated_at: ""
});

// 根据签订日期自动计算所属年度
const updateContractYear = (dateStr: string) => {
  if (!dateStr) return;
  try {
    const date = new Date(dateStr);
    // 规则：签订日期在本年的正月初一与除夕夜结束之间的日期属于当前年度
    // 例如今年是2025年，那么年度就归属于2025年
    // 这实际上就是公历年度
    formData.contract_year = date.getFullYear().toString();
  } catch (error) {
    console.error("计算所属年度失败:", error);
  }
};

// 监听签订日期变化，自动更新所属年度
watch(
  () => formData.contract_date,
  newDate => {
    if (newDate) {
      updateContractYear(newDate);
    }
  }
);

// 附件相关数据
const contractAttachments = ref<ContractAttachment[]>([]);
const attachmentUploading = ref(false);

// 附件对话框相关数据
const attachmentDialogVisible = ref(false);
const currentAttachments = ref<ContractAttachment[]>([]);

// 附件统计信息缓存
const attachmentStatsCache = ref<
  Map<number, { total: number; images: number; pdfs: number; others: number }>
>(new Map());

const formRules: FormRules = {
  contract_name: [
    { required: true, message: "请输入合同名称", trigger: "blur" },
    {
      min: 2,
      max: 100,
      message: "合同名称长度在 2 到 100 个字符",
      trigger: "blur"
    }
  ],
  contract_year: [
    { required: true, message: "请选择所属年度", trigger: "change" }
  ],
  contract_date: [
    { required: true, message: "请选择签订日期", trigger: "change" }
  ]
};

const formRef = ref<FormInstance>();

// 图片预览相关
const imagePreviewVisible = ref(false);
const previewImages = ref<string[]>([]);
const currentImageIndex = ref(0);

// 方法

const loadStatistics = async () => {
  try {
    const response = await getContractStatistics(
      currentYear.value,
      searchForm.company_id
    );
    statistics.value = (response as any).data || response; // 兼容两种返回格式
  } catch (error) {
    console.error("加载统计数据失败:", error);
  }
};

// 根据公司ID查询最常见的合同年度
const getMostCommonYear = async (
  companyId?: number
): Promise<number | null> => {
  if (!companyId) return null;

  try {
    // 查询该公司的所有合同年度
    const response = await getContractList({
      company_id: companyId,
      page: 1,
      pageSize: 1000 // 获取足够多的数据以统计年度分布
    });

    const contracts =
      (response as any).data?.list || (response as any).list || [];
    if (contracts.length === 0) return null;

    // 统计每个年度的合同数量
    const yearCounts: Record<number, number> = {};
    contracts.forEach((contract: Contract) => {
      const year = contract.contract_year;
      if (year) {
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    // 找到合同数量最多的年度
    let mostCommonYear: number | null = null;
    let maxCount = 0;
    Object.entries(yearCounts).forEach(([year, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonYear = Number(year);
      }
    });

    return mostCommonYear;
  } catch (error) {
    console.error("查询合同年度分布失败:", error);
    return null;
  }
};

const loadContractList = async () => {
  try {
    loading.value = true;
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      company_id: searchForm.company_id,
      contract_year: searchForm.contract_year
    };

    const response = await getContractList(params);
    const result = (response as any).data || response; // 兼容两种返回格式
    contractList.value = result.list;
    pagination.total = result.total;

    // 为每个合同加载附件统计信息
    if (result.list && result.list.length > 0) {
      const attachmentPromises = result.list.map(async (contract: any) => {
        try {
          const stats = await getAttachmentStatsWithCache(contract.id);
          return {
            ...contract,
            attachment_count: stats ? stats.total : 0,
            image_count: stats ? stats.images : 0,
            pdf_count: stats ? stats.pdfs : 0,
            other_count: stats ? stats.others : 0
          };
        } catch (error) {
          console.error("获取附件统计失败:", contract.id, error);
          return {
            ...contract,
            attachment_count: 0,
            image_count: 0,
            pdf_count: 0,
            other_count: 0
          };
        }
      });

      const contractsWithAttachments = await Promise.all(attachmentPromises);
      contractList.value = contractsWithAttachments;
    } else {
      // 如果没有数据，直接设置为空数组
      contractList.value = [];
    }

    // 调试信息：合同列表加载完成
    console.log("合同列表加载完成:", {
      total: result.total,
      contractCount: result.list.length
    });
  } catch (error) {
    console.error("加载合同列表失败:", error);
    ElMessage.error(
      error instanceof Error ? error.message : "加载合同列表失败"
    );
  } finally {
    loading.value = false;
  }
};

// 🚀 性能优化：防抖处理，避免重复查询
let routeChangeTimer: ReturnType<typeof setTimeout> | null = null;

// 监听路由参数变化
watch(
  () => route.query,
  async newQuery => {
    // 清除之前的定时器
    if (routeChangeTimer) {
      clearTimeout(routeChangeTimer);
    }

    // 🚀 性能优化：批量处理查询，减少API调用次数
    routeChangeTimer = setTimeout(async () => {
      let needsListReload = false;
      let needsStatisticsReload = false;

      // 更新搜索表单
      if (newQuery.company_id !== undefined) {
        const newCompanyId = Number(newQuery.company_id);
        if (searchForm.company_id !== newCompanyId) {
          searchForm.company_id = newCompanyId;
          needsListReload = true;
          needsStatisticsReload = true;
        }
      } else {
        if (searchForm.company_id !== undefined) {
          searchForm.company_id = undefined;
          needsListReload = true;
          needsStatisticsReload = true;
        }
      }

      // 处理年度变化
      if (newQuery.contract_year !== undefined) {
        const newYear = Number(newQuery.contract_year);
        if (currentYear.value !== newYear) {
          currentYear.value = newYear;
          searchForm.contract_year = newYear;
          needsListReload = true;
          needsStatisticsReload = true;
        }
      } else if (searchForm.company_id && !searchForm.contract_year) {
        // 只在首次加载时查询该公司最常见的年度，避免重复查询
        const mostCommonYear = await getMostCommonYear(searchForm.company_id);
        if (mostCommonYear && mostCommonYear !== currentYear.value) {
          currentYear.value = mostCommonYear;
          searchForm.contract_year = mostCommonYear;
          needsListReload = true;
          needsStatisticsReload = true;
        }
      }

      // 🚀 性能优化：并行执行查询
      if (needsListReload || needsStatisticsReload) {
        const promises: Promise<any>[] = [];

        if (needsListReload) {
          promises.push(loadContractList());
        }

        if (needsStatisticsReload) {
          promises.push(loadStatistics());
        }

        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }
      }
    }, 100); // 100ms防抖，提高响应速度
  },
  { immediate: true }
);

const handleYearChange = (year: number) => {
  currentYear.value = year;
  searchForm.contract_year = year;
  loadContractList();
  loadStatistics();
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.page = 1;
  loadContractList();
};

const handleCurrentChange = (page: number) => {
  pagination.page = page;
  loadContractList();
};

const handleViewContract = (contract: Contract) => {
  router.push({
    name: "ContractDetail",
    params: { id: contract.id }
  });
};

const handleAdd = () => {
  isEdit.value = false;
  dialogVisible.value = true;
  resetForm();

  // 智能设置默认值
  formData.contract_year = currentYear.value.toString();
  // 设置默认日期为当前日期
  formData.contract_date = new Date().toISOString().split("T")[0];

  if (isFromCompanyPage.value && route.query.company_name) {
    // 从公司页面进入时，使用公司名称设置默认合同名称
    const companyName = route.query.company_name as string;
    if (!formData.contract_name && companyName) {
      formData.contract_name = `${companyName} ${currentYear.value}年度合同`;
    }
  }
};

const handleEdit = (contract: Contract) => {
  isEdit.value = true;
  dialogVisible.value = true;

  Object.assign(formData, {
    id: contract.id,
    contract_name: contract.contract_name,
    company_id: contract.company_id, // 保留company_id用于后端提交，但不显示
    contract_amount: contract.contract_amount,
    contract_year: (contract.contract_year ?? currentYear.value).toString(),
    contract_date: contract.contract_date,
    remark: contract.remark || "", // 备注字段在后台仍然处理，只是不在界面显示
    status: contract.status,
    created_by: contract.created_by,
    created_at: contract.created_at,
    updated_at: contract.updated_at
  });

  // 加载合同附件
  loadContractAttachments(contract.id);
};

const handleDelete = async (contract: Contract) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除合同"${contract.contract_name}"吗？此操作不可恢复。`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    const result = await deleteContract(contract.id);

    if (result.success) {
      ElMessage.success(result.message || "删除成功");
      loadContractList();
      loadStatistics();
    } else {
      throw new Error(result.message || "删除失败");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除合同失败:", error);
      ElMessage.error("删除合同失败");
    }
  }
};

const handleFileChange = async (file: UploadFile) => {
  if (!file.raw) return;

  // 验证文件类型
  const allowedTypes = [
    "image/",
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  const isValidType = allowedTypes.some(type =>
    file.raw?.type.startsWith(type)
  );

  if (!isValidType) {
    ElMessage.warning("不支持的文件类型，请上传图片、PDF、Excel或Word文件");
    uploadRef.value?.remove(file);
    return;
  }

  // 验证文件大小（限制为50MB）
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.raw.size > maxSize) {
    ElMessage.warning("文件大小不能超过50MB");
    uploadRef.value?.remove(file);
    return;
  }

  // 文件验证通过，等待提交时一起上传
  console.log("文件验证通过:", file.name);
};

const handleFileRemove = (file: UploadFile) => {
  console.log("文件移除:", file.name);
  // 新的实现中，文件移除只需要更新fileList，实际附件处理在提交时进行
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    // 准备合同数据（移除 attachment_url）
    // 确保company_id有值，优先使用路由参数中的公司ID
    const companyId =
      formData.company_id ||
      (isFromCompanyPage.value ? Number(route.query.company_id) : undefined);

    if (!companyId) {
      throw new Error("缺少必要的公司信息，无法保存合同");
    }

    const submitData: Omit<Contract, "id" | "created_at" | "updated_at"> = {
      contract_name: formData.contract_name,
      company_id: companyId,
      contract_amount: formData.contract_amount,
      contract_year: Number(formData.contract_year),
      contract_date: formData.contract_date,
      remark: formData.remark || undefined,
      status: formData.status,
      created_by: formData.created_by
    };

    let contractResult: any;

    if (isEdit.value) {
      // 更新现有合同
      const updatePayload: Contract = {
        ...submitData,
        id: formData.id,
        created_at: formData.created_at,
        updated_at: new Date().toISOString()
      };
      contractResult = await updateContract(updatePayload);
      if (!contractResult.success) {
        throw new Error(contractResult.message || "更新失败");
      }
    } else {
      // 创建新合同
      contractResult = await addContract(submitData);
      if (!contractResult.success) {
        throw new Error(contractResult.message || "创建失败");
      }
    }

    // 处理附件上传
    const contractId = isEdit.value ? formData.id : contractResult.data.id;

    if (fileList.value.length > 0) {
      attachmentUploading.value = true;

      try {
        for (const file of fileList.value) {
          if (file.raw) {
            const uploadResult = await uploadContractAttachment(
              file.raw,
              contractId,
              DEFAULT_CREATED_BY
            );

            if (!uploadResult.success) {
              console.error("附件上传失败:", uploadResult.message);
              ElMessage.warning(
                `文件 ${file.name} 上传失败: ${uploadResult.message}`
              );
            } else {
              console.log("附件上传成功:", uploadResult.data);
            }
          }
        }

        if (attachmentUploading.value) {
          ElMessage.success("合同附件上传完成");
        }
      } catch (error) {
        console.error("附件上传过程中出现错误:", error);
        ElMessage.warning("部分附件上传失败，但合同已保存");
      } finally {
        attachmentUploading.value = false;
      }
    }

    ElMessage.success(isEdit.value ? "合同更新成功" : "合同创建成功");
    dialogVisible.value = false;

    // 清理附件统计缓存，确保数据显示一致性
    if (isEdit.value && formData.id) {
      attachmentStatsCache.value.delete(formData.id);
    }

    await loadContractList();
  } catch (error: any) {
    console.error("提交失败:", error);
    ElMessage.error(error.message || "操作失败");
  } finally {
    submitLoading.value = false;
  }
};

const handleDialogClose = () => {
  resetForm();
  uploadRef.value?.clearFiles();
  fileList.value = [];
};

const resetForm = () => {
  // 设置默认company_id（从路由参数获取，但不显示）
  const defaultCompanyId = isFromCompanyPage.value
    ? Number(route.query.company_id)
    : undefined;

  Object.assign(formData, {
    id: 0,
    contract_name: "",
    company_id: defaultCompanyId, // 设置默认公司ID但不显示
    contract_amount: 0,
    contract_year: currentYear.value.toString(), // 默认使用当前年度
    contract_date: undefined, // 不设置默认日期
    remark: "", // 备注字段在后台仍然存在，只是不在界面显示
    status: DEFAULT_CONTRACT_STATUS,
    created_by: DEFAULT_CREATED_BY,
    created_at: "",
    updated_at: ""
  });

  // 重置附件相关数据
  contractAttachments.value = [];
  fileList.value = [];

  formRef.value?.clearValidate();
};

const handleBack = () => {
  router.push("/business/companies");
};

// 加载公司列表
const loadCompanies = async () => {
  try {
    const result = await getAllCompanies();
    if (result.data) {
      companyOptions.value = result.data;
    }
  } catch (error) {
    console.error("加载公司列表失败:", error);
    ElMessage.error("加载公司列表失败");
  }
};

// 生命周期
onMounted(async () => {
  // 加载公司列表
  await loadCompanies();

  // 处理路由参数 - 手动触发一次以确保数据加载
  if (route.query.company_id) {
    searchForm.company_id = Number(route.query.company_id);
    // 手动调用一次加载，避免watch防抖导致的数据不显示
    await loadContractList();
    await loadStatistics();
  }
});

// 加载合同附件
const loadContractAttachments = async (contractId: number) => {
  try {
    const result = await getContractAttachments(contractId);
    if (result.data) {
      contractAttachments.value = result.data;

      // 为编辑模式构建文件列表显示
      fileList.value = contractAttachments.value.map(
        (att: ContractAttachment, index: number) =>
          ({
            uid: att.id,
            name: att.file_name,
            url: att.file_url,
            status: "success" as const
          }) as unknown as UploadFile
      );
    } else {
      contractAttachments.value = [];
      fileList.value = [];
    }
  } catch (error) {
    console.error("加载合同附件失败:", error);
    contractAttachments.value = [];
    fileList.value = [];
  }
};

// 获取文件类型对应的图标
const getFileTypeIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return PictureFilled;
  } else if (fileType === "application/pdf") {
    return Document;
  } else if (fileType.includes("sheet") || fileType.includes("excel")) {
    return DocumentCopy;
  } else {
    return Files;
  }
};

// 获取文件类型对应的颜色
const getFileTypeColor = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return "#67C23A"; // 绿色 - 图片
  } else if (fileType === "application/pdf") {
    return "#E6A23C"; // 橙色 - PDF
  } else if (fileType.includes("sheet") || fileType.includes("excel")) {
    return "#409EFF"; // 蓝色 - Excel
  } else {
    return "#909399"; // 灰色 - 其他
  }
};

// 获取附件统计信息（带缓存）
const getAttachmentStatsWithCache = async (contractId: number) => {
  // 检查缓存
  const cached = attachmentStatsCache.value.get(contractId);
  if (cached) {
    return cached;
  }

  try {
    const result = await getContractAttachments(contractId);
    if (result.data && result.data.length > 0) {
      const stats = {
        total: result.data.length,
        images: result.data.filter((att: ContractAttachment) =>
          att.file_type.startsWith("image/")
        ).length,
        pdfs: result.data.filter(
          (att: ContractAttachment) => att.file_type === "application/pdf"
        ).length,
        others: result.data.filter(
          (att: ContractAttachment) =>
            !att.file_type.startsWith("image/") &&
            att.file_type !== "application/pdf"
        ).length
      };
      // 缓存结果
      attachmentStatsCache.value.set(contractId, stats);
      return stats;
    }
    return null;
  } catch (error) {
    console.error("获取附件统计失败:", error);
    return null;
  }
};

// 检查合同是否有附件，并返回附件统计信息
const getAttachmentStats = async (contractId: number) => {
  try {
    const result = await getContractAttachments(contractId);
    if (result.data && result.data.length > 0) {
      const stats = {
        total: result.data.length,
        images: result.data.filter((att: ContractAttachment) =>
          att.file_type.startsWith("image/")
        ).length,
        pdfs: result.data.filter(
          (att: ContractAttachment) => att.file_type === "application/pdf"
        ).length,
        others: result.data.filter(
          (att: ContractAttachment) =>
            !att.file_type.startsWith("image/") &&
            att.file_type !== "application/pdf"
        ).length
      };
      return stats;
    }
    return null;
  } catch (error) {
    console.error("获取附件统计失败:", error);
    return null;
  }
};

const fetchAsObjectUrl = async (
  url: string,
  fileType?: string
): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`获取文件失败: ${response.status}`);
  const blob = await response.blob();
  // 为兼容部分浏览器插件干扰内嵌 PDF/图片，统一生成 blob URL
  return URL.createObjectURL(
    fileType ? new Blob([blob], { type: fileType }) : blob
  );
};

// 确保 OSS 附件使用签名链接（适配私有桶和自定义域名）
const ensureSignedAttachmentUrl = async (att: ContractAttachment) => {
  const cleanUrl = att.file_url.split("?")[0];
  const objectPath = extractOssObjectPath(cleanUrl);
  if (!objectPath) throw new Error("附件路径无效");

  const fileName = att.file_name || cleanUrl.split("/").pop() || "file";
  const signed = await getSignedFileUrl(objectPath, 3600, {
    inline: true,
    fileName
  });
  if (!signed) {
    throw new Error("附件签名生成失败");
  }
  return signed;
};

// 直接预览附件（为私有 OSS 场景提供 blob URL，规避浏览器插件的 content_script 干扰）
const handlePreviewAttachment = async (
  contractId: number,
  fileType: string
) => {
  try {
    const result = await getContractAttachments(contractId);
    if (!result.data || result.data.length === 0) {
      ElMessage.warning("该合同暂无附件");
      return;
    }

    // 根据点击的文件类型筛选附件
    let attachmentsToPreview = result.data;
    if (fileType === "image") {
      attachmentsToPreview = result.data.filter((att: ContractAttachment) =>
        att.file_type.startsWith("image/")
      );
    } else if (fileType === "pdf") {
      attachmentsToPreview = result.data.filter(
        (att: ContractAttachment) => att.file_type === "application/pdf"
      );
    } else if (fileType === "other") {
      attachmentsToPreview = result.data.filter(
        (att: ContractAttachment) =>
          !att.file_type.startsWith("image/") &&
          att.file_type !== "application/pdf"
      );
    }

    if (attachmentsToPreview.length === 0) {
      ElMessage.warning(
        `该合同暂无${fileType === "image" ? "图片" : fileType === "pdf" ? "PDF" : "其他"}附件`
      );
      return;
    }

    if (fileType === "image") {
      // 预览图片 - 转为 blob URL，避免 CSP/插件拦截
      const imageUrls = await Promise.all(
        attachmentsToPreview.map(async (att: ContractAttachment) => {
          return await fetchAsObjectUrl(att.file_url, att.file_type);
        })
      );
      previewImages.value = imageUrls;
      currentImageIndex.value = 0;
      imagePreviewVisible.value = true;
      return;
    }

    // PDF 和其它文件：使用签名 URL，避免私有桶 AccessDenied/弹窗拦截
    const target = attachmentsToPreview[0];
    try {
      const signedUrl = await ensureSignedAttachmentUrl(target);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.warn("签名预览失败:", err);
      throw err;
    }
  } catch (error) {
    console.error("预览附件失败:", error);
    ElMessage.error("预览失败，请重新上传该附件后重试");
  }
};

// 查看合同附件（保留原功能，供其他地方调用）
const handleViewAttachments = async (row: Contract) => {
  try {
    const result = await getContractAttachments(row.id);
    if (result.data) {
      currentAttachments.value = result.data;
      attachmentDialogVisible.value = true;
    } else {
      currentAttachments.value = [];
      attachmentDialogVisible.value = true;
    }
  } catch (error) {
    console.error("获取合同附件失败:", error);
    ElMessage.error("获取合同附件失败");
  }
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 获取文件类型标签
const getFileTypeLabel = (fileType: string): string => {
  if (fileType.startsWith("image/")) {
    return "图片";
  } else if (fileType === "application/pdf") {
    return "PDF";
  } else if (fileType.includes("word") || fileType.includes("document")) {
    return "Word";
  } else if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
    return "Excel";
  } else if (
    fileType.includes("powerpoint") ||
    fileType.includes("presentation")
  ) {
    return "PPT";
  } else if (fileType.includes("text")) {
    return "文本";
  } else {
    return "文件";
  }
};

// 判断是否为图片文件
const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith("image/");
};

// 下载附件
const handleDownloadAttachment = (attachment: ContractAttachment) => {
  const link = document.createElement("a");
  link.href = attachment.file_url;
  link.download = attachment.file_name;
  link.target = "_blank";
  link.click();
};

// 预览图片
const handlePreviewImage = (attachment: ContractAttachment) => {
  previewImages.value = [attachment.file_url];
  currentImageIndex.value = 0;
  imagePreviewVisible.value = true;
};
</script>

<style scoped>
/* 响应式调整 */
@media (width <= 768px) {
  .top-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    padding: 12px;
  }

  .toolbar-left {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .toolbar-right {
    justify-content: flex-start;
  }

  .statistics-container {
    flex-direction: column;
    gap: 16px;
    padding: 16px 0;
  }

  .stat-item {
    width: 100%;
  }

  .el-divider--vertical {
    display: none;
  }
}

/* 响应式文件名显示 */
@media (width <= 768px) {
  :deep(.el-upload-list__item-name) {
    max-width: 180px;
  }
}

@media (width <= 480px) {
  :deep(.el-upload-list__item-name) {
    max-width: 120px;
  }
}

/* 响应式附件图标 */
@media (width <= 768px) {
  .attachment-icons {
    gap: 2px;
  }

  .attachment-icon {
    font-size: 14px;
  }

  .attachment-count {
    min-width: 12px;
    height: 12px;
    font-size: 9px;
    line-height: 10px;
  }
}

.contract-container {
  padding: 8px;
}

/* 公司名称显示样式 */
.company-display {
  width: 100%;
}

.company-name-text {
  height: 32px;
  padding: 0 11px;
  font-size: 14px;
  font-weight: 500;
  line-height: 32px;
  color: #606266;
  text-align: left;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

/* 顶部返回按钮样式 */
.top-back-button {
  margin-bottom: 16px;
}

.company-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

/* 顶部操作栏样式 */
.top-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 1rem;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

/* 统计卡片样式 */
.statistics-card {
  margin-bottom: 1rem;
}

.statistics-container {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  padding: 20px 0;
}

.stat-item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-width: 0; /* 防止内容溢出 */
}

.statistics-container .el-divider--vertical {
  flex-shrink: 0;
}

.stat-wrapper {
  text-align: center;
}

.year-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.stat-number {
  margin-bottom: 4px;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

/* Element Plus 分割线样式优化 */
.el-divider--vertical {
  height: 40px;
  margin: 0 16px;
  border-left: 1px solid #e5e7eb;
}

/* 附件展示样式 */
.attachment-badge {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.attachment-icon-button {
  padding: 2px;
  color: #2563eb;
}

.attachment-icon-button:hover {
  color: #1d4ed8;
}

/* Element Plus 表格样式修复 */
:deep(.el-table__body-wrapper) {
  .el-table__body {
    tr {
      background-color: #fff !important;

      td {
        color: #606266 !important;
        background-color: #fff !important;
        border-bottom: 1px solid #ebeef5;
      }

      &:hover td {
        background-color: #f5f7fa !important;
      }
    }
  }
}

/* 图片预览对话框样式 */
:deep(.image-preview-dialog) {
  .el-message-box__message {
    text-align: center;
  }

  .el-message-box__content {
    max-height: 500px;
    overflow-y: auto;
  }

  img {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
    transition: transform 0.2s ease;

    &:hover {
      transform: scale(1.02);
    }
  }
}

/* 附件缩略图样式 */
.attachment-thumbnail-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.attachment-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attachment-thumbnail-wrapper:hover {
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
  transform: scale(1.05);
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
  border-radius: 4px;

  .el-icon {
    margin-bottom: 2px;
  }
}

/* 附件对话框样式 */
.attachment-list {
  max-height: 400px;
  overflow-y: auto;
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  background-color: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f0f9ff;
    border-color: #409eff;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.attachment-info {
  flex: 1;
  min-width: 0;
  margin-right: 16px;
}

.attachment-name {
  display: -webkit-box;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: #303133;
  word-break: break-all;
  -webkit-box-orient: vertical;
}

.attachment-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.attachment-size {
  padding: 2px 6px;
  font-weight: 500;
  background-color: #f0f2f5;
  border-radius: 4px;
}

.attachment-type {
  padding: 2px 6px;
  font-weight: 500;
  color: #67c23a;
  background-color: #e1f3d8;
  border-radius: 4px;
}

.attachment-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

/* 上传组件文件列表样式优化 */
:deep(.el-upload-list) {
  max-height: 200px;
  margin-top: 8px;
  overflow-y: auto;
}

:deep(.el-upload-list__item) {
  margin-bottom: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f0f9ff;
  }
}

:deep(.el-upload-list__item-name) {
  flex: 1;
  min-width: 0;
  margin-right: 8px;

  .el-icon {
    flex-shrink: 0;
    margin-right: 8px;
  }

  span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-all;
    white-space: nowrap;
  }
}

:deep(.el-upload-list__item-status-label) {
  position: absolute;
  top: 50%;
  right: 8px;
  z-index: 1;
  transform: translateY(-50%);
}

:deep(.el-upload-list__item-actions) {
  position: absolute;
  top: 50%;
  right: 30px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity 0.2s ease;
}

:deep(.el-upload-list__item:hover .el-upload-list__item-actions) {
  opacity: 1;
}

/* 上传按钮样式优化 */
:deep(.el-upload-dragger) {
  width: 100%;
  height: 100px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f0f9ff;
    border-color: #409eff;
  }
}

/* 附件图标样式 */
.attachment-icons {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-height: 24px;
}

.attachment-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 2px 4px;
}

.attachment-icon {
  font-size: 16px;
  transition: transform 0.2s ease;
}

.attachment-button:hover .attachment-icon {
  transform: scale(1.1);
}

.attachment-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 14px;
  height: 14px;
  padding: 1px 3px;
  font-size: 10px;
  font-weight: bold;
  line-height: 12px;
  color: white;
  text-align: center;
  background-color: #f56c6c;
  border: 1px solid white;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
}

.no-attachment {
  font-size: 14px;
  color: #c0c4cc;
}

/* 附件类型色彩标识 */
.attachment-icon[style*="#67C23A"] {
  /* 绿色 - 图片文件 */
}

.attachment-icon[style*="#E6A23C"] {
  /* 橙色 - PDF文件 */
}

.attachment-icon[style*="#409EFF"] {
  /* 蓝色 - Excel文件 */
}

.attachment-icon[style*="#909399"] {
  /* 灰色 - 其他文件 */
}

/* 合同页面容器样式 */
</style>
