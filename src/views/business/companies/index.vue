<template>
  <div class="companies-container">
    <!-- 公司列表 -->
    <el-row :gutter="24">
      <!-- 骨架屏加载状态 -->
      <template v-if="initialLoading">
        <el-col
          v-for="n in 6"
          :key="`skeleton-${n}`"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          :xl="4"
          class="mb-6"
        >
          <CompanyCardSkeleton />
        </el-col>
      </template>

      <!-- 公司卡片 -->
      <el-col
        v-for="company in companyList"
        :key="company.id"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
        :xl="4"
        class="mb-6"
      >
        <el-card
          class="company-card cursor-pointer transition-all hover:shadow-xl"
          :body-style="{ padding: '24px' }"
          @click="handleCompanyClick(company)"
        >
          <div class="card-header">
            <div class="company-icon">
              <el-icon :size="36" color="#409EFF">
                <OfficeBuilding />
              </el-icon>
            </div>
          </div>

          <div class="card-content">
            <h3 class="company-name truncate">{{ company.company_name }}</h3>
            <div class="company-info">
              <div class="info-item">
                <el-icon class="info-icon"><Money /></el-icon>
                <span class="info-text">
                  {{ currentYear }}年销售总额:
                  <span
                    v-if="(company as any).statisticsLoading"
                    class="loading-text"
                    >加载中...</span
                  >
                  <span v-else
                    >¥{{
                      formatMoney((company as any).statistics?.total_sales || 0)
                    }}</span
                  >
                </span>
              </div>
              <div class="info-item">
                <el-icon class="info-icon"><TrendCharts /></el-icon>
                <span class="info-text">
                  {{ currentYear }}年利润:
                  <span
                    v-if="(company as any).statisticsLoading"
                    class="loading-text"
                    >加载中...</span
                  >
                  <span v-else
                    >¥{{
                      formatMoney(
                        (company as any).statistics?.total_profit || 0
                      )
                    }}</span
                  >
                </span>
              </div>
              <div class="info-item">
                <el-icon class="info-icon"><Document /></el-icon>
                <span class="info-text">
                  {{ currentYear }}年合同数:
                  <span
                    v-if="(company as any).statisticsLoading"
                    class="loading-text"
                    >加载中...</span
                  >
                  <span v-else>{{
                    (company as any).statistics?.contract_count || 0
                  }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="create-time">
              <el-icon class="time-icon"><Clock /></el-icon>
              <span>{{ formatDate(company.created_at) }}</span>
            </div>
            <Auth :value="['company:edit', 'company:delete']">
              <el-dropdown
                trigger="click"
                @command="command => handleCommand(command, company)"
              >
                <el-button
                  type="primary"
                  size="small"
                  plain
                  class="action-btn"
                  @click.stop
                >
                  操作 <el-icon class="ml-1"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <Auth :value="['company:edit']">
                      <el-dropdown-item command="edit">
                        <el-icon class="mr-2"><Edit /></el-icon>
                        编辑公司
                      </el-dropdown-item>
                    </Auth>
                    <Auth :value="['company:delete']">
                      <el-dropdown-item command="delete" divided>
                        <el-icon class="mr-2 text-red-500"><Delete /></el-icon>
                        <span class="text-red-500">删除公司</span>
                      </el-dropdown-item>
                    </Auth>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </Auth>
          </div>
        </el-card>
      </el-col>

      <!-- 添加公司卡片 -->
      <Auth :value="['company:add']">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4" class="mb-6">
          <el-card
            class="company-card cursor-pointer transition-all hover:shadow-xl add-company-card"
            :body-style="{ padding: '24px' }"
            @click="handleAdd"
          >
            <div class="card-content add-card-content">
              <div class="add-icon">
                <el-icon :size="48" color="#909399">
                  <Plus />
                </el-icon>
              </div>
              <h3 class="add-text">添加公司</h3>
            </div>
          </el-card>
        </el-col>
      </Auth>
    </el-row>

    <!-- 添加/编辑公司弹窗 -->
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
        <el-form-item label="公司名称" prop="company_name">
          <el-input
            v-model="formData.company_name"
            placeholder="请输入公司名称"
          />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";

defineOptions({
  name: "CompanyList"
});
import { useRouter } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules
} from "element-plus";
import {
  Plus,
  OfficeBuilding,
  ArrowDown,
  Edit,
  Delete,
  Check,
  Close,
  Document,
  User,
  Phone,
  Clock,
  Money,
  TrendCharts
} from "@element-plus/icons-vue";
import { Auth } from "@/components/Auth";
import { hasAuth } from "@/router/utils";
import {
  getAllCompanies,
  addCompany,
  updateCompany,
  deleteCompany,
  getContractStatistics,
  type Company,
  type ContractStatistics
} from "@/api/business";
import CompanyCardSkeleton from "@/components/CompanyCardSkeleton.vue";
import { unifiedStatisticsCache } from "@/utils/unifiedStatisticsCache";

const router = useRouter();

// 响应式数据
const loading = ref(false);
const initialLoading = ref(true);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = computed(() => (isEdit.value ? "编辑公司" : "添加公司"));
const isEdit = ref(false);
const currentCompany = ref<Company | null>(null);
const currentYear = ref(new Date().getFullYear());

const companyList = ref<any[]>([]);

const formData = reactive({
  id: 0,
  company_name: ""
});

const formRules: FormRules = {
  company_name: [
    { required: true, message: "请输入公司名称", trigger: "blur" },
    {
      min: 2,
      max: 100,
      message: "公司名称长度在 2 到 100 个字符",
      trigger: "blur"
    }
  ]
};

const formRef = ref<FormInstance>();

// 工具方法
const formatDate = (dateString: string) => {
  if (!dateString) return "--";
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

const formatMoney = (value: number) => {
  if (!value) return "0.00";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// 方法
const loadCompanyList = async () => {
  try {
    loading.value = true;
    initialLoading.value = true;

    // 第一步：只获取公司基本信息，不包含统计数据
    const response = await getAllCompanies(); // 获取所有公司，包括启用和禁用的
    const companies = response.data;

    // 获取当前年度
    currentYear.value = new Date().getFullYear();

    // 第二步：立即显示公司卡片，统计数据标记为加载中
    const companiesWithLoadingState = companies.map(company => ({
      ...company,
      statisticsLoading: true,
      statistics: {
        total_sales: 0,
        total_profit: 0,
        contract_count: 0,
        year: currentYear.value
      }
    }));

    companyList.value = companiesWithLoadingState;
    initialLoading.value = false;

    // 第三步：异步加载每个公司的统计数据
    companies.forEach(async (company, index) => {
      try {
        // 先检查缓存
        const cachedStats = unifiedStatisticsCache.get(
          company.id,
          currentYear.value
        );

        if (cachedStats) {
          // 使用缓存数据
          companyList.value[index] = {
            ...companyList.value[index],
            statistics: cachedStats,
            statisticsLoading: false
          };
        } else {
          // 从API获取数据
          const response = await getContractStatistics(
            currentYear.value,
            company.id
          );
          const stats = (response as any).data || response; // 兼容两种返回格式

          // 更新缓存
          unifiedStatisticsCache.set(company.id, currentYear.value, stats);

          // 更新UI
          companyList.value[index] = {
            ...companyList.value[index],
            statistics: stats,
            statisticsLoading: false
          };
        }
      } catch (error) {
        console.error(`获取公司 ${company.id} 统计数据失败:`, error);

        // 显示默认数据
        const defaultStats = {
          total_sales: 0,
          total_profit: 0,
          contract_count: 0,
          year: currentYear.value
        };

        // 缓存默认数据，避免重复请求失败的数据
        unifiedStatisticsCache.set(company.id, currentYear.value, defaultStats);

        companyList.value[index] = {
          ...companyList.value[index],
          statistics: defaultStats,
          statisticsLoading: false
        };
      }
    });
  } catch (error) {
    console.error("加载公司列表失败:", error);
    ElMessage.error("加载公司列表失败");
  } finally {
    loading.value = false;
  }
};

// 加载单个公司的统计数据（用于刷新或数据更新时）
const loadCompanyStatistics = async (
  companyIndex: number,
  companyId: number
) => {
  try {
    // 清除旧缓存
    unifiedStatisticsCache.invalidate(companyId);

    // 标记为加载中
    companyList.value[companyIndex].statisticsLoading = true;

    // 获取新数据
    const response = await getContractStatistics(currentYear.value, companyId);
    const stats = (response as any).data || response;

    // 更新缓存和UI
    unifiedStatisticsCache.set(companyId, currentYear.value, stats);

    companyList.value[companyIndex] = {
      ...companyList.value[companyIndex],
      statistics: stats,
      statisticsLoading: false
    };
  } catch (error) {
    console.error(`刷新公司 ${companyId} 统计数据失败:`, error);

    // 恢复原来的状态
    companyList.value[companyIndex].statisticsLoading = false;
  }
};

const handleCompanyClick = (company: Company) => {
  // 跳转到合同列表页面，传递公司ID参数
  router.push({
    name: "ContractList",
    query: { company_id: company.id, company_name: company.company_name }
  });
};

const handleAdd = () => {
  isEdit.value = false;
  dialogVisible.value = true;
  resetForm();
};

const handleCommand = async (command: string, company: Company) => {
  if (command === "edit") {
    handleEdit(company);
  } else if (command === "delete") {
    handleDelete(company);
  }
};

const handleEdit = (company: Company) => {
  isEdit.value = true;
  currentCompany.value = company;
  dialogVisible.value = true;

  Object.assign(formData, {
    id: company.id,
    company_name: company.company_name
  });
};

const handleDelete = async (company: Company) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除公司"${company.company_name}"吗？此操作不可恢复。`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    await deleteCompany(company.id);
    ElMessage.success("删除成功");
    loadCompanyList();
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除公司失败:", error);
      ElMessage.error("删除公司失败");
    }
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    const submitData = {
      company_name: formData.company_name,
      company_code: "",
      contact_person: "",
      contact_phone: "",
      address: "",
      status: 1 as 1 | 0,
      created_by: 1 // 临时值，实际应该从用户状态获取
    };

    if (isEdit.value) {
      const updateData = {
        ...submitData,
        id: formData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const result = await updateCompany(updateData as any);
      if ((result as any).data?.success || (result as any).success) {
        ElMessage.success(
          (result as any).data?.message || (result as any).message || "更新成功"
        );
      } else {
        throw new Error(
          (result as any).data?.message || (result as any).message || "更新失败"
        );
      }
    } else {
      const addData = {
        ...submitData,
        id: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const result = await addCompany(addData as any);
      if ((result as any).data?.success || (result as any).success) {
        ElMessage.success(
          (result as any).data?.message || (result as any).message || "添加成功"
        );
      } else {
        throw new Error(
          (result as any).data?.message || (result as any).message || "添加失败"
        );
      }
    }

    dialogVisible.value = false;
    loadCompanyList();
  } catch (error: any) {
    console.error("提交失败:", error);
    if (error.message) {
      ElMessage.error(error.message);
    }
  } finally {
    submitLoading.value = false;
  }
};

const handleDialogClose = () => {
  resetForm();
};

const resetForm = () => {
  Object.assign(formData, {
    id: 0,
    company_name: ""
  });

  formRef.value?.clearValidate();
};

// 生命周期
onMounted(() => {
  loadCompanyList();
});
</script>

<style scoped>
/* 响应式调整 */
@media (width <= 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .stats-container {
    justify-content: center;
  }

  .stat-card {
    flex: 1;
    min-width: 0;
    min-width: calc(50% - 0.75rem);
  }
}

@media (width <= 640px) {
  .stats-container {
    flex-direction: column;
  }

  .stat-card {
    min-width: auto;
  }

  .card-footer {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
}

/* 确保添加卡片在移动端也有合适的高度 */
@media (width <= 768px) {
  .add-card-content {
    min-height: 160px;
    padding: 1.5rem 0;
  }

  .add-icon .el-icon {
    font-size: 42px;
  }

  .add-text {
    font-size: 1rem;
  }
}

.companies-container {
  padding: 8px;
}

/* 页面头部样式 */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.5rem 0;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.page-title h2 {
  margin: 0;
  color: #1f2937;
}

.page-title p {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.page-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* 统计卡片样式 */
.stats-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  min-width: 180px;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
  transition: all 0.3s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 6px rgb(0 0 0 / 10%);
  transform: translateY(-2px);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-right: 1rem;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}

.stat-icon.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-icon.inactive {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  line-height: 1;
  color: #1f2937;
}

.stat-label {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #6b7280;
}

/* 公司卡片样式 */
.company-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.company-card:hover {
  border-color: #409eff;
  box-shadow: 0 20px 25px rgb(0 0 0 / 10%);
  transform: translateY(-8px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.company-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border-radius: 16px;
}

.card-content {
  flex: 1;
  margin-bottom: 1.5rem;
}

.company-name {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2937;
}

.company-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.info-icon {
  flex-shrink: 0;
  margin-right: 0.5rem;
  font-size: 0.875rem;
  color: #9ca3af;
}

.info-text {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.create-time {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #9ca3af;
}

.time-icon {
  margin-right: 0.25rem;
  font-size: 0.75rem;
}

.action-btn {
  padding: 6px 12px;
  font-weight: 500;
  border-radius: 6px;
}

/* 加载状态样式 */
.loading-text {
  font-size: 0.8rem;
  color: #909399;
}

/* 通用样式 */
.cursor-pointer {
  cursor: pointer;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Element Plus 标签样式优化 */
.el-tag {
  font-weight: 500;
  border: none;
}

.el-button--primary.is-plain {
  color: #409eff;
  background: rgb(64 158 255 / 10%);
  border-color: rgb(64 158 255 / 20%);
}

.el-button--primary.is-plain:hover {
  background: rgb(64 158 255 / 20%);
  border-color: rgb(64 158 255 / 30%);
}

/* 添加公司卡片特殊样式 */
.add-company-card {
  background: #fafafa;
  border: 2px dashed #d1d5db;
}

.add-company-card:hover {
  background: #f0f9ff;
  border-color: #409eff;
  box-shadow: 0 12px 20px rgb(0 0 0 / 8%);
  transform: translateY(-4px);
}

.add-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  padding: 2rem 0;
}

.add-icon {
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.add-company-card:hover .add-icon {
  transform: scale(1.1);
}

.add-icon .el-icon {
  color: #6b7280;
  transition: color 0.3s ease;
}

.add-company-card:hover .add-icon .el-icon {
  color: #409eff;
}

.add-text {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #6b7280;
  transition: color 0.3s ease;
}

.add-company-card:hover .add-text {
  color: #409eff;
}

/* 页面容器样式 */
</style>
