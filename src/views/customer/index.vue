<script setup lang="ts">
import { ref, reactive, onMounted, computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import {
  getCustomerList,
  addCustomer,
  deleteCustomer,
  batchDeleteCustomer,
  updateCustomer,
  checkCustomerRecords,
  type Customer
} from "@/api/customer";
import { getAllCompanies, type Company } from "@/api/business";
import { Plus, Delete, Edit, Refresh, Search } from "@element-plus/icons-vue";
import { formatMoney } from "@/utils/format";

defineOptions({
  name: "CustomerManagement"
});

const router = useRouter();

// 表格数据
const loading = ref(false);
const tableData = ref<Customer[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 计算总欠款
const totalDebt = computed(() => {
  return tableData.value.reduce((sum, customer) => sum + customer.debt, 0);
});

// 计算有欠款的客户数量
const debtCustomerCount = computed(() => {
  return tableData.value.filter(customer => customer.debt > 0).length;
});

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10
});

// 搜索关键词
const searchKeyword = ref("");

// 添加客户对话框
const dialogVisible = ref(false);
const dialogTitle = ref("添加客户");
const formRef = ref<FormInstance>();
const submitLoading = ref(false);

// 表单数据
const formData = reactive({
  name: "",
  debt: 0,
  companyId: undefined as number | undefined
});

// 表单验证规则
const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入客户名称", trigger: "blur" }]
});

// 快速修改欠款对话框
const editDebtDialogVisible = ref(false);
const editDebtFormRef = ref<FormInstance>();
const currentEditCustomer = ref<Customer | null>(null);
const editDebtAmount = ref<number>(0);

// 修改欠款验证规则
const editDebtRules = reactive<FormRules>({
  debt: [
    { required: true, message: "请输入欠款金额", trigger: "blur" },
    {
      type: "number",
      min: 0,
      message: "欠款金额不能小于0",
      trigger: "blur"
    }
  ]
});

// 公司列表
const companyList = ref<Company[]>([]);

// 加载公司列表
const loadCompanies = async () => {
  try {
    const res = await getAllCompanies(1); // 获取启用状态的公司
    if (res.data) {
      companyList.value = res.data;
    }
  } catch (error) {
    console.error("加载公司列表失败", error);
  }
};

// 加载客户列表
const loadCustomers = async () => {
  loading.value = true;
  try {
    const res = await getCustomerList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value.trim() || undefined
    });
    if (res.success) {
      tableData.value = res.data.list;
      total.value = res.data.total;
    }
  } catch (error) {
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
};

// 刷新（带防抖）
const handleRefresh = () => {
  // 清除之前的定时器
  if (loadCustomersTimer) {
    clearTimeout(loadCustomersTimer);
  }

  // 300ms防抖处理
  loadCustomersTimer = setTimeout(() => {
    loadCustomers();
  }, 300);
};

// 跳转到客户详情页
const handleGoToDetail = (id: number) => {
  // 记录当前时间戳，用于后续判断是否需要刷新列表
  sessionStorage.setItem("customerListLeaveTime", Date.now().toString());
  router.push(`/customer/detail/${id}`);
};

// 打开添加对话框
const handleAdd = () => {
  dialogTitle.value = "添加客户";
  resetForm();
  dialogVisible.value = true;
};

// 重置表单
const resetForm = () => {
  formData.name = "";
  formData.debt = 0;
  formRef.value?.clearValidate();
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async valid => {
    if (valid) {
      submitLoading.value = true;
      try {
        const res = await addCustomer(formData);
        if (res.success) {
          ElMessage.success(res.message);
          dialogVisible.value = false;
          loadCustomers();
        } else {
          ElMessage.error(res.message);
        }
      } catch (error) {
        ElMessage.error("操作失败");
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

// 删除单个客户
const handleDelete = async (row: Customer) => {
  try {
    await ElMessageBox.confirm(`确定要删除客户"${row.name}"吗？`, "删除确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });

    const res = await deleteCustomer(row.id);
    if (res.success) {
      ElMessage.success(res.message);
      loadCustomers();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败");
    }
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要删除的客户");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的${selectedIds.value.length}个客户吗？`,
      "批量删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    const res = await batchDeleteCustomer(selectedIds.value);
    if (res.success) {
      ElMessage.success(res.message);
      selectedIds.value = [];
      loadCustomers();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("批量删除失败");
    }
  }
};

// 表格选择变化
const handleSelectionChange = (selection: Customer[]) => {
  selectedIds.value = selection.map(item => item.id);
};

// 防抖处理
let loadCustomersTimer: NodeJS.Timeout | null = null;

// 页面可见性变化处理
const handleVisibilityChange = () => {
  if (document.visibilityState === "visible" && !loading.value) {
    // 检查离开时间，如果离开时间超过5秒，则认为可能进行了数据修改
    const leaveTime = sessionStorage.getItem("customerListLeaveTime");
    const currentTime = Date.now();

    if (leaveTime && currentTime - parseInt(leaveTime) > 5000) {
      // 离开超过5秒，刷新数据
      setTimeout(() => {
        loadCustomers();
        sessionStorage.removeItem("customerListLeaveTime");
      }, 300);
    } else if (!leaveTime) {
      // 没有离开时间记录，可能是从其他页面返回，也刷新
      setTimeout(() => {
        loadCustomers();
      }, 500);
    }
  }
};

// 路由变化监听
const handleRouteChange = () => {
  // 当从详情页返回列表页时自动刷新
  if (loading.value) return;

  // 检查是否从客户详情页返回
  const fromDetail =
    router.options.history.state?.back?.includes("/customer/detail/");
  if (fromDetail) {
    setTimeout(() => {
      loadCustomers();
    }, 300);
  }
};

// 搜索防抖处理
const handleSearch = () => {
  // 重置到第一页
  pagination.page = 1;

  // 清除之前的定时器
  if (loadCustomersTimer) {
    clearTimeout(loadCustomersTimer);
  }

  // 500ms防抖处理（搜索需要稍长的防抖时间）
  loadCustomersTimer = setTimeout(() => {
    loadCustomers();
  }, 500);
};

// 分页变化
const handlePageChange = (page: number) => {
  pagination.page = page;

  // 清除之前的定时器
  if (loadCustomersTimer) {
    clearTimeout(loadCustomersTimer);
  }

  // 300ms防抖处理
  loadCustomersTimer = setTimeout(() => {
    loadCustomers();
  }, 300);
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.page = 1;

  // 清除之前的定时器
  if (loadCustomersTimer) {
    clearTimeout(loadCustomersTimer);
  }

  // 300ms防抖处理
  loadCustomersTimer = setTimeout(() => {
    loadCustomers();
  }, 300);
};

// 双击欠款单元格 - 快速修改欠款
const handleDebtDblClick = (row: Customer) => {
  currentEditCustomer.value = row;
  editDebtAmount.value = row.debt;
  editDebtDialogVisible.value = true;
  editDebtFormRef.value?.clearValidate();
};

// 提交修改欠款
const handleEditDebtSubmit = async () => {
  if (!editDebtFormRef.value || !currentEditCustomer.value) return;

  await editDebtFormRef.value.validate(async valid => {
    if (valid) {
      try {
        const updatedCustomer = {
          ...currentEditCustomer.value!,
          debt: editDebtAmount.value
        };

        const res = await updateCustomer(updatedCustomer);
        if (res.success) {
          ElMessage.success("欠款修改成功");
          editDebtDialogVisible.value = false;
          loadCustomers();
        } else {
          ElMessage.error(res.message);
        }
      } catch (error) {
        ElMessage.error("修改失败");
      }
    }
  });
};

// 页面加载
onMounted(() => {
  loadCompanies();
  // 检查是否从详情页返回
  const leaveTime = sessionStorage.getItem("customerListLeaveTime");
  if (leaveTime) {
    const currentTime = Date.now();
    const timeDiff = currentTime - parseInt(leaveTime);

    // 如果离开时间超过30秒，强制刷新数据
    if (timeDiff > 30000) {
      loadCustomers();
      sessionStorage.removeItem("customerListLeaveTime");
    } else {
      // 离开时间较短，也要刷新以确保数据最新
      loadCustomers();
    }
  } else {
    // 正常加载
    loadCustomers();
  }

  // 添加页面可见性监听
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // 添加路由前进/后退监听
  window.addEventListener("popstate", handleRouteChange);

  // 监听浏览器前进/后退按钮
  router.afterEach((to, from) => {
    // 如果从详情页回到列表页，自动刷新
    if (from.path.includes("/customer/detail/") && to.path === "/customer") {
      setTimeout(() => {
        loadCustomers();
      }, 300);
    }
  });
});

// 页面卸载
onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("popstate", handleRouteChange);
});
</script>

<template>
  <div class="customer-container">
    <!-- 统计卡片 -->
    <el-card shadow="never" class="mb-4">
      <div class="statistics-container">
        <div class="stat-item">
          <div class="stat-label">客户总数</div>
          <div class="stat-value">{{ tableData.length }}</div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">有欠款客户</div>
          <div class="stat-value text-orange-500">{{ debtCustomerCount }}</div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">总计欠款</div>
          <div class="stat-value text-red-600 font-bold">
            ¥{{ formatMoney(totalDebt) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 操作栏和表格 -->
    <el-card shadow="never">
      <!-- 操作按钮和搜索 -->
      <div class="mb-4 flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            添加客户
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
        <div class="flex items-center space-x-3">
          <!-- 搜索框 -->
          <el-input
            v-model="searchKeyword"
            placeholder="搜索客户名称"
            :prefix-icon="Search"
            clearable
            style="width: 200px"
            @input="handleSearch"
            @keyup.enter="handleSearch"
          />
          <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column
          prop="companyName"
          label="所属公司"
          min-width="150"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.companyName || "-" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="name"
          label="客户名称"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              style="font-weight: 500"
              @click="handleGoToDetail(row.id)"
            >
              {{ row.name }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="客户欠款" width="150" align="right">
          <template #default="{ row }">
            <span
              :class="
                row.debt > 0 ? 'text-red-500 font-bold debt-cell' : 'debt-cell'
              "
              :title="'双击修改欠款'"
              @dblclick="handleDebtDblClick(row)"
            >
              ¥{{ formatMoney(row.debt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
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
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 添加客户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="客户名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入客户名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="所属公司" prop="companyId">
          <el-select
            v-model="formData.companyId"
            placeholder="请选择所属公司"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="item in companyList"
              :key="item.id"
              :label="item.company_name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="初始欠款">
          <el-input model-value="¥0.00" disabled style="font-weight: 500" />
          <div class="form-tip">新客户默认欠款为 0，可在列表中修改</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <!-- 快速修改欠款对话框 -->
    <el-dialog
      v-model="editDebtDialogVisible"
      title="修改客户欠款"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editDebtFormRef"
        :model="{ debt: editDebtAmount }"
        :rules="editDebtRules"
        label-width="100px"
      >
        <el-form-item label="客户名称">
          <el-input :value="currentEditCustomer?.name" disabled />
        </el-form-item>
        <el-form-item label="当前欠款">
          <el-input
            :value="'¥' + formatMoney(currentEditCustomer?.debt || 0)"
            disabled
            style="font-weight: bold; color: #f56c6c"
          />
        </el-form-item>
        <el-form-item label="新欠款金额" prop="debt">
          <el-input-number
            v-model="editDebtAmount"
            :min="0"
            :step="100"
            placeholder="请输入新的欠款金额"
            style="width: 100%"
          />
        </el-form-item>
        <el-alert
          title="提示：直接修改欠款金额，将覆盖原有欠款数据"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="editDebtDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditDebtSubmit">
          确定修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.customer-container {
  padding: 8px;
}

.statistics-container {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 20px 0;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  margin-bottom: 12px;
  font-size: 14px;
  color: #909399;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-divider {
  width: 1px;
  height: 50px;
  background-color: #dcdfe6;
}

.debt-cell {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;

  &:hover {
    background-color: #f0f9ff;
    transform: scale(1.05);
  }
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
