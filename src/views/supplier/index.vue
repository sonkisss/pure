<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import type { FormInstance, FormRules } from "element-plus";
import {
  getSupplierList,
  addSupplier,
  deleteSupplier,
  batchDeleteSupplier,
  updateSupplier,
  type Supplier
} from "@/api/supplier";
import { Plus, Delete, Refresh, Box } from "@element-plus/icons-vue";
import { formatMoney } from "@/utils/format";

defineOptions({
  name: "SupplierList"
});

const router = useRouter();

// 表格数据
const loading = ref(false);
const tableData = ref<Supplier[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 计算总应付款（确保不为负数）
const totalPayable = computed(() => {
  return tableData.value.reduce(
    (sum, supplier) => sum + Math.max(0, supplier.totalPayable),
    0
  );
});

// 计算有应付款的供应商数量
const payableSupplierCount = computed(() => {
  return tableData.value.filter(
    supplier => Math.max(0, supplier.totalPayable) > 0
  ).length;
});

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10
});

// 添加供应商对话框
const dialogVisible = ref(false);
const dialogTitle = ref("添加供应商");
const formRef = ref<FormInstance>();

// 表单数据
const formData = reactive<{
  name: string;
  totalPayable: number | null;
}>({
  name: "",
  totalPayable: null
});

// 表单验证规则
const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入供应商名称", trigger: "blur" }],
  totalPayable: [
    {
      type: "number",
      min: 0,
      message: "应付款金额不能小于0",
      trigger: "blur"
    }
  ]
});

// 快速修改应付款对话框
const editPayableDialogVisible = ref(false);
const editPayableFormRef = ref<FormInstance>();
const currentEditSupplier = ref<Supplier | null>(null);
const editPayableAmount = ref<number>(0);

// 修改应付款验证规则
const editPayableRules = reactive<FormRules>({
  totalPayable: [
    { required: true, message: "请输入应付款金额", trigger: "blur" },
    {
      type: "number",
      min: 0,
      message: "应付款金额不能小于0",
      trigger: "blur"
    }
  ]
});

// 加载供应商列表
const loadSuppliers = async () => {
  loading.value = true;
  try {
    const res = await getSupplierList({
      page: pagination.page,
      pageSize: pagination.pageSize
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

// 刷新
const handleRefresh = () => {
  loadSuppliers();
};

// 打开添加对话框
const handleAdd = () => {
  dialogTitle.value = "添加供应商";
  resetForm();
  dialogVisible.value = true;
};

// 重置表单
const resetForm = () => {
  formData.name = "";
  formData.totalPayable = null;
  formRef.value?.clearValidate();
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async valid => {
    if (valid) {
      try {
        // 如果未输入金额，默认为 0
        const submitData = {
          name: formData.name,
          totalPayable: formData.totalPayable ?? 0
        };
        const res = await addSupplier(submitData);
        if (res.success) {
          ElMessage.success(res.message);
          dialogVisible.value = false;
          loadSuppliers();
        } else {
          ElMessage.error(res.message);
        }
      } catch (error) {
        ElMessage.error("操作失败");
      }
    }
  });
};

// 删除单个供应商
const handleDelete = (row: Supplier) => {
  ElMessageBox.confirm(`确定要删除供应商"${row.name}"吗？`, "删除确认", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(async () => {
    try {
      const res = await deleteSupplier(row.id);
      if (res.success) {
        ElMessage.success(res.message);
        loadSuppliers();
      } else {
        ElMessage.error(res.message);
      }
    } catch (error) {
      ElMessage.error("删除失败");
    }
  });
};

// 批量删除
const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要删除的供应商");
    return;
  }

  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedIds.value.length} 个供应商吗？`,
    "批量删除确认",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    }
  ).then(async () => {
    try {
      const res = await batchDeleteSupplier(selectedIds.value);
      if (res.success) {
        ElMessage.success(res.message);
        selectedIds.value = [];
        loadSuppliers();
      } else {
        ElMessage.error(res.message);
      }
    } catch (error) {
      ElMessage.error("批量删除失败");
    }
  });
};

// 查看详情
const handleViewDetail = (row: Supplier) => {
  router.push(`/supplier/detail/${row.id}`);
};

// 表格选择变化
const handleSelectionChange = (selection: Supplier[]) => {
  selectedIds.value = selection.map(item => item.id);
};

// 分页变化
const handlePageChange = (page: number) => {
  pagination.page = page;
  loadSuppliers();
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.page = 1;
  loadSuppliers();
};

// 双击应付款单元格 - 快速修改应付款
const handlePayableDblClick = (row: Supplier) => {
  currentEditSupplier.value = row;
  // 确保显示的值不为负数
  editPayableAmount.value = Math.max(0, row.totalPayable);
  editPayableDialogVisible.value = true;
  editPayableFormRef.value?.clearValidate();
};

// 提交修改应付款
const handleEditPayableSubmit = async () => {
  if (!editPayableFormRef.value || !currentEditSupplier.value) return;

  await editPayableFormRef.value.validate(async valid => {
    if (valid) {
      try {
        const updatedSupplier = {
          ...currentEditSupplier.value!,
          totalPayable: editPayableAmount.value
        };

        const res = await updateSupplier(updatedSupplier);
        if (res.success) {
          ElMessage.success("应付款修改成功");
          editPayableDialogVisible.value = false;
          loadSuppliers();
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
  loadSuppliers();
});
</script>

<template>
  <div class="supplier-container">
    <!-- 统计卡片 -->
    <el-card shadow="never" class="mb-4">
      <div class="statistics-container">
        <div class="stat-item">
          <div class="stat-label">供应商总数</div>
          <div class="stat-value">{{ tableData.length }}</div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">有应付款供应商</div>
          <div class="stat-value text-orange-500">
            {{ payableSupplierCount }}
          </div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">总应付款</div>
          <div class="stat-value text-red-600 font-bold">
            ¥{{ formatMoney(totalPayable) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 操作栏和表格 -->
    <el-card shadow="never">
      <!-- 操作按钮 -->
      <div class="mb-4 flex justify-between">
        <div>
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            添加供应商
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
          label="供应商名称"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              style="font-weight: 500"
              @click="handleViewDetail(row)"
            >
              {{ row.name }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="总应付款" width="150" align="right">
          <template #default="{ row }">
            <span
              :class="
                Math.max(0, row.totalPayable) > 0
                  ? 'text-red-500 font-bold payable-cell'
                  : 'payable-cell'
              "
              :title="'双击修改应付款'"
              @dblclick="handlePayableDblClick(row)"
            >
              ¥{{ formatMoney(Math.max(0, row.totalPayable)) }}
            </span>
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
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 添加供应商对话框 -->
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
        label-width="120px"
      >
        <el-form-item label="供应商名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入供应商名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="初始应付款" prop="totalPayable">
          <el-input-number
            v-model="formData.totalPayable"
            :min="0"
            :precision="2"
            :step="100"
            placeholder="请输入应付款金额"
            controls-position="right"
            style="width: 100%"
            class="text-left-input"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 快速修改应付款对话框 -->
    <el-dialog
      v-model="editPayableDialogVisible"
      title="修改供应商应付款"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editPayableFormRef"
        :model="{ totalPayable: editPayableAmount }"
        :rules="editPayableRules"
        label-width="120px"
      >
        <el-form-item label="供应商名称">
          <el-input :value="currentEditSupplier?.name" disabled />
        </el-form-item>
        <el-form-item label="当前应付款">
          <el-input
            :value="
              '¥' +
              formatMoney(Math.max(0, currentEditSupplier?.totalPayable || 0))
            "
            disabled
            style="font-weight: bold; color: #f56c6c"
          />
        </el-form-item>
        <el-form-item label="新应付款金额" prop="totalPayable">
          <el-input-number
            v-model="editPayableAmount"
            :min="0"
            :precision="2"
            :step="100"
            placeholder="请输入新的应付款金额"
            style="width: 100%"
          />
        </el-form-item>
        <el-alert
          title="提示：直接修改应付款金额，将覆盖原有应付款数据"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="editPayableDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditPayableSubmit">
          确定修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.supplier-container {
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

.text-left-input {
  :deep(.el-input__inner) {
    text-align: left !important;
  }
}

.payable-cell {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;

  &:hover {
    background-color: #f0f9ff;
    transform: scale(1.05);
  }
}
</style>
