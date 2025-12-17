<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import {
  getExpenseList,
  addExpense,
  updateExpense,
  deleteExpense,
  batchDeleteExpense,
  getExpenseCategories,
  addExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpenseStatistics,
  getCompanies,
  getPayerList,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatistics,
  type Company
} from "@/api/expense";
import {
  Plus,
  Delete,
  Edit,
  Refresh,
  Management,
  Tools,
  Download
} from "@element-plus/icons-vue";
import { formatMoney } from "@/utils/format";
import { supabase } from "@/services/supabase";
import { ExcelExporter } from "@/utils/excelExporter";

// 简化公司名称显示
const formatCompanyName = (fullName: string): string => {
  if (!fullName) return "";

  // 移除地域标识（如"内蒙古"、"上海"等）
  let shortName = fullName.replace(
    /^(内蒙古|新疆|西藏|广西|宁夏|北京|上海|天津|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾|省|市|自治区|特别行政区)/g,
    ""
  );

  // 移除公司类型后缀（如"有限公司"、"股份有限公司"等），但保留"总部"
  if (shortName !== "总部") {
    shortName = shortName.replace(
      /(有限公司|股份有限公司|集团有限公司|有限责任公司|集团|公司|厂|店|社|院|所|中心|工作室|企业|机构|组织|单位)$/g,
      ""
    );
  }

  // 移除常见的特殊字符和多余空格
  shortName = shortName.replace(/[()-—_]/g, "").trim();

  // 如果处理后的名称太短（少于2个字符），返回原始名称的前几个字符
  if (shortName.length < 2 && fullName.length > 2) {
    shortName = fullName.substring(0, Math.min(4, fullName.length));
  }

  return shortName || fullName;
};

defineOptions({
  name: "ExpenseManagement"
});

const router = useRouter();

// 表格数据
const loading = ref(false);
const tableData = ref<Expense[]>([]);
const total = ref(0);
const tableRef = ref();

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20
});

// 搜索表单
const searchForm = reactive({
  year: undefined as number | undefined,
  companyId: undefined as number | undefined,
  category: "",
  payerId: undefined as number | undefined
});

// 费用类别
const categories = ref<ExpenseCategory[]>([]);

// 公司数据
const companies = ref<Company[]>([]);

// 支付人列表数据
const payers = ref<Array<{ id: number; nickname: string; username: string }>>(
  []
);

// 统计数据
const statistics = ref<ExpenseStatistics | null>(null);
const statisticsLoading = ref(false);

// 当前年份
const currentYear = new Date().getFullYear();

// 年度选择器
const selectedYear = ref(currentYear);
const yearOptions = computed(() => {
  const years = [];
  const current = currentYear;
  for (let i = current - 5; i <= current + 2; i++) {
    years.push({
      value: i,
      label: `${i}年`
    });
  }
  return years;
});

// 搜索表单年度选项
const searchYearOptions = computed(() => {
  const years = [];
  const current = currentYear;
  for (let i = current - 10; i <= current + 5; i++) {
    years.push({
      value: i,
      label: `${i}年`
    });
  }
  return years;
});

// 根据筛选条件过滤公司统计数据
const filteredCompanyStatistics = computed(() => {
  const allCompanyStats = statistics.value?.companyStatistics || [];

  // 如果没有筛选公司或选择"全部"，显示所有公司
  if (!searchForm.companyId) {
    return allCompanyStats;
  }

  // 如果筛选总部，不显示任何子公司统计卡片
  if (searchForm.companyId === -1) {
    return [];
  }

  // 只显示筛选的特定公司
  return allCompanyStats.filter(
    company => company.companyId === searchForm.companyId
  );
});

// 对话框状态
const dialogVisible = ref(false);
const categoryDialogVisible = ref(false);
const categoryFormVisible = ref(false);
const dialogTitle = ref("添加费用");
const formRef = ref<FormInstance>();
const categoryFormRef = ref<FormInstance>();
const categorySelectRef = ref();
const newCategoryFormRef = ref();

// 新建类别弹窗相关
const showCategoryDialog = ref(false);
const newCategoryName = ref("");

// 悬停状态
const hoveredCard = ref<number | null>(null);

// 表单数据
const formData = reactive({
  year: currentYear,
  companyId: undefined as number | undefined,
  companyName: "",
  title: "",
  amount: undefined as number | undefined,
  category: "",
  expenseDate: new Date().toISOString().split("T")[0], // 设置为当前日期
  description: "",
  attachments: [],
  payerId: undefined as number | undefined,
  payerName: ""
});

// 根据费用日期自动计算所属年度
const updateExpenseYear = (dateStr: string) => {
  if (!dateStr) return;
  try {
    const date = new Date(dateStr);
    // 规则：签订日期在本年的正月初一与除夕夜结束之间的日期属于当前年度
    // 例如今年是2025年，那么年度就归属于2025年
    // 这实际上就是公历年度
    formData.year = date.getFullYear();
  } catch (error) {
    console.error("计算所属年度失败:", error);
  }
};

// 监听费用日期变化，自动更新所属年度
watch(
  () => formData.expenseDate,
  newDate => {
    if (newDate) {
      updateExpenseYear(newDate);
    }
  }
);

// 金额输入框的文本值
const amountInput = ref<string>("");

// 类别表单数据
const categoryFormData = reactive({
  id: undefined,
  name: ""
});

// 公司选择变化处理
const handleCompanyChange = (companyId: number | undefined) => {
  const typeOfCompanyId = typeof companyId;
  console.log("🏢 公司选择变化:", { companyId, type: typeOfCompanyId });

  if (companyId === -1) {
    // 总部 - 使用NULL表示总部，避免外键约束问题
    formData.companyId = -1; // 保持-1值，让el-select能正确显示
    formData.companyName = "总部";
    console.log("✅ 选择总部，设置companyId为-1");
  } else {
    formData.companyId = companyId;
    const company = companies.value.find(c => c.id === companyId);
    formData.companyName = company?.company_name || "";
    console.log("✅ 选择公司:", {
      companyId,
      companyName: formData.companyName
    });
  }

  console.log("📊 当前formData:", {
    companyId: formData.companyId,
    companyName: formData.companyName
  });
};

// 金额输入处理
const handleAmountInput = (value: string) => {
  amountInput.value = value;
  // 只允许输入数字和小数点
  const cleanValue = value.replace(/[^\d.]/g, "");
  amountInput.value = cleanValue;
  // 将输入的值转换为数字并更新到formData
  if (cleanValue) {
    const numValue = parseFloat(cleanValue);
    if (!isNaN(numValue)) {
      formData.amount = numValue;
    }
  } else {
    formData.amount = undefined;
  }
};

// 存储当前输入的新类别名称
const pendingNewCategory = ref("");
const filteredCategories = ref([]);
const pendingCategorySubmit = ref(false); // 防止重复提交类别表单
const isProcessingCategory = ref(false); // 全局类别处理状态，防止多个事件同时处理

// 过滤费用类别
const filterCategories = (query: string) => {
  if (!query) {
    filteredCategories.value = [...categories.value];
    return;
  }

  filteredCategories.value = categories.value.filter(category =>
    category.name.toLowerCase().includes(query.toLowerCase())
  );
};

// 费用类别变化处理
const handleCategoryChange = async (value: string) => {
  console.log("=== 🔥 handleCategoryChange 开始 ===");
  console.log("value:", value);
  console.log("pendingNewCategory:", pendingNewCategory.value);
  console.log("isProcessingCategory:", isProcessingCategory.value);

  if (!value || !value.trim()) {
    console.log("❌ value为空，退出");
    return;
  }

  const trimmedValue = value.trim();
  console.log("trimmedValue:", trimmedValue);

  // 全局处理状态检查，防止多个事件同时处理类别
  if (isProcessingCategory.value) {
    console.log("⚠️ 类别正在处理中，跳过重复操作");
    return;
  }

  // 检查是否为新类别（不在现有类别列表中）
  const existingCategory = categories.value.find(c => c.name === trimmedValue);
  console.log("existingCategory:", existingCategory);
  console.log(
    "categories.value:",
    categories.value.map(c => c.name)
  );

  if (!existingCategory) {
    // 防止重复创建：检查是否正在创建中
    if (pendingNewCategory.value === trimmedValue) {
      console.log("⚠️ 类别正在创建中，跳过重复操作");
      return;
    }

    // 设置全局处理状态和标记正在创建
    isProcessingCategory.value = true;
    pendingNewCategory.value = trimmedValue;
    console.log("🚀 开始创建新类别:", trimmedValue);

    try {
      console.log("📞 调用 addExpenseCategory API...");
      // 创建新类别
      const res = await addExpenseCategory({ name: trimmedValue });
      console.log("📤 API响应完整对象:", JSON.stringify(res, null, 2));

      if (res.success) {
        console.log("✅ API调用成功");
        console.log("res.message:", res.message);
        console.log("res.data:", res.data);

        if (res.message === "费用类别已存在") {
          console.log("ℹ️ 显示已存在消息");
          ElMessage.info(`费用类别"${trimmedValue}"已存在，已自动选择`);
        } else {
          console.log("🎉 显示创建成功消息");
          ElMessage.success(`费用类别"${trimmedValue}"创建成功`);
        }

        console.log("🔄 开始重新加载类别列表...");
        // 重新加载类别列表
        await fetchCategories();
        console.log("✅ 类别列表重新加载完成");

        console.log("⏳ 等待下一个tick...");
        // 等待下一个tick确保视图更新
        await nextTick();

        console.log("🔄 强制更新select组件...");
        // 强制更新select组件 - 使用Vue的强制更新方法而不是组件的forceUpdate
        if (categorySelectRef.value) {
          // 使用组件实例的$forceUpdate方法或者直接跳过，因为数据变化会自动触发更新
          try {
            if (typeof categorySelectRef.value.$forceUpdate === "function") {
              categorySelectRef.value.$forceUpdate();
            }
            console.log("✅ Select组件强制更新完成");
          } catch (error) {
            console.log("⚠️ Select组件强制更新失败，但数据已更新:", error);
          }
        }

        console.log("📝 更新formData.category...");
        // 更新formData中的category值为新创建的类别
        formData.category = trimmedValue;
        console.log("✅ formData.category已更新:", formData.category);

        console.log("✅ 类别处理完成:", trimmedValue, res.message);
      } else {
        console.log("❌ API调用失败");
        console.log("res.message:", res.message);
        ElMessage.error(`创建费用类别失败: ${res.message || "未知错误"}`);
        // 如果创建失败，重置类别选择
        formData.category = "";
        console.log("❌ formData.category已重置");
      }
    } catch (error) {
      console.error("💥 创建费用类别异常:", error);
      console.error("error.stack:", error.stack);
      ElMessage.error("创建费用类别失败，请重试");
      formData.category = "";
      console.log("❌ formData.category已重置");
    } finally {
      // 清除待创建的类别名称和全局处理状态
      const oldValue = pendingNewCategory.value;
      pendingNewCategory.value = "";
      isProcessingCategory.value = false;
      console.log(
        "🧹 清除pending状态:",
        oldValue,
        "isProcessingCategory:",
        isProcessingCategory.value
      );
      console.log("=== handleCategoryChange 结束 ===");
    }
  } else {
    console.log("ℹ️ 类别已存在，无需创建");
    console.log("=== handleCategoryChange 结束 ===");
  }
};

// 处理选择器失焦事件
const handleCategoryBlur = async () => {
  console.log(
    "🔍 handleCategoryBlur 被调用, pendingNewCategory:",
    pendingNewCategory.value,
    "formData.category:",
    formData.category
  );

  // 只有在没有其他操作正在进行时才执行
  if (
    !isProcessingCategory.value &&
    !pendingNewCategory.value &&
    !pendingCategorySubmit.value &&
    formData.category
  ) {
    console.log("🔄 失焦时重新加载类别列表");
    // 延迟执行，确保其他事件已经处理完毕
    setTimeout(async () => {
      // 再次检查状态，确保没有其他操作正在进行
      if (
        !isProcessingCategory.value &&
        !pendingNewCategory.value &&
        !pendingCategorySubmit.value
      ) {
        await fetchCategories();
        await nextTick();
      }
    }, 100);
  } else {
    console.log("⚠️ 跳过失焦刷新，因为有其他操作正在进行");
  }
};

// 处理下拉框显示状态变化
const handleSelectVisibleChange = async (visible: boolean) => {
  console.log("👁️ handleSelectVisibleChange 被调用, visible:", visible);

  if (visible) {
    console.log("📂 下拉框打开，重新加载类别列表");
    // 只有在没有其他操作正在进行时才刷新
    if (
      !isProcessingCategory.value &&
      !pendingNewCategory.value &&
      !pendingCategorySubmit.value
    ) {
      // 当下拉框打开时，确保类别列表是最新的
      await fetchCategories();
      await nextTick();
    } else {
      console.log("⚠️ 跳过下拉框打开刷新，因为有其他操作正在进行");
    }
  }
  // 移除关闭时的刷新，避免与change事件冲突
};

// 表单验证规则
const rules = reactive<FormRules>({
  year: [{ required: true, message: "请选择年度", trigger: "change" }],
  companyId: [{ required: true, message: "请选择所属公司", trigger: "change" }],
  title: [{ required: true, message: "请输入费用名称", trigger: "blur" }],
  amount: [
    { required: true, message: "请输入费用金额", trigger: "blur" },
    { type: "number", min: 0, message: "费用金额不能为负数", trigger: "blur" }
  ],
  category: [{ required: true, message: "请选择费用类别", trigger: "change" }],
  payerId: [{ required: true, message: "请选择支付人", trigger: "change" }],
  expenseDate: [
    { required: true, message: "请选择费用日期", trigger: "change" }
  ]
});

const categoryRules = reactive<FormRules>({
  name: [{ required: true, message: "请输入类别名称", trigger: "blur" }]
});

// 初始化数据
onMounted(async () => {
  await fetchCompanies();
  await fetchCategories();
  await fetchPayers();
  await fetchStatistics();
  await fetchData();
});

// 监听年度选择变化
watch(selectedYear, () => {
  fetchStatistics();
});

// 监听搜索表单变化
watch(
  () => [searchForm.year, searchForm.category, searchForm.companyId],
  () => {
    // 同步更新统计卡片的年度选择器
    if (searchForm.year !== undefined) {
      selectedYear.value = searchForm.year;
    }
    fetchData();
    fetchStatistics();
  },
  { deep: true }
);

// 获取费用列表
const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getExpenseList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...searchForm
    });
    if (res.success) {
      tableData.value = res.data.list;
      total.value = res.data.total;
    }
  } catch (error) {
    console.error("获取费用列表失败:", error);
  } finally {
    loading.value = false;
  }
};

// 获取费用类别
const fetchCategories = async () => {
  console.log("=== 🔄 fetchCategories 开始 ===");

  try {
    console.log("📞 调用 getExpenseCategories API...");
    const res = await getExpenseCategories();
    console.log("📤 getExpenseCategories 响应:", JSON.stringify(res, null, 2));

    if (res.success && Array.isArray(res.data)) {
      console.log("📊 原始API数据长度:", res.data.length);
      console.log("📊 原始API数据:", res.data);

      // 确保所有类别都有有效的name和id字段
      const validCategories = res.data.filter(category => {
        const isValid = category && category.name && category.name.trim();
        if (!isValid) {
          console.warn("⚠️ 发现无效类别数据:", category);
        }
        return isValid;
      });

      console.log("📊 过滤后有效类别数量:", validCategories.length);
      console.log("📊 过滤后有效类别数据:", validCategories);

      // 备份旧数据用于对比
      const oldCategories = [...categories.value];
      console.log(
        "📊 旧categories.value:",
        oldCategories.map(c => c.name)
      );

      categories.value = validCategories;
      filteredCategories.value = [...validCategories]; // 初始化过滤后的类别数组
      console.log(
        "✅ categories.value 已更新:",
        categories.value.map(c => c.name)
      );
      console.log(
        "✅ filteredCategories.value 已更新:",
        filteredCategories.value.map(c => c.name)
      );
      console.log("📊 类别数据加载成功");
    } else {
      console.error("❌ API返回失败:", res.message);
      console.error("❌ res.success:", res.success);
      console.error("❌ Array.isArray(res.data):", Array.isArray(res.data));
      categories.value = [];
      filteredCategories.value = [];
    }
  } catch (error) {
    console.error("💥 获取费用类别异常:", error);
    console.error("💥 error.stack:", error.stack);
    categories.value = [];
    filteredCategories.value = [];
  } finally {
    console.log("=== fetchCategories 结束 ===");
  }
};

// 获取支付人列表（排除系统管理员）
const fetchPayers = async () => {
  try {
    console.log("=== 🔄 fetchPayers 开始 ===");
    const res = await getPayerList();
    console.log("📤 getPayerList 响应:", res);

    if (res.success && res.data) {
      payers.value = res.data;
      console.log("✅ 支付人列表加载成功:", res.data.length, "个支付人");
    } else {
      console.error("❌ 获取支付人列表失败:", res);
      payers.value = [];
    }
  } catch (error) {
    console.error("💥 获取支付人列表异常:", error);
    payers.value = [];
  }
};

// 获取公司列表
const fetchCompanies = async () => {
  try {
    const res = await getCompanies();
    if (res.success) {
      companies.value = res.data;
    }
  } catch (error) {
    console.error("获取公司列表失败:", error);
  }
};

// 获取统计数据
const fetchStatistics = async () => {
  statisticsLoading.value = true;
  try {
    // 统计卡片使用搜索表单中的年度筛选条件，优先使用 searchForm.year，其次使用 selectedYear
    const year =
      searchForm.year !== undefined ? searchForm.year : selectedYear.value;
    const res = await getExpenseStatistics({
      ...searchForm,
      year: year
    });
    if (res.success) {
      statistics.value = res.data;
    }
  } catch (error) {
    console.error("获取统计数据失败:", error);
  } finally {
    statisticsLoading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  pagination.page = 1;
  fetchData();
  fetchStatistics();
};

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    year: undefined,
    companyId: undefined,
    category: "",
    payerId: undefined
  });
  pagination.page = 1;
  fetchData();
  fetchStatistics();
};

// 分页变化
const handleCurrentChange = (page: number) => {
  pagination.page = page;
  fetchData();
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.page = 1;
  fetchData();
};

// 打开添加对话框
const handleAdd = () => {
  dialogTitle.value = "添加费用";
  resetForm();
  dialogVisible.value = true;
};

// 打开编辑对话框
const handleEdit = (row: Expense) => {
  dialogTitle.value = "编辑费用";

  // 处理总部数据回显：如果companyId为undefined或null，显示为总部（-1）
  const companyData = { ...row };
  if (!companyData.companyId) {
    companyData.companyId = -1; // 总部
    companyData.companyName = "总部";
  }

  Object.assign(formData, {
    ...companyData,
    attachments: row.attachments || [],
    payerId: row.payerId,
    payerName: row.payerName || ""
  });

  // 设置金额输入框的值
  amountInput.value = row.amount ? row.amount.toString() : "";

  console.log("📝 编辑模式回显数据:", {
    originalCompanyId: row.companyId,
    processedCompanyId: companyData.companyId,
    companyName: companyData.companyName,
    payerId: row.payerId,
    payerName: row.payerName
  });

  dialogVisible.value = true;
};

// 打开类别管理对话框
const handleManageCategories = async () => {
  console.log("handleManageCategories 被调用");
  try {
    await fetchCategories();
    console.log("fetchCategories 完成，当前类别数量:", categories.value.length);
    categoryDialogVisible.value = true;
  } catch (error) {
    console.error("handleManageCategories 错误:", error);
  }
};

// 添加类别
const handleAddCategory = () => {
  categoryFormData.id = undefined;
  categoryFormData.name = "";
  nextTick(() => {
    categoryFormRef.value?.clearValidate();
  });
  categoryFormVisible.value = true;
};

// 编辑类别
const handleEditCategory = (category: ExpenseCategory) => {
  categoryFormData.id = category.id;
  categoryFormData.name = category.name;
  nextTick(() => {
    categoryFormRef.value?.clearValidate();
  });
  categoryFormVisible.value = true;
};

// 删除类别
const handleDeleteCategory = async (category: ExpenseCategory) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除费用类别"${category.name}"吗？`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    const res = await deleteExpenseCategory(category.id);
    if (res.success) {
      ElMessage.success("类别删除成功");
      await fetchCategories();
      await fetchData();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除类别失败:", error);
    }
  }
};

// 提交费用表单
const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async valid => {
    if (!valid) return;

    // 设置加载状态
    loading.value = true;

    try {
      // 处理支付人信息：根据payerId查找payerName
      const submitData = { ...formData };
      const selectedPayer = payers.value.find(p => p.id === submitData.payerId);
      if (selectedPayer) {
        submitData.payerName = selectedPayer.nickname;
      }

      const isEdit = !!formData.id;
      const res = isEdit
        ? await updateExpense(submitData as Expense)
        : await addExpense(submitData);

      if (res.success) {
        ElMessage.success(isEdit ? "费用更新成功" : "费用添加成功");
        dialogVisible.value = false;
        resetForm();
        await fetchData();
        await fetchStatistics();
      } else {
        ElMessage.error(res.message);
      }
    } catch (error) {
      console.error("提交费用表单失败:", error);
      ElMessage.error("操作失败，请重试");
    } finally {
      // 无论成功与否，都重置加载状态
      loading.value = false;
    }
  });
};

// 提交类别表单
const handleCategorySubmit = async () => {
  console.log(
    "🔥 handleCategorySubmit 被调用, pendingCategorySubmit:",
    pendingCategorySubmit.value,
    "isProcessingCategory:",
    isProcessingCategory.value
  );

  // 防止重复提交和其他操作冲突
  if (pendingCategorySubmit.value || isProcessingCategory.value) {
    console.log("⚠️ 类别表单正在提交中或有其他操作进行，跳过重复操作");
    return;
  }

  if (!categoryFormRef.value) return;

  await categoryFormRef.value.validate(async valid => {
    if (!valid) {
      console.log("❌ 表单验证失败");
      return;
    }

    // 标记正在提交和全局处理状态
    pendingCategorySubmit.value = true;
    isProcessingCategory.value = true;
    console.log("🚀 开始提交类别表单");

    try {
      const isEdit = !!categoryFormData.id;
      console.log(
        "📝 isEdit:",
        isEdit,
        "categoryFormData.name:",
        categoryFormData.name
      );

      if (isEdit) {
        console.log("✏️ 编辑类别模式");
        // 编辑时只需要传入需要的字段
        const updateData = {
          id: categoryFormData.id,
          name: categoryFormData.name
        };
        const res = await updateExpenseCategory(updateData as ExpenseCategory);
        console.log("📤 更新类别响应:", res);

        if (res.success) {
          ElMessage.success("类别更新成功");
          await fetchCategories();
          await fetchData();
          categoryFormVisible.value = false;
        } else {
          console.error("❌ 更新类别失败:", res.message);
          ElMessage.error(res.message);
        }
      } else {
        console.log("➕ 添加类别模式");
        // 添加时只需要传入名称
        const res = await addExpenseCategory({ name: categoryFormData.name });
        console.log("📤 添加类别响应:", res);

        if (res.success) {
          if (res.message === "费用类别已存在") {
            console.log("ℹ️ 类别已存在，显示信息消息");
            ElMessage.info(`类别"${categoryFormData.name}"已存在`);
          } else {
            console.log("🎉 显示创建成功消息");
            ElMessage.success("类别添加成功");
          }

          await fetchCategories();
          await fetchData();
          categoryFormVisible.value = false;
        } else {
          console.error("❌ 添加类别失败:", res.message);
          ElMessage.error(res.message);
        }
      }
    } catch (error) {
      console.error("💥 handleCategorySubmit 异常:", error);
      ElMessage.error("操作失败，请重试");
    } finally {
      // 清除提交状态和全局处理状态
      pendingCategorySubmit.value = false;
      isProcessingCategory.value = false;
      console.log("🧹 清除pendingCategorySubmit和isProcessingCategory状态");
    }
  });
};

// 删除费用
const handleDelete = async (row: Expense) => {
  try {
    await ElMessageBox.confirm(`确定要删除费用"${row.title}"吗？`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });

    const res = await deleteExpense(row.id);
    if (res.success) {
      ElMessage.success("费用删除成功");
      await fetchData();
      await fetchStatistics();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除费用失败:", error);
    }
  }
};

// 导出所有费用明细到Excel
const handleExportAllExpenses = async () => {
  try {
    ElMessage.info("正在准备导出数据，请稍候...");

    // 获取所有费用数据（不分页）
    const allSearchParams = {
      page: 1,
      pageSize: 10000, // 设置一个足够大的数量来获取所有数据
      year: searchForm.year,
      companyId: searchForm.companyId,
      category: searchForm.category
    };

    const response = await getExpenseList(allSearchParams);
    if (!response.success || !response.data?.list) {
      throw new Error("获取费用数据失败");
    }

    const allExpenses = response.data.list;

    if (allExpenses.length === 0) {
      ElMessage.warning("没有数据可以导出");
      return;
    }

    // 导出Excel
    await ExcelExporter.exportExpensesToExcel(
      allExpenses,
      `费用明细_${searchForm.year || "全部"}_${new Date().toLocaleDateString().replace(/\//g, "-")}.xlsx`
    );

    ElMessage.success(`成功导出 ${allExpenses.length} 条费用明细`);
  } catch (error) {
    console.error("导出失败:", error);
    ElMessage.error(error instanceof Error ? error.message : "导出失败");
  }
};

// 重置表单
const resetForm = () => {
  formRef.value?.clearValidate();
  Object.assign(formData, {
    id: undefined,
    year: currentYear,
    companyId: undefined,
    companyName: "",
    title: "",
    amount: undefined,
    category: "",
    expenseDate: new Date().toISOString().split("T")[0], // 设置为当前日期
    description: "",
    attachments: [],
    payerId: undefined,
    payerName: ""
  });

  // 重置金额输入框
  amountInput.value = "";
};

// 关闭对话框
const handleDialogClosed = () => {
  resetForm();
};

// 标签选择费用类别
const selectCategory = (categoryName: string) => {
  formData.category = categoryName;
};

// 打开新建类别弹窗
const openCategoryDialog = () => {
  newCategoryName.value = "";
  showCategoryDialog.value = true;
};

// 确认创建新类别
const confirmCreateCategory = async () => {
  if (!newCategoryName.value.trim()) {
    ElMessage.warning("请输入类别名称");
    return;
  }

  try {
    const res = await addExpenseCategory({
      name: newCategoryName.value.trim(),
      description: ""
    });

    if (res.success) {
      ElMessage.success("费用类别创建成功");
      await fetchCategories(); // 重新获取类别列表
      formData.category = newCategoryName.value.trim(); // 自动选择新创建的类别
      showCategoryDialog.value = false;
      newCategoryName.value = "";
    } else {
      ElMessage.error(res.message || "创建费用类别失败");
    }
  } catch (error) {
    console.error("创建费用类别失败:", error);
    ElMessage.error("创建费用类别失败");
  }
};

// 取消创建新类别
const cancelCreateCategory = () => {
  showCategoryDialog.value = false;
  newCategoryName.value = "";
};

// 统计卡片年度选择变化处理
const handleStatisticsYearChange = (year: number) => {
  // 当统计卡片的年度变化时，同步更新搜索表单的年度
  searchForm.year = year;
  fetchData();
  fetchStatistics();
};

// 刷新数据
const handleRefresh = async () => {
  await fetchData();
  await fetchCategories();
  await fetchStatistics();
  ElMessage.success("刷新成功");
};
</script>

<template>
  <div class="expense-management">
    <!-- 统计卡片 -->
    <div class="statistics-cards">
      <!-- 总费用统计卡片（根据当前筛选条件） -->
      <div class="stat-card">
        <div class="stat-content stat-content-left">
          <div class="stat-title">总费用</div>
          <div class="stat-value">
            {{ formatMoney(statistics?.totalExpenses || 0) }}
          </div>
        </div>
        <div class="year-selector">
          <el-select
            v-model="selectedYear"
            placeholder="选择年度"
            size="small"
            class="year-select"
            style="width: 90px"
            @change="handleStatisticsYearChange"
          >
            <el-option
              v-for="year in yearOptions"
              :key="year.value"
              :label="year.label"
              :value="year.value"
            />
          </el-select>
        </div>
      </div>

      <!-- 根据筛选条件显示公司统计卡片 -->
      <div
        v-for="company in filteredCompanyStatistics"
        :key="company.companyId"
        class="stat-card company"
      >
        <div class="stat-content stat-content-left">
          <div class="stat-title">{{ company.companyName }}</div>
          <div class="stat-value">{{ formatMoney(company.annualTotal) }}</div>
        </div>
      </div>

      <!-- 总部统计卡片 - 仅在未筛选特定公司或筛选总部时显示 -->
      <div
        v-if="!searchForm.companyId || searchForm.companyId === -1"
        class="stat-card"
      >
        <div class="stat-content stat-content-left">
          <div class="stat-title">总部</div>
          <div class="stat-value">
            {{ formatMoney(statistics?.headquartersTotal || 0) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 费用管理容器 -->
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="toolbar">
          <el-form :model="searchForm" inline class="toolbar-form">
            <el-form-item>
              <el-button
                type="primary"
                :icon="Plus"
                size="small"
                :loading="loading"
                @click="handleAdd"
              >
                添加费用
              </el-button>
              <el-button
                type="success"
                :icon="Tools"
                size="small"
                @click="handleManageCategories"
              >
                管理类别
              </el-button>

              <!-- 导出Excel按钮 -->
              <el-button
                type="success"
                :icon="Download"
                size="small"
                :loading="loading"
                @click="handleExportAllExpenses"
              >
                导出Excel
              </el-button>
            </el-form-item>

            <el-form-item label="所属年度">
              <el-select
                v-model="searchForm.year"
                placeholder="请选择年度"
                clearable
                size="small"
                style="width: 100px"
                @change="handleSearch"
              >
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="year in searchYearOptions"
                  :key="year.value"
                  :label="year.label"
                  :value="year.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="所属公司">
              <el-select
                v-model="searchForm.companyId"
                placeholder="请选择公司"
                clearable
                size="small"
                style="width: 130px"
                @change="handleSearch"
              >
                <el-option label="全部" :value="undefined" />
                <el-option label="总部" :value="-1" />
                <el-option
                  v-for="company in companies"
                  :key="company.id"
                  :label="company.company_name"
                  :value="company.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="费用类别">
              <el-select
                v-model="searchForm.category"
                placeholder="请选择"
                clearable
                size="small"
                style="width: 120px"
                @change="handleSearch"
              >
                <el-option label="全部" value="" />
                <el-option
                  v-for="category in categories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.name"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="支付人">
              <el-select
                v-model="searchForm.payerId"
                placeholder="请选择"
                clearable
                size="small"
                style="width: 120px"
                @change="handleSearch"
              >
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="payer in payers"
                  :key="payer.id"
                  :label="payer.nickname || payer.username"
                  :value="payer.id"
                />
              </el-select>
            </el-form-item>
          </el-form>

          <el-button :icon="Refresh" size="small" @click="handleRefresh"
            >刷新</el-button
          >
        </div>
      </template>

      <!-- 费用列表 -->
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        border
        stripe
        :default-sort="{ prop: 'createTime', order: 'descending' }"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />

        <el-table-column
          prop="companyName"
          label="所属公司"
          width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatCompanyName(row.companyName) }}
          </template>
        </el-table-column>

        <el-table-column
          prop="title"
          label="费用名称"
          min-width="150"
          show-overflow-tooltip
        />

        <el-table-column
          prop="category"
          label="费用类别"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="primary" size="small" effect="light">
              {{ row.category || "未分类" }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="amount"
          label="费用金额"
          width="120"
          align="right"
        >
          <template #default="{ row }">
            <span
              class="amount"
              :class="{ 'synced-expense': row.contractId }"
              :style="
                row.contractId
                  ? 'color: #409eff; font-weight: bold;'
                  : 'color: #f56c6c; font-weight: bold;'
              "
            >
              {{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column
          prop="expenseDate"
          label="日期"
          width="120"
          align="center"
        />

        <el-table-column prop="year" label="所属年度" width="90" align="center">
          <template #default="{ row }"> {{ row.year }}年 </template>
        </el-table-column>

        <el-table-column
          prop="payerName"
          label="支付人"
          width="120"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.payerName || "-" }}
          </template>
        </el-table-column>

        <el-table-column
          prop="description"
          label="备注"
          min-width="200"
          show-overflow-tooltip
        />

        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons-inline">
              <el-button
                link
                type="primary"
                size="small"
                :icon="Edit"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                :icon="Delete"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 费用表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="90px"
      >
        <el-form-item label="所属年度" prop="year">
          <el-select
            v-model="formData.year"
            placeholder="根据费用日期自动生成"
            style="width: 100%"
            disabled
          >
            <el-option
              v-for="year in yearOptions"
              :key="year.value"
              :label="year.label"
              :value="year.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="所属公司" prop="companyId">
          <el-select
            v-model="formData.companyId"
            placeholder="请选择公司"
            style="width: 100%"
            @change="handleCompanyChange"
          >
            <el-option label="总部" :value="-1" />
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.company_name"
              :value="company.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="费用名称" prop="title">
          <el-input v-model="formData.title" placeholder="请输入费用名称" />
        </el-form-item>

        <el-form-item label="费用金额" prop="amount">
          <el-input
            v-model="amountInput"
            placeholder="请输入费用金额"
            style="width: 100%"
            @input="handleAmountInput"
          />
        </el-form-item>

        <el-form-item label="支付人" prop="payerId">
          <el-select
            v-model="formData.payerId"
            placeholder="请选择支付人"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="payer in payers"
              :key="payer.id"
              :label="payer.nickname"
              :value="payer.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="费用类别" prop="category">
          <el-tag
            v-for="category in categories"
            :key="category.id"
            :type="formData.category === category.name ? 'primary' : ''"
            :effect="formData.category === category.name ? 'dark' : 'plain'"
            size="small"
            style="
              margin-right: 8px;
              margin-bottom: 6px;
              vertical-align: middle;
              cursor: pointer;
            "
            @click="selectCategory(category.name)"
          >
            {{ category.name }}
          </el-tag>
          <el-tag
            type="success"
            effect="plain"
            size="small"
            style="
              margin-right: 8px;
              margin-bottom: 6px;
              vertical-align: middle;
              cursor: pointer;
            "
            @click="showCategoryDialog = true"
          >
            + 新建类别
          </el-tag>
        </el-form-item>

        <el-form-item label="日期" prop="expenseDate">
          <el-date-picker
            v-model="formData.expenseDate"
            type="date"
            placeholder="请选择费用日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span style="display: flex; gap: 8px; justify-content: flex-end">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="loading" @click="handleSubmit"
            >确定</el-button
          >
        </span>
      </template>
    </el-dialog>

    <!-- 新建费用类别对话框 -->
    <el-dialog
      v-model="showCategoryDialog"
      title="新建费用类别"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="newCategoryFormRef"
        :model="{ name: newCategoryName }"
        label-width="80px"
        style="max-width: 400px; margin: 0 auto"
      >
        <el-form-item
          label="类别名称"
          prop="name"
          :rules="[
            { required: true, message: '请输入类别名称', trigger: 'blur' },
            {
              min: 1,
              max: 20,
              message: '长度在 1 到 20 个字符',
              trigger: 'blur'
            }
          ]"
        >
          <el-input
            v-model="newCategoryName"
            placeholder="请输入费用类别名称"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span style="display: flex; gap: 8px; justify-content: flex-end">
          <el-button @click="cancelCreateCategory">取消</el-button>
          <el-button type="primary" @click="confirmCreateCategory"
            >确定</el-button
          >
        </span>
      </template>
    </el-dialog>

    <!-- 类别管理对话框 -->
    <el-dialog
      v-model="categoryDialogVisible"
      title="费用类别管理"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="category-management">
        <!-- 操作栏 -->
        <div class="category-toolbar">
          <el-button type="primary" :icon="Plus" @click="handleAddCategory">
            添加新类别
          </el-button>
          <div class="category-stats">
            <span class="stats-text">共 {{ categories.length }} 个类别</span>
          </div>
        </div>

        <!-- 类别列表 -->
        <div class="category-grid">
          <div
            v-for="(category, index) in categories"
            :key="category.id"
            class="category-card"
            @dblclick="handleEditCategory(category)"
          >
            <div class="category-content">
              <div class="category-number">{{ index + 1 }}</div>
              <div class="category-name">{{ category.name }}</div>
            </div>
            <el-button
              class="delete-button"
              type="danger"
              size="small"
              :icon="Delete"
              circle
              @click.stop="handleDeleteCategory(category)"
            />
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="categories.length === 0" class="empty-state">
          <el-empty description="暂无费用类别" :image-size="120">
            <el-button type="primary" :icon="Plus" @click="handleAddCategory">
              添加新类别
            </el-button>
          </el-empty>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑类别抽屉 -->
    <el-drawer
      v-model="categoryFormVisible"
      :title="categoryFormData.id ? '编辑类别' : '添加类别'"
      size="400px"
      direction="rtl"
    >
      <el-form
        ref="categoryFormRef"
        :model="categoryFormData"
        :rules="categoryRules"
        label-width="80px"
      >
        <el-form-item label="类别名称" prop="name">
          <el-input
            v-model="categoryFormData.name"
            placeholder="请输入类别名称"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="categoryFormVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCategorySubmit">
            {{ categoryFormData.id ? "更新" : "创建" }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.expense-management {
  min-height: calc(100vh - 40px);
  padding: 8px;
}

.statistics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  align-items: stretch;
  width: 100%;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  cursor: pointer;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  .stat-subtitle {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;

    .stat-content-left & {
      justify-content: flex-start;
    }

    &.stat-subtitle-left {
      justify-content: flex-start;
    }
  }

  &:hover {
    border-color: #409eff;
    box-shadow: 0 20px 25px rgb(0 0 0 / 10%);
    transform: translateY(-8px);

    .stat-title,
    .stat-subtitle,
    .stat-value {
      color: #409eff;
    }
  }

  .stat-content {
    text-align: center;

    &.stat-content-left {
      text-align: left;
    }
  }

  .stat-title {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  .stat-value {
    font-size: 22px;
    font-weight: 600;
    color: #333;
  }
}

.year-selector {
  flex-shrink: 0;
}

.year-select {
  width: 90px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-form {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.toolbar-form .el-form-item {
  display: flex;
  align-items: center;
  margin-right: 8px;
  margin-bottom: 0;
}

.toolbar-form .el-form-item:last-child {
  margin-right: 0;
}

.toolbar-form .el-form-item:first-child .el-button {
  margin-right: 4px;
}

.toolbar-form .el-form-item:first-child .el-button:last-child {
  margin-right: 0;
}

.amount {
  font-weight: 600;
  color: #f56c6c;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

/* 类别管理界面 */
.category-management {
  .category-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    margin-bottom: 20px;
    border-bottom: 1px solid #e5e7eb;

    .category-stats {
      .stats-text {
        font-size: 14px;
        color: #6b7280;
      }
    }
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    padding: 8px 0;
  }

  .category-card {
    position: relative;
    height: 80px;
    overflow: hidden;
    cursor: pointer;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.2s ease;

    .delete-button {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 10;
      width: 24px;
      height: 24px;
      padding: 0;
      font-size: 12px;
      color: #ef4444;
      background: #fff;
      border: 1px solid #ef4444;
      box-shadow: 0 2px 4px rgb(239 68 68 / 20%);
      opacity: 0;
      transition: all 0.2s ease;
    }

    &:hover {
      border-color: #3b82f6;
      box-shadow: 0 2px 8px rgb(59 130 246 / 15%);
      transform: translateY(-1px);
    }

    &:hover .delete-button {
      opacity: 1;
    }

    &:hover .delete-button:hover {
      color: #fff;
      background: #ef4444;
      border-color: #dc2626;
      box-shadow: 0 4px 8px rgb(239 68 68 / 30%);
      transform: scale(1.1);
    }

    .category-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 12px;
      text-align: center;

      .category-number {
        margin-bottom: 4px;
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
      }

      .category-name {
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 2;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.2;
        color: #1e293b;
        word-break: break-all;
        -webkit-box-orient: vertical;
      }
    }
  }

  .empty-state {
    padding: 40px 20px;
    text-align: center;
  }
}

/* 抽屉样式优化 */
.drawer-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.color-picker-container {
  display: flex;
  gap: 12px;
  align-items: center;

  .color-preview {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    font-size: 12px;
    color: #6b7280;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }
}

.category-form {
  h4 {
    margin-bottom: 16px;
  }
}

.action-buttons-inline {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;

  .el-button + .el-button {
    margin-left: 0;
  }
}
</style>
