<template>
  <div class="user-container">
    <!-- 操作栏和表格 -->
    <el-card shadow="never">
      <!-- 操作按钮 -->
      <div class="mb-4 flex justify-between">
        <div class="flex items-center gap-4">
          <el-input
            v-model="searchUsername"
            placeholder="搜索用户名或姓名"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button @click="handleSearch">
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>

          <el-select
            v-model="searchRole"
            placeholder="选择角色"
            clearable
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option label="全部" value="all" />
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="common" />
          </el-select>
        </div>

        <div class="flex items-center gap-2">
          <Auth :value="['user:add']">
            <el-button type="primary" :icon="Plus" @click="handleAdd">
              添加用户
            </el-button>
          </Auth>

          <Auth :value="['user:delete']">
            <el-button
              type="danger"
              :icon="Delete"
              :disabled="selectedIds.length === 0 || hasSelectedAdmin"
              @click="handleBatchDelete"
            >
              批量删除
            </el-button>
          </Auth>
        </div>
      </div>

      <!-- 用户表格 -->
      <el-table
        v-loading="loading"
        :data="userList"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column
          prop="username"
          label="用户名"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          prop="nickname"
          label="姓名"
          min-width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.nickname || row.username }}
          </template>
        </el-table-column>
        <el-table-column
          prop="password"
          label="密码"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            {{ row.password || "••••••••" }}
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
              {{ row.role === "admin" ? "管理员" : "普通用户" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="is_active"
          label="状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'">
              {{ row.is_active ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="permissions"
          label="权限"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-tag
              v-for="permission in row.permissions"
              :key="permission"
              size="small"
              class="mr-1"
            >
              {{ permission }}
            </el-tag>
            <span v-if="row.permissions.length === 0" class="text-gray-400"
              >无权限</span
            >
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <Auth :value="['user:edit']">
              <el-button link type="primary" @click="handleEdit(row)">
                编辑
              </el-button>
            </Auth>
            <Auth :value="['user:status']">
              <el-button
                link
                :type="row.is_active ? 'warning' : 'success'"
                :disabled="row.role === 'admin'"
                @click="handleToggleStatus(row)"
              >
                {{ row.is_active ? "禁用" : "启用" }}
              </el-button>
            </Auth>
            <Auth :value="['user:delete']">
              <el-button
                link
                type="danger"
                :disabled="row.role === 'admin'"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </Auth>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加用户' : '编辑用户'"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="姓名" prop="nickname">
          <el-input v-model="formData.nickname" placeholder="请输入真实姓名" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
          <div v-if="dialogType === 'edit'" class="text-xs text-gray-500 mt-1">
            留空则不修改密码
          </div>
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="formData.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="common" />
          </el-select>
        </el-form-item>

        <el-form-item label="权限" prop="permissions">
          <el-checkbox-group v-model="formData.permissions">
            <el-checkbox label="permission:btn:add">添加权限</el-checkbox>
            <el-checkbox label="permission:btn:edit">编辑权限</el-checkbox>
            <el-checkbox label="permission:btn:view">查看权限</el-checkbox>
            <el-checkbox label="permission:btn:delete">删除权限</el-checkbox>
          </el-checkbox-group>
          <div class="text-xs text-gray-500 mt-1">
            管理员默认拥有全权限，普通用户需要单独配置
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end gap-2">
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
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Plus, Delete } from "@element-plus/icons-vue";
import { Auth } from "@/components/Auth";
import {
  getUserListApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
  toggleUserStatusApi,
  batchDeleteUsersApi,
  type UserListItem,
  type CreateUserData,
  type UpdateUserData
} from "@/api/user";

// 响应式数据
const loading = ref(false);
const submitLoading = ref(false);
const userList = ref<UserListItem[]>([]);
const selectedIds = ref<number[]>([]);

// 搜索条件
const searchUsername = ref("");
const searchRole = ref("all");

// 计算属性：检查是否选中了管理员
const hasSelectedAdmin = computed(() => {
  return selectedIds.value.some(id => {
    const user = userList.value.find(u => u.id === id);
    return user?.role === "admin";
  });
});

// 对话框
const dialogVisible = ref(false);
const dialogType = ref<"add" | "edit">("add");
const formRef = ref();

// 表单数据
const formData = reactive<CreateUserData & { id?: number }>({
  username: "",
  nickname: "",
  password: "",
  role: "common",
  permissions: []
});

// 表单验证规则
const formRules = computed(() => ({
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, max: 20, message: "用户名长度在 3 到 20 个字符", trigger: "blur" }
  ],
  password: [
    {
      required: dialogType.value === "add",
      message: dialogType.value === "add" ? "请输入密码" : "留空则不修改密码",
      trigger: "blur"
    },
    {
      min: 6,
      max: 20,
      message: "密码长度在 6 到 20 个字符",
      trigger: "blur",
      validator: (rule: any, value: string, callback: Function) => {
        if (dialogType.value === "edit" && !value) {
          callback(); // 编辑时密码为空是允许的
        } else if (value && (value.length < 6 || value.length > 20)) {
          callback(new Error("密码长度在 6 到 20 个字符"));
        } else {
          callback();
        }
      }
    }
  ],
  role: [{ required: true, message: "请选择角色", trigger: "change" }]
}));

// 获取用户列表
const fetchUserList = async () => {
  loading.value = true;
  try {
    const params = {
      username: searchUsername.value || undefined,
      role: searchRole.value === "all" ? undefined : searchRole.value
    };

    const result = await getUserListApi(params);
    let users = result.list || result; // 适配有无分页的响应格式

    // 按用户ID升序排序
    if (Array.isArray(users)) {
      users.sort((a, b) => a.id - b.id);
    }

    userList.value = users as any;
  } catch (error) {
    console.error("获取用户列表失败:", error);
    ElMessage.error("获取用户列表失败");
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  fetchUserList();
};

// 表格选择变化
const handleSelectionChange = (selection: UserListItem[]) => {
  selectedIds.value = selection.map(item => item.id);
};

// 添加用户
const handleAdd = () => {
  dialogType.value = "add";
  dialogVisible.value = true;
  resetForm();
};

// 编辑用户
const handleEdit = (row: UserListItem) => {
  dialogType.value = "edit";
  dialogVisible.value = true;

  Object.assign(formData, {
    id: row.id,
    username: row.username,
    nickname: row.nickname || "",
    password: "", // 编辑时密码置空
    role: row.role,
    permissions: [...row.permissions]
  });
};

// 删除用户
const handleDelete = async (row: UserListItem) => {
  // 防止删除管理员账户
  if (row.role === "admin") {
    ElMessage.warning("管理员账户不能被删除");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${row.username}" 吗？此操作不可撤销`,
      "确认删除",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    await deleteUserApi(row.id);
    ElMessage.success("删除成功");
    fetchUserList();
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除用户失败:", error);
      ElMessage.error("删除失败");
    }
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要删除的用户");
    return;
  }

  // 检查是否选中了管理员
  if (hasSelectedAdmin.value) {
    ElMessage.warning("不能删除管理员账户，请取消选择管理员后重试");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个用户吗？此操作不可撤销`,
      "确认批量删除",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    await batchDeleteUsersApi(selectedIds.value);
    ElMessage.success("批量删除成功");
    selectedIds.value = [];
    fetchUserList();
  } catch (error) {
    if (error !== "cancel") {
      console.error("批量删除失败:", error);
      ElMessage.error("批量删除失败");
    }
  }
};

// 切换用户状态
const handleToggleStatus = async (row: UserListItem) => {
  // 防止禁用管理员账户
  if (row.role === "admin") {
    ElMessage.warning("管理员账户不能被禁用");
    return;
  }

  try {
    await toggleUserStatusApi(row.id);
    ElMessage.success(`${row.is_active ? "禁用" : "启用"}成功`);
    fetchUserList();
  } catch (error) {
    console.error("切换用户状态失败:", error);
    ElMessage.error("操作失败");
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    const submitData = {
      username: formData.username,
      nickname: formData.nickname || formData.username,
      role: formData.role,
      permissions: formData.permissions
    };

    // 编辑时如果有密码则包含密码
    if (dialogType.value === "edit" && formData.password) {
      Object.assign(submitData, { password: formData.password });
    }

    // 添加时必须有密码
    if (dialogType.value === "add") {
      Object.assign(submitData, { password: formData.password });
    }

    if (dialogType.value === "add") {
      await createUserApi(submitData as CreateUserData);
      ElMessage.success("添加成功");
    } else {
      await updateUserApi(formData.id!, submitData as UpdateUserData);
      ElMessage.success("更新成功");
    }

    dialogVisible.value = false;
    fetchUserList();
  } catch (error) {
    console.error("提交失败:", error);
    // 显示具体的错误信息，如果是字符串则直接显示，否则显示通用错误
    const errorMessage =
      typeof error === "string" ? error : error?.message || "操作失败";
    ElMessage.error(errorMessage);
  } finally {
    submitLoading.value = false;
  }
};

// 对话框关闭
const handleDialogClose = () => {
  resetForm();
};

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    id: undefined,
    username: "",
    nickname: "",
    password: "",
    role: "common",
    permissions: []
  });

  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// 格式化日期时间
const formatDateTime = (dateString: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("zh-CN");
};

// 初始化
onMounted(() => {
  fetchUserList();
});
</script>

<style scoped lang="scss">
.user-container {
  padding: 8px;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-500 {
  color: #6b7280;
}

.text-xs {
  font-size: 0.75rem;
}

.mr-1 {
  margin-right: 0.25rem;
}

.mt-1 {
  margin-top: 0.25rem;
}
</style>
