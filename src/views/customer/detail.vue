<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules, UploadFile } from "element-plus";
import {
  getCustomerDetail,
  getPaymentRecordList,
  addPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
  getCreditRecordList,
  addCreditRecord,
  updateCreditRecord,
  deleteCreditRecord,
  updateCustomer,
  type Customer,
  type PaymentRecord,
  type PaymentType,
  type CreditRecord
} from "@/api/customer";
import { getAllCompanies, type Company } from "@/api/business";
import { uploadFileToSupabase, getPublicFileUrl } from "@/services/storage";
import {
  ArrowLeft,
  Plus,
  Delete,
  Refresh,
  Edit,
  Document,
  View,
  Money
} from "@element-plus/icons-vue";
import dayjs from "dayjs";

defineOptions({
  name: "CustomerDetail"
});

const route = useRoute();
const router = useRouter();

const customerId = ref<number>(Number(route.params.id));
const loading = ref(false);
const customer = ref<Customer | null>(null);
const paymentRecords = ref<PaymentRecord[]>([]);
const totalDebt = ref(0);
const originalPaymentAmount = ref(0);

// 挂账记录相关
const creditLoading = ref(false);
const creditSubmitting = ref(false);
const creditRecords = ref<CreditRecord[]>([]);

// 综合交易记录类型
type TransactionRecord = {
  id: number;
  type: "payment" | "credit"; // 交易类型：付款或挂账
  amount: number; // 金额
  date: string; // 日期（付款时间或挂账日期）
  typeLabel: string; // 类型显示标签
  paymentType?: PaymentType; // 付款类型（仅付款记录有）
  invoiceUrl?: string; // 发票URL（仅挂账记录有）
  remark: string; // 备注
  createTime: string; // 创建时间
  originalData: PaymentRecord | CreditRecord; // 原始数据，用于编辑
};

const transactionRecords = ref<TransactionRecord[]>([]);

// 新增统计数据
const initialDebt = ref(0); // 初始欠款（第一笔挂账金额）
const totalPayments = ref(0); // 累计付款
const totalCredits = ref(0); // 累计挂账
const companyList = ref<Company[]>([]); // 公司列表
const editCustomerDialogVisible = ref(false); // 编辑客户对话框
const editCustomerFormRef = ref<FormInstance>();
const editCustomerLoading = ref(false);

const editCustomerFormData = ref({
  name: "",
  companyId: undefined as number | undefined
});

const editCustomerRules = {
  name: [{ required: true, message: "请输入客户名称", trigger: "blur" }]
};

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

// 打开编辑客户对话框
const handleEditCustomer = () => {
  if (!customer.value) return;
  editCustomerFormData.value = {
    name: customer.value.name,
    companyId: customer.value.companyId
  };
  editCustomerDialogVisible.value = true;
};

// 提交客户信息修改
const handleUpdateCustomerSubmit = async () => {
  if (!editCustomerFormRef.value || !customer.value) return;

  await editCustomerFormRef.value.validate(async valid => {
    if (valid) {
      editCustomerLoading.value = true;
      try {
        const updatedCustomer = {
          ...customer.value!,
          name: editCustomerFormData.value.name,
          companyId: editCustomerFormData.value.companyId
        };

        const res = await updateCustomer(updatedCustomer);
        if (res.success) {
          ElMessage.success("客户信息更新成功");
          editCustomerDialogVisible.value = false;
          loadCustomerDetail(); // 刷新详情
        } else {
          ElMessage.error(res.message);
        }
      } catch (error) {
        ElMessage.error("更新失败");
      } finally {
        editCustomerLoading.value = false;
      }
    }
  });
};

// 计算统计数据
const calculateStatistics = () => {
  // 计算累计付款
  const paymentsSum = paymentRecords.value.reduce(
    (sum, record) => sum + record.amount,
    0
  );
  totalPayments.value = paymentsSum;

  // 计算累计挂账
  const creditsSum = creditRecords.value.reduce(
    (sum, record) => sum + record.amount,
    0
  );
  totalCredits.value = creditsSum;

  // 计算初始欠款（最早的挂账记录）
  if (creditRecords.value.length > 0) {
    const sortedCredits = [...creditRecords.value].sort(
      (a, b) =>
        new Date(a.creditDate).getTime() - new Date(b.creditDate).getTime()
    );
    initialDebt.value = sortedCredits[0].amount;
  } else {
    initialDebt.value = 0;
  }
};

// 合并付款记录和挂账记录为综合交易记录
const mergeTransactionRecords = () => {
  const transactions: TransactionRecord[] = [];

  // 添加付款记录
  paymentRecords.value.forEach(record => {
    transactions.push({
      id: record.id,
      type: "payment",
      amount: record.amount,
      date: record.paymentTime,
      typeLabel: "付款",
      paymentType: record.paymentType,
      invoiceUrl: undefined,
      remark: record.remark,
      createTime: record.createTime,
      originalData: record
    });
  });

  // 添加挂账记录
  creditRecords.value.forEach(record => {
    transactions.push({
      id: record.id,
      type: "credit",
      amount: record.amount,
      date: record.creditDate,
      typeLabel: "挂账",
      paymentType: undefined,
      invoiceUrl: record.invoiceUrl,
      remark: record.remark,
      createTime: record.createTime,
      originalData: record
    });
  });

  // 按时间倒序排列（最新的在前）
  transactions.sort((a, b) => {
    const dateA = new Date(b.date).getTime();
    const dateB = new Date(a.date).getTime();
    return dateA - dateB;
  });

  transactionRecords.value = transactions;

  // 计算统计数据
  calculateStatistics();
};

// 添加/编辑付款对话框
const dialogVisible = ref(false);
const dialogTitle = ref("新增付款");
const isEdit = ref(false);
const currentEditId = ref<number | null>(null);
const formRef = ref<FormInstance>();
const submitting = ref(false);

// 付款类型选项
const paymentTypeOptions: { label: string; value: PaymentType }[] = [
  { label: "现金", value: "现金" },
  { label: "承兑", value: "承兑" }
];

// 表单数据
const formData = ref({
  amount: 0,
  paymentTime: dayjs().format("YYYY-MM-DD"),
  paymentType: "现金" as PaymentType,
  remark: ""
});

// 表单验证规则
const rules: FormRules = {
  amount: [
    { required: true, message: "请输入付款金额", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (value === null || value === undefined || value === "") {
          callback(new Error("请输入付款金额"));
        } else if (isNaN(Number(value)) || Number(value) < 0) {
          callback(new Error("付款金额不能为负数"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  paymentTime: [
    { required: true, message: "请选择付款时间", trigger: "change" }
  ],
  paymentType: [
    { required: true, message: "请选择付款类型", trigger: "change" }
  ]
};

// 加载客户详情
const loadCustomerDetail = async () => {
  try {
    const res = await getCustomerDetail(customerId.value);
    if (res.success) {
      customer.value = res.data;
      // 更新欠款金额显示
      if (customer.value) {
        totalDebt.value = customer.value.debt;
      }
      return { success: true, data: res.data };
    }
    throw new Error("加载客户信息失败");
  } catch (error) {
    console.error("加载客户信息失败:", error);
    throw error;
  }
};

const updateLocalDebt = (change: number) => {
  const current = Number(totalDebt.value) || 0;
  const next = current + change;
  totalDebt.value = Number(Math.max(0, next).toFixed(2));
};

// 加载付款记录
const loadPaymentRecords = async () => {
  try {
    const res = await getPaymentRecordList(customerId.value);
    if (res.success) {
      paymentRecords.value = res.data.list;
      // totalDebt从customer对象获取，不从这里更新
      mergeTransactionRecords(); // 合并交易记录
      return { success: true, data: res.data };
    }
    throw new Error("加载付款记录失败");
  } catch (error) {
    console.error("加载付款记录失败:", error);
    throw error;
  }
};

// 打开添加付款对话框
const handleAddPayment = () => {
  dialogTitle.value = "新增付款";
  isEdit.value = false;
  currentEditId.value = null;
  originalPaymentAmount.value = 0;
  formData.value = {
    amount: 0,
    paymentTime: dayjs().format("YYYY-MM-DD"),
    paymentType: "现金",
    remark: ""
  };
  dialogVisible.value = true;
};

// 打开编辑付款对话框
const handleEdit = (row: PaymentRecord) => {
  dialogTitle.value = "编辑付款";
  isEdit.value = true;
  currentEditId.value = row.id;
  originalPaymentAmount.value = row.amount;
  formData.value = {
    amount: row.amount,
    paymentTime: row.paymentTime,
    paymentType: row.paymentType,
    remark: row.remark
  };
  dialogVisible.value = true;
};

// 提交付款
const handleSubmit = async () => {
  if (!formRef.value) return;

  const paymentAmount = Number(formData.value.amount) || 0;
  const currentDebtAmount = Number(totalDebt.value) || 0;

  try {
    await formRef.value.validate();

    if (!isEdit.value && paymentAmount > currentDebtAmount) {
      ElMessage.warning(
        `付款金额不能超过当前欠款（¥${formatMoney(currentDebtAmount)}）`
      );
      return;
    }

    submitting.value = true;
    let res;
    if (isEdit.value && currentEditId.value) {
      // 编辑模式
      res = await updatePaymentRecord({
        id: currentEditId.value,
        customerId: customerId.value,
        amount: paymentAmount,
        paymentTime: formData.value.paymentTime,
        paymentType: formData.value.paymentType,
        remark: formData.value.remark,
        createTime: "" // 不需要更新创建时间
      });
    } else {
      // 新增模式
      res = await addPaymentRecord({
        customerId: customerId.value,
        amount: paymentAmount,
        paymentTime: formData.value.paymentTime,
        paymentType: formData.value.paymentType,
        remark: formData.value.remark
      });
    }

    if (res.success) {
      if (isEdit.value) {
        const delta = paymentAmount - originalPaymentAmount.value;
        updateLocalDebt(-delta);
      } else {
        updateLocalDebt(-paymentAmount);
      }
      ElMessage.success(res.message);
      dialogVisible.value = false;
      await Promise.all([loadPaymentRecords(), loadCustomerDetail()]);
    }
  } catch (error) {
    if (error) {
      ElMessage.error(isEdit.value ? "更新付款记录失败" : "添加付款记录失败");
    }
  } finally {
    submitting.value = false;
  }
};

// 删除付款记录
const handleDelete = async (row: PaymentRecord) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除该付款记录吗？金额：¥${row.amount.toFixed(2)}`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    const res = await deletePaymentRecord(row.id);
    if (res.success) {
      ElMessage.success(res.message);
      updateLocalDebt(row.amount);
      await Promise.all([loadPaymentRecords(), loadCustomerDetail()]);
      calculateStatistics(); // 重新计算统计数据
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败");
    }
  }
};

// 刷新数据（使用并行加载）
const handleRefresh = () => {
  loadAllData();
};

// 返回列表
const handleBack = () => {
  router.push("/customer/index");
};

// 格式化付款时间
const formatPaymentTime = (time: string) => {
  return dayjs(time).format("YYYY-MM-DD");
};

// 格式化金额
const formatMoney = (value: number) => {
  if (!value) return "0.00";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// ============= 挂账记录功能 =============

// 添加/编辑挂账对话框
const creditDialogVisible = ref(false);
const creditDialogTitle = ref("新增挂账");
const isCreditEdit = ref(false);
const currentCreditEditId = ref<number | null>(null);
const creditFormRef = ref<FormInstance>();
const pdfFileList = ref<UploadFile[]>([]);

// 挂账表单数据
const creditFormData = ref({
  amount: null as number | null,
  creditDate: dayjs().format("YYYY-MM-DD"),
  remark: "",
  pdfFile: null as File | null
});

// 临时文件缓存，用于大文件预览
const tempFileCache = ref<Map<string, File>>(new Map());

// 挂账表单验证规则
const creditRules: FormRules = {
  amount: [
    { required: true, message: "请输入挂账金额", trigger: ["blur", "change"] },
    {
      validator: (rule, value, callback) => {
        console.log("验证金额:", value, typeof value);
        if (value === null || value === undefined || value === "") {
          callback(new Error("请输入挂账金额"));
        } else if (isNaN(Number(value)) || Number(value) <= 0) {
          callback(new Error("挂账金额必须大于0"));
        } else {
          callback();
        }
      },
      trigger: ["blur", "change"]
    }
  ],
  creditDate: [{ required: true, message: "请选择挂账日期", trigger: "change" }]
};

// 加载挂账记录
const loadCreditRecords = async () => {
  try {
    const res = await getCreditRecordList(customerId.value);
    if (res.success) {
      creditRecords.value = res.data.list;
      // 合并交易记录
      mergeTransactionRecords();
      return { success: true, data: res.data };
    }
    throw new Error("加载挂账记录失败");
  } catch (error) {
    console.error("加载挂账记录失败:", error);
    throw error;
  }
};

// 打开添加挂账对话框
const handleAddCredit = () => {
  creditDialogTitle.value = "新增挂账";
  isCreditEdit.value = false;
  currentCreditEditId.value = null;
  pdfFileList.value = [];
  creditFormData.value = {
    amount: null,
    creditDate: dayjs().format("YYYY-MM-DD"),
    remark: "",
    pdfFile: null
  };
  // 重置表单验证状态
  nextTick(() => {
    creditFormRef.value?.clearValidate();
  });
  creditDialogVisible.value = true;
};

// 打开编辑挂账对话框
const handleEditCredit = (row: CreditRecord) => {
  creditDialogTitle.value = "编辑挂账";
  isCreditEdit.value = true;
  currentCreditEditId.value = row.id;
  pdfFileList.value = [];
  creditFormData.value = {
    amount: row.amount,
    creditDate: row.creditDate,
    remark: row.remark,
    pdfFile: null
  };
  creditDialogVisible.value = true;
};

// 处理PDF文件选择
const handlePdfChange = (file: UploadFile) => {
  if (file.raw) {
    // 检查文件类型
    if (file.raw.type !== "application/pdf") {
      ElMessage.error("只能上传PDF格式的文件");
      pdfFileList.value = [];
      creditFormData.value.pdfFile = null;
      return;
    }
    // 检查文件大小（限制10MB）
    if (file.raw.size > 10 * 1024 * 1024) {
      ElMessage.error("文件大小不能超过10MB");
      pdfFileList.value = [];
      creditFormData.value.pdfFile = null;
      return;
    }
    creditFormData.value.pdfFile = file.raw;
  }
};

// 生成文件唯一标识符
const generateFileIdentifier = (file: File): string => {
  return btoa(`${file.name}_${file.size}_${file.lastModified}`).substring(
    0,
    100
  );
};

// 将文件上传到Supabase存储
const fileToBase64 = async (file: File): Promise<string> => {
  try {
    // 上传文件到Supabase存储
    const uploadResult = await uploadFileToSupabase(file, "invoices", "pdfs");

    if (!uploadResult.success || !uploadResult.filePath) {
      throw new Error(uploadResult.error || "文件上传失败");
    }

    // 返回文件路径信息
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      storageType: "supabase",
      filePath: uploadResult.filePath,
      fileUrl: uploadResult.fileUrl,
      message: "文件已上传到Supabase存储"
    };

    return JSON.stringify(fileInfo);
  } catch (error) {
    console.error("文件上传失败:", error);
    throw new Error(error instanceof Error ? error.message : "文件上传失败");
  }
};

// 提交挂账
const handleCreditSubmit = async () => {
  if (!creditFormRef.value || creditSubmitting.value) return;

  creditSubmitting.value = true;
  try {
    const valid = await creditFormRef.value.validate();
    if (valid) {
      try {
        let pdfBase64: string | undefined;
        if (creditFormData.value.pdfFile) {
          pdfBase64 = await fileToBase64(creditFormData.value.pdfFile);
        }

        let res;
        if (isCreditEdit.value && currentCreditEditId.value) {
          // 编辑模式
          const updateData: CreditRecord = {
            id: currentCreditEditId.value,
            customerId: customerId.value,
            amount: creditFormData.value.amount,
            creditDate: creditFormData.value.creditDate,
            invoiceUrl: pdfBase64,
            remark: creditFormData.value.remark,
            createTime: ""
          };
          res = await updateCreditRecord(updateData);
        } else {
          // 新增模式
          res = await addCreditRecord({
            customerId: customerId.value,
            amount: creditFormData.value.amount,
            creditDate: creditFormData.value.creditDate,
            invoicePdfBase64: pdfBase64,
            remark: creditFormData.value.remark
          });
        }

        if (res.success) {
          ElMessage.success(res.message);
          creditDialogVisible.value = false;
          loadCreditRecords();
          loadCustomerDetail(); // 刷新客户信息以更新欠款
        } else {
          ElMessage.error(res.message || "操作失败");
        }
      } catch (error) {
        console.error("挂账操作错误:", error);
        ElMessage.error(
          isCreditEdit.value ? "更新挂账记录失败" : "添加挂账记录失败"
        );
      }
    } else {
      ElMessage.warning("请填写完整的必填信息");
    }
  } catch (error) {
    console.error("表单验证错误:", error);
    ElMessage.error("表单验证失败，请检查输入信息");
  } finally {
    creditSubmitting.value = false;
  }
};

// 检查是否是第一条挂账记录
const checkIfFirstCreditRecord = (recordId: number): boolean => {
  // 获取所有挂账记录，按时间排序（最早的在前）
  const creditRecordsOnly = creditRecords.value.slice().sort((a, b) => {
    const dateA = new Date(a.creditDate).getTime();
    const dateB = new Date(b.creditDate).getTime();
    return dateA - dateB; // 最早的在前
  });

  // 检查第一条记录的ID是否匹配
  if (creditRecordsOnly.length > 0 && creditRecordsOnly[0].id === recordId) {
    return true;
  }

  return false;
};

// 删除挂账记录
const handleDeleteCredit = async (row: CreditRecord) => {
  // 检查是否是第一条挂账记录
  const isFirstCreditRecord = checkIfFirstCreditRecord(row.id);

  if (isFirstCreditRecord) {
    ElMessage.warning("第一条挂账记录不可删除");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除该挂账记录吗？金额：¥${row.amount.toFixed(2)}`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    const res = await deleteCreditRecord(row.id);
    if (res.success) {
      ElMessage.success(res.message);
      loadCreditRecords();
      loadCustomerDetail(); // 刷新客户信息以更新欠款
      calculateStatistics(); // 重新计算统计数据
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("删除失败");
    }
  }
};

// 从缓存或创建Blob URL预览PDF
const createPdfBlobUrl = (fileInfo: any): string | null => {
  try {
    // 检查缓存中是否有该文件
    if (
      fileInfo.fileIdentifier &&
      tempFileCache.value.has(fileInfo.fileIdentifier)
    ) {
      const cachedFile = tempFileCache.value.get(fileInfo.fileIdentifier);
      return URL.createObjectURL(cachedFile);
    }
    return null;
  } catch (error) {
    console.error("创建PDF Blob URL失败:", error);
    return null;
  }
};

// 预览PDF发票
const handlePreviewPdf = (invoiceUrl: string) => {
  if (!invoiceUrl) {
    ElMessage.warning("暂无发票");
    return;
  }

  // 检查是否是文件信息JSON字符串（Supabase格式）
  if (invoiceUrl.startsWith("{")) {
    try {
      const fileInfo = JSON.parse(invoiceUrl);

      // 处理Supabase存储格式
      if (fileInfo.storageType === "supabase" && fileInfo.fileUrl) {
        // 直接在新窗口打开Supabase存储的PDF文件
        window.open(fileInfo.fileUrl, "_blank");
        ElMessage.success("正在新窗口中打开PDF文件");
        return;
      }

      // 兼容旧格式提示
      ElMessage.warning(
        `文件格式不支持\n文件名：${fileInfo.name || "未知"}\n请重新上传文件到Supabase存储`
      );
      return;
    } catch (e) {
      console.error("解析文件信息失败:", e);
      ElMessage.error("文件信息解析失败，请重新上传");
      return;
    }
  }

  // 如果是Base64格式（兼容旧数据），在新窗口打开
  if (invoiceUrl.startsWith("data:application/pdf")) {
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      pdfWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PDF预览</title>
          <style>
            body { margin: 0; padding: 0; }
            iframe { width: 100%; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${invoiceUrl}" width="100%" height="100%"></iframe>
        </body>
        </html>
      `);
    }
  } else if (invoiceUrl.startsWith("http")) {
    // 如果是URL，直接打开
    window.open(invoiceUrl, "_blank");
  } else {
    ElMessage.warning("文件格式不支持，请重新上传PDF文件");
  }
};

// 并行加载所有数据
const loadAllData = async () => {
  loading.value = true;
  creditLoading.value = true;

  try {
    // 并行加载三个数据源
    const [customerDetailResult, paymentRecordsResult, creditRecordsResult] =
      await Promise.all([
        loadCustomerDetail(),
        loadPaymentRecords(),
        loadCreditRecords(),
        loadCompanies()
      ]);

    // 可以在这里处理并行加载完成后的逻辑
    console.log("客户详情页数据并行加载完成");
  } catch (error) {
    console.error("数据加载失败:", error);
    ElMessage.error("数据加载失败");
  } finally {
    loading.value = false;
    creditLoading.value = false;
  }
};

// 页面加载
onMounted(() => {
  loadAllData();
});
</script>

<template>
  <div class="customer-detail-container">
    <!-- 顶部操作栏 -->
    <div class="top-header mb-4">
      <div class="flex items-center gap-4">
        <el-button :icon="ArrowLeft" @click="handleBack">返回列表</el-button>
        <div v-if="customer" class="flex flex-col">
          <div class="flex items-center gap-2">
            <h2 class="page-title m-0">{{ customer.name }}</h2>
            <el-tag v-if="customer.companyName" type="info" size="small">{{
              customer.companyName
            }}</el-tag>
            <el-button
              type="primary"
              link
              :icon="Edit"
              @click="handleEditCustomer"
            >
              编辑
            </el-button>
          </div>
        </div>
      </div>
      <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
    </div>

    <!-- 客户统计卡片 -->
    <el-card shadow="never" class="mb-4">
      <div class="statistics-container">
        <div class="stat-item">
          <div class="stat-label">初始欠款</div>
          <div class="stat-value text-blue-600">
            ¥{{ formatMoney(initialDebt) }}
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label">累计付款</div>
          <div class="stat-value text-green-600">
            ¥{{ formatMoney(totalPayments) }}
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label">累计挂账</div>
          <div class="stat-value text-orange-600">
            ¥{{ formatMoney(totalCredits) }}
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label">当前欠款</div>
          <div class="stat-value text-red-600">
            ¥{{ formatMoney(totalDebt) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 交易记录列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="card-header-left">
            <span class="card-title">交易记录</span>
            <el-button type="primary" :icon="Plus" @click="handleAddPayment">
              新增付款
            </el-button>
            <el-button type="success" :icon="Plus" @click="handleAddCredit">
              新增挂账
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading || creditLoading"
        :data="transactionRecords"
        border
        stripe
      >
        <el-table-column label="序号" width="80" align="center">
          <template #default="{ $index }">
            {{ $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'payment' ? 'success' : 'warning'">
              {{ row.typeLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="150" align="right">
          <template #default="{ row }">
            <span
              :class="
                row.type === 'payment' ? 'text-green-600' : 'text-orange-600'
              "
            >
              ¥{{ row.amount.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="日期" width="150" align="center">
          <template #default="{ row }">
            {{
              row.type === "payment" ? formatPaymentTime(row.date) : row.date
            }}
          </template>
        </el-table-column>
        <el-table-column
          prop="paymentType"
          label="付款类型"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <template v-if="row.type === 'payment' && row.paymentType">
              <el-tag
                :type="row.paymentType === '现金' ? 'success' : 'warning'"
              >
                {{ row.paymentType }}
              </el-tag>
            </template>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="发票" width="120" align="center">
          <template #default="{ row }">
            <template v-if="row.type === 'credit' && row.invoiceUrl">
              <!-- 检查是否是缓存格式的大文件 -->
              <template
                v-if="
                  row.invoiceUrl.startsWith('{') &&
                  row.invoiceUrl.includes('isLargeFile')
                "
              >
                <el-button
                  link
                  :type="
                    row.invoiceUrl.includes('storageType') &&
                    row.invoiceUrl.includes('cached')
                      ? 'success'
                      : 'warning'
                  "
                  :icon="View"
                  :title="
                    row.invoiceUrl.includes('cached')
                      ? '支持预览的大文件'
                      : '文件信息仅保存，重新上传可启用预览'
                  "
                  @click="handlePreviewPdf(row.invoiceUrl)"
                >
                  {{ row.invoiceUrl.includes("cached") ? "预览" : "详情" }}
                </el-button>
              </template>
              <template v-else>
                <el-button
                  link
                  type="primary"
                  :icon="View"
                  @click="handlePreviewPdf(row.invoiceUrl)"
                >
                  预览
                </el-button>
              </template>
            </template>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="remark"
          label="备注"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :icon="Edit"
              @click="
                row.type === 'payment'
                  ? handleEdit(row.originalData)
                  : handleEditCredit(row.originalData)
              "
            >
              编辑
            </el-button>
            <el-button
              v-if="
                row.type === 'payment' ||
                (row.type === 'credit' &&
                  !checkIfFirstCreditRecord(row.originalData.id))
              "
              link
              type="danger"
              :icon="Delete"
              @click="
                row.type === 'payment'
                  ? handleDelete(row.originalData)
                  : handleDeleteCredit(row.originalData)
              "
            >
              删除
            </el-button>
            <el-tooltip
              v-else-if="
                row.type === 'credit' &&
                checkIfFirstCreditRecord(row.originalData.id)
              "
              content="第一条挂账记录不可删除"
              placement="top"
            >
              <el-button link type="danger" :icon="Delete" disabled>
                删除
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑付款对话框 -->
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
        <el-form-item label="付款金额" prop="amount">
          <el-input-number
            v-model="formData.amount"
            :min="0"
            :precision="0"
            :step="1"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入付款金额"
          />
        </el-form-item>
        <el-form-item label="付款时间" prop="paymentTime">
          <el-date-picker
            v-model="formData.paymentTime"
            type="date"
            placeholder="请选择付款时间"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="付款类型" prop="paymentType">
          <el-select
            v-model="formData.paymentType"
            placeholder="请选择付款类型"
            style="width: 100%"
          >
            <el-option
              v-for="item in paymentTypeOptions"
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
            placeholder="请输入备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <!-- 添加/编辑挂账对话框 -->
    <el-dialog
      v-model="creditDialogVisible"
      :title="creditDialogTitle"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="credit-dialog-content">
        <el-form
          ref="creditFormRef"
          :model="creditFormData"
          :rules="creditRules"
          label-width="100px"
        >
          <el-form-item label="挂账金额" prop="amount">
            <el-input-number
              v-model="creditFormData.amount"
              :min="0"
              :precision="0"
              :step="1"
              controls-position="right"
              style="width: 100%"
              placeholder="请输入挂账金额"
            />
          </el-form-item>
          <el-form-item label="挂账日期" prop="creditDate">
            <el-date-picker
              v-model="creditFormData.creditDate"
              type="date"
              placeholder="请选择挂账日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="发票" prop="pdfFile" class="credit-upload-item">
            <div class="credit-upload-field">
              <el-upload
                v-model:file-list="pdfFileList"
                :auto-upload="false"
                :on-change="handlePdfChange"
                :limit="1"
                accept="application/pdf,.pdf"
                drag
              >
                <el-icon class="el-icon--upload"><Document /></el-icon>
                <div class="el-upload__text">
                  拖拽PDF文件到此处，或<em>点击上传</em>
                </div>
              </el-upload>
              <div class="credit-upload-tip">
                只能上传PDF格式的发票文件，且不超过10MB
              </div>
            </div>
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input
              v-model="creditFormData.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注（可选）"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="creditDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="creditSubmitting"
          :disabled="creditSubmitting"
          @click="handleCreditSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
    <!-- 编辑客户对话框 -->
    <el-dialog
      v-model="editCustomerDialogVisible"
      title="编辑客户信息"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editCustomerFormRef"
        :model="editCustomerFormData"
        :rules="editCustomerRules"
        label-width="100px"
      >
        <el-form-item label="客户名称" prop="name">
          <el-input
            v-model="editCustomerFormData.name"
            placeholder="请输入客户名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="所属公司" prop="companyId">
          <el-select
            v-model="editCustomerFormData.companyId"
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
      </el-form>
      <template #footer>
        <el-button @click="editCustomerDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="editCustomerLoading"
          @click="handleUpdateCustomerSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.customer-detail-container {
  padding: 8px;
}

.top-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;

  .page-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
}

.card-compact :deep(.el-card__header) {
  min-height: 36px;
  padding: 8px 16px;
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;

  .card-header-left {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.card-header__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}

.credit-dialog-content {
  padding-right: 16px;

  :deep(.el-form-item__content) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  :deep(.el-upload) {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
  }

  :deep(.el-upload-dragger) {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 120px; /* 确保有足够的高度显示蓝色虚线框 */
    background-color: #fafafa;
    border: 2px dashed #409eff; /* 强制显示蓝色虚线框 */
    border-radius: 6px;
    transition: all 0.3s;
  }

  :deep(.el-upload-dragger:hover) {
    background-color: #f5f7fa;
    border-color: #409eff;
  }

  :deep(.el-upload-dragger.is-dragover) {
    background-color: #ecf5ff;
    border-color: #409eff;
  }

  :deep(.el-upload-list) {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
  }

  :deep(.el-upload-list__item) {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    margin-right: 0;
    word-break: break-all;
  }

  :deep(.el-upload-list__item-name) {
    word-break: break-all;
    white-space: normal;
  }
}

.credit-upload-item {
  :deep(.el-form-item__content) {
    flex: 1;
    width: 100%;
    min-width: 0; /* 确保在窄容器中也能正确显示 */
  }
}

.credit-upload-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch; /* 改为stretch确保占满宽度 */
  width: 100%;
}

.credit-upload-tip {
  font-size: 12px;
  color: #909399;
}

/* 统计卡片样式 */
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
  margin-bottom: 6px;
  font-size: 13px;
  color: #909399;
}

.stat-label-large {
  font-size: 18px;
  font-weight: 600;
  color: #606266;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-value-large {
  font-size: 36px;
  font-weight: 700;
  color: #303133;
}

.summary-box {
  padding-top: 16px;
  border-top: 1px solid #ebeef5;

  .summary-content {
    display: flex;
    align-items: center;
    font-size: 14px;

    .ml-8 {
      margin-left: 32px;
    }
  }
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}
</style>
