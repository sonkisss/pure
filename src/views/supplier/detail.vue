<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import type {
  FormInstance,
  FormRules,
  UploadFile,
  UploadProps
} from "element-plus";
import {
  getSupplierDetail,
  getSupplierDebts,
  addSupplierDebt,
  updateSupplierDebt,
  deleteSupplierDebt,
  getSupplierPaymentList,
  addSupplierPayment,
  updateSupplierPayment,
  deleteSupplierPayment,
  uploadDebtExcel,
  exportDebtsExcel,
  type Supplier,
  type SupplierDebt,
  type SupplierPayment,
  type PaymentType
} from "@/api/supplier";
import { uploadSupplierVoucher } from "@/api/supplier";
import {
  ArrowLeft,
  Plus,
  Delete,
  Edit,
  Refresh,
  Money,
  Document,
  Picture,
  Upload,
  UploadFilled,
  Download,
  Loading,
  ZoomIn
} from "@element-plus/icons-vue";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { formatMoney } from "@/utils/format";
import ImagePreview from "@/components/ImagePreview";

defineOptions({
  name: "SupplierDetail"
});

const route = useRoute();
const router = useRouter();
const supplierId = Number(route.params.id);

// 供应商信息
const supplier = ref<Supplier | null>(null);
const supplierLoading = ref(false);

// 欠款明细列表
const debts = ref<SupplierDebt[]>([]);
const debtsLoading = ref(false);
const debtsTotal = ref(0);
const selectedDebts = ref<number[]>([]); // 选中的欠款ID

// 付款记录列表
const payments = ref<SupplierPayment[]>([]);
const paymentsLoading = ref(false);
const totalDebt = ref(0);
const totalPaid = ref(0);

// Excel上传相关
const uploadExcelDialogVisible = ref(false);
const currentUploadDebtId = ref<number | null>(null);
const excelFile = ref<File | null>(null);
const excelFileList = ref<UploadFile[]>([]);

// 图片上传相关
const uploadImageDialogVisible = ref(false);
const currentUploadImageDebtId = ref<number | null>(null);
const imageFile = ref<File | null>(null);
const imageFileList = ref<UploadFile[]>([]);

// 图片预览相关
const imagePreviewVisible = ref(false);
const previewImages = ref<string[]>([]);
const currentImageIndex = ref(0);

// 凭证预览相关
const voucherPreviewVisible = ref(false);
const voucherPreviewUrl = ref<string>("");

// 欠款明细图片预览相关
const debtImagePreviewVisible = ref(false);
const debtImagePreviewUrl = ref<string>("");

// 欠款明细分页相关
const debtPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

// 付款记录分页相关
const paymentPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

const statistics = computed(() => {
  // 总欠款金额（所有欠款记录的总和）
  const totalDebtAmount = debts.value.reduce(
    (sum, debt) => sum + debt.amount,
    0
  );

  // 已付款金额（所有付款记录的总和）
  const paidAmount = totalPaid.value;

  // 当前欠款金额（总欠款 - 已付款）
  const currentDebt = Math.max(0, totalDebtAmount - paidAmount);

  return {
    totalDebtAmount,
    paidAmount,
    currentDebt
  };
});

// 加载供应商详情
const loadSupplierDetail = async () => {
  supplierLoading.value = true;
  try {
    const res = await getSupplierDetail(supplierId);
    if (res.success) {
      supplier.value = res.data;
    }
  } catch (error) {
    ElMessage.error("加载供应商信息失败");
  } finally {
    supplierLoading.value = false;
  }
};

// 加载欠款明细（支持分页）
const loadDebts = async (page = 1, pageSize = 20) => {
  debtsLoading.value = true;
  try {
    const res = await getSupplierDebts(supplierId, { page, pageSize });
    if (res.success) {
      debts.value = res.data.list;
      debtsTotal.value = res.data.total;
      debtPagination.page = page;
      debtPagination.pageSize = pageSize;
    }
  } catch (error) {
    ElMessage.error("加载欠款明细失败");
  } finally {
    debtsLoading.value = false;
  }
};

// 加载付款记录（支持分页）
const loadPayments = async (page = 1, pageSize = 20) => {
  paymentsLoading.value = true;
  try {
    const res = await getSupplierPaymentList(supplierId, { page, pageSize });
    if (res.success) {
      payments.value = res.data.list;
      totalDebt.value = res.data.totalDebt;
      totalPaid.value = res.data.totalPaid;
      paymentPagination.page = page;
      paymentPagination.pageSize = pageSize;
      paymentPagination.total = res.data.total;
    }
  } catch (error) {
    ElMessage.error("加载付款记录失败");
  } finally {
    paymentsLoading.value = false;
  }
};

// 刷新所有数据
const handleRefresh = async () => {
  await Promise.all([loadSupplierDetail(), loadDebts(), loadPayments()]);
};

// 返回列表
const goBack = () => {
  router.push("/supplier/index");
};

// 格式化时间
const formatTime = (time: string) => {
  return dayjs(time).format("YYYY-MM-DD HH:mm:ss");
};

// ==================== 欠款明细相关 ====================

// 添加欠款对话框
const addDebtDialogVisible = ref(false);
const addDebtFormRef = ref<FormInstance>();
const addDebtForm = reactive({
  amount: 0,
  debtDate: dayjs().format("YYYY-MM-DD"),
  description: "",
  excelFile: null as File | null,
  imageFile: null as File | null
});

const addDebtRules: FormRules = {
  amount: [
    { required: true, message: "请输入欠款金额", trigger: "blur" },
    { type: "number", min: 0, message: "金额不能为负数", trigger: "blur" }
  ],
  debtDate: [{ required: true, message: "请选择欠款日期", trigger: "change" }],
  description: [{ required: true, message: "请输入欠款描述", trigger: "blur" }]
};

const addDebtExcelFileList = ref<UploadFile[]>([]);
const addDebtImageFileList = ref<UploadFile[]>([]);

const handleExcelChange: UploadProps["onChange"] = file => {
  addDebtForm.excelFile = file.raw || null;
};

const handleImageChange: UploadProps["onChange"] = file => {
  addDebtForm.imageFile = file.raw || null;
};

// 打开添加欠款对话框
const handleAddDebt = () => {
  Object.assign(addDebtForm, {
    amount: 0,
    debtDate: dayjs().format("YYYY-MM-DD"),
    description: "",
    excelFile: null,
    imageFile: null
  });
  addDebtExcelFileList.value = [];
  addDebtImageFileList.value = [];
  addDebtFormRef.value?.clearValidate();
  addDebtDialogVisible.value = true;
};

// 提交添加欠款
const handleAddDebtSubmit = async () => {
  if (!addDebtFormRef.value) return;

  await addDebtFormRef.value.validate(async valid => {
    if (valid) {
      try {
        // 如果有Excel文件，先解析Excel
        let excelItems = null;
        if (addDebtForm.excelFile) {
          try {
            excelItems = await parseExcelFile(addDebtForm.excelFile);
          } catch (error) {
            ElMessage.error("Excel文件解析失败，请检查文件格式");
            return;
          }
        }

        // 如果有图片，转换为Base64
        let imageBase64 = null;
        if (addDebtForm.imageFile) {
          imageBase64 = await fileToBase64(addDebtForm.imageFile);
        }

        // 添加欠款
        const res = await addSupplierDebt(supplierId, {
          amount: addDebtForm.amount,
          description: addDebtForm.description,
          debtDate: addDebtForm.debtDate,
          imageBase64: imageBase64 || undefined
        });

        if (res.success) {
          const newDebtId = res.data.id;

          // 构建成功消息
          let successMessage = "欠款添加成功";
          const details: string[] = [];

          if (imageBase64) {
            details.push("图片凭证已上传");
          }

          // 如果有Excel数据，上传到该欠款
          if (excelItems && excelItems.length > 0) {
            try {
              const excelRes = await uploadDebtExcel(newDebtId, excelItems);
              if (excelRes.success) {
                details.push(`已导入 ${excelItems.length} 条产品明细`);
              } else {
                ElMessage.warning(
                  `欠款添加成功，但产品明细导入失败: ${excelRes.message}`
                );
                addDebtDialogVisible.value = false;
                await handleRefresh();
                return;
              }
            } catch (error) {
              ElMessage.warning("欠款添加成功，但产品明细导入失败");
              addDebtDialogVisible.value = false;
              await refreshDebts();
              return;
            }
          }

          // 显示最终的成功消息
          if (details.length > 0) {
            successMessage += `，${details.join("，")}`;
          }
          ElMessage.success(successMessage);

          addDebtDialogVisible.value = false;
          await refreshDebts();
        } else {
          ElMessage.error(res.message);
        }
      } catch (error) {
        ElMessage.error("添加失败");
      }
    }
  });
};

// 解析Excel文件（提取为独立函数）
const parseExcelFile = (file: File): Promise<any[]> => {
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

        // 解析并验证数据
        const items = jsonData.map((row: any) => {
          const productName = row["产品名称"] || row["productName"] || "";
          const productModel =
            row["产品型号"] || row["规格型号"] || row["productModel"] || "";
          const quantity = Number(row["数量"] || row["quantity"] || 0);
          const unit = row["单位"] || row["unit"] || "";
          const unitPrice = Number(row["单价"] || row["unitPrice"] || 0);
          const amount = Number(row["金额"] || row["amount"] || 0);

          let hasTax = false;
          const taxField =
            row["是否含税"] || row["含税"] || row["hasTax"] || "";
          if (
            taxField === "是" ||
            taxField === true ||
            taxField === "含税" ||
            taxField === 1
          ) {
            hasTax = true;
          }

          return {
            productName,
            productModel,
            quantity,
            unit,
            unitPrice,
            amount,
            hasTax
          };
        });

        // 验证必填字段
        const invalidItems = items.filter(
          item =>
            !item.productName ||
            !item.productModel ||
            item.quantity <= 0 ||
            !item.unit ||
            item.unitPrice < 0
        );

        if (invalidItems.length > 0) {
          reject(new Error(`发现 ${invalidItems.length} 条无效数据`));
          return;
        }

        resolve(items);
      } catch (error) {
        reject(error);
      }
    };

    fileReader.onerror = () => {
      reject(new Error("文件读取失败"));
    };

    fileReader.readAsBinaryString(file);
  });
};

// 文件转Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 修改欠款对话框
const editDebtDialogVisible = ref(false);
const editDebtFormRef = ref<FormInstance>();
const currentEditDebt = ref<SupplierDebt | null>(null);
const editDebtSubmitting = ref(false);
const editDebtForm = reactive({
  amount: 0,
  debtDate: dayjs().format("YYYY-MM-DD"),
  description: "",
  imageFile: null as File | null
});
const editDebtImageFileList = ref<UploadFile[]>([]);

const editDebtRules: FormRules = {
  amount: [
    { required: true, message: "请输入欠款金额", trigger: "blur" },
    { type: "number", min: 0, message: "金额不能为负数", trigger: "blur" }
  ],
  debtDate: [{ required: true, message: "请选择欠款日期", trigger: "change" }],
  description: [{ required: true, message: "请输入欠款描述", trigger: "blur" }]
};

// 图片上传处理（编辑欠款）
const handleEditDebtImageChange: UploadProps["onChange"] = file => {
  editDebtForm.imageFile = file.raw || null;
};

// 打开修改欠款对话框
const handleEditDebt = (debt: SupplierDebt) => {
  currentEditDebt.value = debt;
  Object.assign(editDebtForm, {
    amount: debt.amount,
    debtDate: debt.debtDate
      ? dayjs(debt.debtDate).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
    description: debt.description,
    imageFile: null
  });
  // 如果有现有图片，显示在上传列表中
  editDebtImageFileList.value = debt.imageUrl
    ? [{ name: "current-image.jpg", url: debt.imageUrl } as UploadFile]
    : [];
  editDebtFormRef.value?.clearValidate();
  editDebtDialogVisible.value = true;
};

// 提交修改欠款
const handleEditDebtSubmit = async () => {
  if (
    !editDebtFormRef.value ||
    !currentEditDebt.value ||
    editDebtSubmitting.value
  )
    return;

  editDebtSubmitting.value = true;
  try {
    await editDebtFormRef.value.validate();

    // 如果有新图片，转换为Base64
    let imageBase64 = undefined;
    if (editDebtForm.imageFile) {
      imageBase64 = await fileToBase64(editDebtForm.imageFile);
    }

    const res = await updateSupplierDebt(currentEditDebt.value.id, {
      amount: editDebtForm.amount,
      description: editDebtForm.description,
      debtDate: editDebtForm.debtDate,
      imageBase64
    });
    if (res.success) {
      ElMessage.success(res.message);
      editDebtDialogVisible.value = false;
      await handleRefresh();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    console.error("修改欠款失败:", error);
    ElMessage.error("修改失败");
  } finally {
    editDebtSubmitting.value = false;
  }
};

// 删除欠款
const handleDeleteDebt = (debt: SupplierDebt) => {
  ElMessageBox.confirm(
    `确定要删除该欠款记录吗？（金额: ¥${formatMoney(debt.amount)}）`,
    "删除确认",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    }
  ).then(async () => {
    try {
      const res = await deleteSupplierDebt(debt.id);
      if (res.success) {
        ElMessage.success(res.message);
        await refreshDebts();
      } else {
        ElMessage.error(res.message);
      }
    } catch (error) {
      ElMessage.error("删除失败");
    }
  });
};

// ==================== 付款记录相关 ====================

// 付款对话框
const paymentDialogVisible = ref(false);
const paymentFormRef = ref<FormInstance>();
const isEditPayment = ref(false);
const currentEditPayment = ref<SupplierPayment | null>(null);
const paymentSubmitting = ref(false);
const paymentForm = reactive({
  amount: 0,
  paymentDate: dayjs().format("YYYY-MM-DD"),
  paymentType: "现金" as PaymentType,
  voucher: "",
  remark: ""
});

const paymentRules: FormRules = {
  amount: [
    { required: true, message: "请输入付款金额", trigger: "blur" },
    { type: "number", min: 0.01, message: "金额必须大于0", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        const numValue = Number(value);

        // 检查付款金额是否为有效数字
        if (isNaN(numValue) || numValue <= 0) {
          callback(new Error("付款金额必须大于0"));
          return;
        }

        // 检查付款金额不能大于当前欠款金额
        const currentDebt = statistics.value.currentDebt;
        if (numValue > currentDebt) {
          callback(
            new Error(
              `付款金额不能大于当前欠款金额 ¥${formatMoney(currentDebt)}`
            )
          );
          return;
        }

        callback();
      },
      trigger: "blur"
    }
  ],
  paymentDate: [
    { required: true, message: "请选择付款日期", trigger: "change" }
  ],
  paymentType: [
    { required: true, message: "请选择付款类型", trigger: "change" }
  ]
};

const voucherFileList = ref<UploadFile[]>([]);
const voucherFile = ref<File | null>(null);

const handleVoucherUpload: UploadProps["onChange"] = uploadFile => {
  voucherFile.value = uploadFile.raw || null;
};

const handleVoucherRemove = () => {
  paymentForm.voucher = "";
  voucherFileList.value = [];
  voucherFile.value = null;
};

// 打开添加付款对话框
const handleAddPayment = () => {
  isEditPayment.value = false;
  currentEditPayment.value = null;
  Object.assign(paymentForm, {
    amount: 0,
    paymentDate: dayjs().format("YYYY-MM-DD"),
    paymentType: "现金" as PaymentType,
    voucher: "",
    remark: ""
  });
  voucherFileList.value = [];
  voucherFile.value = null;
  paymentFormRef.value?.clearValidate();
  paymentDialogVisible.value = true;
};

// 打开修改付款对话框
const handleEditPayment = (payment: SupplierPayment) => {
  isEditPayment.value = true;
  currentEditPayment.value = payment;
  Object.assign(paymentForm, {
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentType: payment.paymentType,
    voucher: payment.voucher || "",
    remark: payment.remark || ""
  });
  voucherFileList.value = payment.voucher
    ? [{ name: "voucher.jpg", url: payment.voucher } as UploadFile]
    : [];
  voucherFile.value = null;
  paymentFormRef.value?.clearValidate();
  paymentDialogVisible.value = true;
};

// 提交付款
const handlePaymentSubmit = async () => {
  if (!paymentFormRef.value || paymentSubmitting.value) return;

  paymentSubmitting.value = true;
  try {
    await paymentFormRef.value.validate();

    // 若选择了凭证文件，先上传到存储，拿到存储路径
    if (voucherFile.value) {
      const upRes = await uploadSupplierVoucher(supplierId, voucherFile.value);
      if (upRes.success) {
        paymentForm.voucher = upRes.data.path;
      } else {
        ElMessage.error(upRes.message || "凭证上传失败");
        paymentForm.voucher = "";
      }
    }

    let res;
    if (isEditPayment.value && currentEditPayment.value) {
      // 修改付款记录
      res = await updateSupplierPayment({
        id: currentEditPayment.value.id,
        supplierId: supplierId,
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        paymentType: paymentForm.paymentType,
        voucher: paymentForm.voucher || undefined,
        remark: paymentForm.remark || undefined,
        createTime: currentEditPayment.value.createTime,
        updateTime: new Date().toISOString()
      });
    } else {
      // 新增付款记录
      res = await addSupplierPayment({
        supplierId: supplierId,
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        paymentType: paymentForm.paymentType,
        voucher: paymentForm.voucher || undefined,
        remark: paymentForm.remark || undefined
      });
    }

    if (res.success) {
      ElMessage.success(res.message);
      paymentDialogVisible.value = false;
      await refreshPayments();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    if (error) {
      console.error("付款提交失败:", error);
      ElMessage.error("操作失败");
    }
  } finally {
    paymentSubmitting.value = false;
  }
};

// 删除付款记录
const handleDeletePayment = (payment: SupplierPayment) => {
  ElMessageBox.confirm(
    `确定要删除该付款记录吗？（金额: ¥${formatMoney(payment.amount)}）`,
    "删除确认",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    }
  ).then(async () => {
    try {
      const res = await deleteSupplierPayment(payment.id);
      if (res.success) {
        ElMessage.success(res.message);
        await refreshPayments();
      } else {
        ElMessage.error(res.message);
      }
    } catch (error) {
      ElMessage.error("删除失败");
    }
  });
};

// ==================== Excel相关功能 ====================

// 表格行选择
const handleSelectionChange = (selection: SupplierDebt[]) => {
  selectedDebts.value = selection.map(d => d.id);
};

// 上传Excel
const handleUploadExcel = (debt: SupplierDebt) => {
  currentUploadDebtId.value = debt.id;
  excelFile.value = null;
  excelFileList.value = [];
  uploadExcelDialogVisible.value = true;
};

const handleExcelFileChange: UploadProps["onChange"] = file => {
  excelFile.value = file.raw || null;
};

const handleExcelUploadSubmit = async () => {
  if (!excelFile.value || !currentUploadDebtId.value) {
    ElMessage.warning("请选择Excel文件");
    return;
  }

  try {
    // 读取Excel文件
    const fileReader = new FileReader();

    fileReader.onload = async e => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });

        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 将工作表转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          ElMessage.error("Excel文件为空");
          return;
        }

        // 解析并验证数据
        const items = jsonData.map((row: any) => {
          // 处理不同的字段名称（中英文兼容）
          const productName = row["产品名称"] || row["productName"] || "";
          const productModel =
            row["产品型号"] || row["规格型号"] || row["productModel"] || "";
          const quantity = Number(row["数量"] || row["quantity"] || 0);
          const unit = row["单位"] || row["unit"] || "";
          const unitPrice = Number(row["单价"] || row["unitPrice"] || 0);
          const amount = Number(row["金额"] || row["amount"] || 0);

          // 处理是否含税字段
          let hasTax = false;
          const taxField =
            row["是否含税"] || row["含税"] || row["hasTax"] || "";
          if (
            taxField === "是" ||
            taxField === true ||
            taxField === "含税" ||
            taxField === 1
          ) {
            hasTax = true;
          }

          return {
            productName,
            productModel,
            quantity,
            unit,
            unitPrice,
            amount,
            hasTax
          };
        });

        // 验证必填字段
        const invalidItems = items.filter(
          item =>
            !item.productName ||
            !item.productModel ||
            item.quantity <= 0 ||
            !item.unit ||
            item.unitPrice < 0
        );

        if (invalidItems.length > 0) {
          ElMessage.error(
            `发现 ${invalidItems.length} 条无效数据，请检查Excel文件格式`
          );
          return;
        }

        // 计算Excel中所有产品的总金额
        const excelTotalAmount = items.reduce(
          (sum, item) => sum + item.amount,
          0
        );

        // 获取当前欠款记录的金额
        const currentDebt = debts.value.find(
          debt => debt.id === currentUploadDebtId.value
        );
        if (!currentDebt) {
          ElMessage.error("未找到对应的欠款记录");
          return;
        }

        // 校验Excel总金额与欠款金额是否一致
        if (Math.abs(excelTotalAmount - currentDebt.amount) > 0.01) {
          ElMessage.error(
            `Excel明细总金额（¥${excelTotalAmount.toFixed(2)}）与欠款金额（¥${currentDebt.amount.toFixed(2)}）不一致，无法上传！请检查Excel文件或修改欠款金额。`
          );
          return;
        }

        // 调用API上传
        const res = await uploadDebtExcel(currentUploadDebtId.value!, items);
        if (res.success) {
          ElMessage.success(res.message);
          uploadExcelDialogVisible.value = false;
          await handleRefresh();
        } else {
          ElMessage.error(res.message);
        }
      } catch (error) {
        ElMessage.error("Excel文件解析失败，请检查文件格式");
      }
    };

    fileReader.onerror = () => {
      ElMessage.error("文件读取失败");
    };

    fileReader.readAsBinaryString(excelFile.value);
  } catch (error) {
    ElMessage.error("上传失败");
  }
};

// 查看Excel详情
const handleViewExcelDetail = (debt: SupplierDebt) => {
  router.push(`/supplier/debt/${debt.id}/excel`);
};

// 下载Excel模板
const handleDownloadTemplate = () => {
  const templateData = [
    {
      产品名称: "示例产品A",
      产品型号: "MODEL-001",
      数量: 10,
      单位: "个",
      单价: 100.5,
      金额: 1005.0,
      是否含税: "是"
    },
    {
      产品名称: "示例产品B",
      产品型号: "MODEL-002",
      数量: 5,
      单位: "箱",
      单价: 200.0,
      金额: 1000.0,
      是否含税: "否"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "产品明细模板");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  saveAs(blob, "供应商产品明细模版.xlsx");
  ElMessage.success("模板下载成功");
};

// 上传图片
const handleUploadImage = (debt: SupplierDebt) => {
  currentUploadImageDebtId.value = debt.id;
  imageFile.value = null;
  imageFileList.value = [];
  uploadImageDialogVisible.value = true;
};

const handleImageFileChange: UploadProps["onChange"] = file => {
  imageFile.value = file.raw || null;
};

const handleImageUploadSubmit = async () => {
  if (!imageFile.value || !currentUploadImageDebtId.value) {
    ElMessage.warning("请选择图片文件");
    return;
  }

  try {
    // 将图片转换为Base64
    const imageBase64 = await fileToBase64(imageFile.value);

    // 调用API更新欠款图片
    const res = await updateSupplierDebt(currentUploadImageDebtId.value, {
      imageBase64: imageBase64
    });

    if (res.success) {
      ElMessage.success("图片上传成功");
      uploadImageDialogVisible.value = false;
      await handleRefresh();
    } else {
      ElMessage.error(res.message);
    }
  } catch (error) {
    ElMessage.error("图片上传失败");
  }
};

// 查看图片
const handleViewImage = (imageUrl: string) => {
  previewImages.value = [imageUrl];
  currentImageIndex.value = 0;
  imagePreviewVisible.value = true;
};

// 查看凭证（支持异步加载状态）
const handleViewVoucher = (row: any) => {
  if (!row.voucher && row.voucher !== null) {
    ElMessage.warning("暂无凭证");
    return;
  }

  if (row.voucher) {
    // 已加载的凭证，直接查看
    handleViewImage(row.voucher);
  } else {
    // 未加载的凭证，显示加载中提示
    ElMessage.info("凭证正在加载中，请稍候...");
  }
};

// 显示凭证预览（使用Element Plus的ElImageViewer）
const showVoucherPreview = (imageUrl: string) => {
  voucherPreviewUrl.value = imageUrl;
  voucherPreviewVisible.value = true;
};

// 关闭凭证预览
const closeVoucherPreview = () => {
  voucherPreviewVisible.value = false;
  voucherPreviewUrl.value = "";
};

// 显示欠款明细图片预览（使用Element Plus的ElImageViewer）
const showDebtImagePreview = (imageUrl: string) => {
  debtImagePreviewUrl.value = imageUrl;
  debtImagePreviewVisible.value = true;
};

// 关闭欠款明细图片预览
const closeDebtImagePreview = () => {
  debtImagePreviewVisible.value = false;
  debtImagePreviewUrl.value = "";
};

// 欠款明细分页处理
const handleDebtPageChange = (page: number) => {
  loadDebts(page, debtPagination.pageSize);
};

const handleDebtSizeChange = (size: number) => {
  loadDebts(1, size);
};

// 刷新欠款明细数据
const refreshDebts = () => {
  loadDebts(debtPagination.page, debtPagination.pageSize);
};

// 付款记录分页处理
const handlePaymentPageChange = (page: number) => {
  loadPayments(page, paymentPagination.pageSize);
};

const handlePaymentSizeChange = (size: number) => {
  loadPayments(1, size);
};

// 刷新付款记录数据
const refreshPayments = () => {
  loadPayments(paymentPagination.page, paymentPagination.pageSize);
};

// 批量导出Excel
const handleExportSelected = async () => {
  if (selectedDebts.value.length === 0) {
    ElMessage.warning("请先选择要导出的欠款记录");
    return;
  }

  // 过滤出有Excel数据的记录
  const debtsWithExcel = debts.value.filter(
    d => selectedDebts.value.includes(d.id) && d.hasExcelData
  );

  if (debtsWithExcel.length === 0) {
    ElMessage.warning("所选记录中没有Excel数据");
    return;
  }

  try {
    const res = await exportDebtsExcel(debtsWithExcel.map(d => d.id));
    if (res.success && res.data.length > 0) {
      // 生成Excel文件
      const worksheet = XLSX.utils.json_to_sheet(
        res.data.map(item => ({
          产品名称: item.productName,
          产品型号: item.productModel,
          数量: item.quantity,
          单位: item.unit,
          单价: item.unitPrice,
          金额: item.amount,
          是否含税: item.hasTax ? "是" : "否"
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "产品明细");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array"
      });

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      saveAs(blob, `欠款明细_${new Date().getTime()}.xlsx`);
      ElMessage.success("导出成功");
    }
  } catch (error) {
    ElMessage.error("导出失败");
  }
};

onMounted(async () => {
  await Promise.all([loadSupplierDetail(), loadDebts(), loadPayments()]);
});
</script>

<template>
  <div class="supplier-detail-container">
    <!-- 顶部操作栏 -->
    <div class="top-header mb-4">
      <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
      <span class="page-title">{{ supplier?.name || "供应商详情" }}</span>
    </div>

    <!-- 统计卡片 -->
    <el-card shadow="never" class="mb-4">
      <div class="statistics-container">
        <div class="stat-item">
          <div class="stat-label">累计欠款</div>
          <div class="stat-value text-red-500">
            ¥{{ formatMoney(statistics.totalDebtAmount) }}
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label">累计付款</div>
          <div class="stat-value text-green-500">
            ¥{{ formatMoney(statistics.paidAmount) }}
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label">当前欠款</div>
          <div class="stat-value text-orange-500">
            ¥{{ formatMoney(statistics.currentDebt) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 欠款明细列表 -->
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="card-header">
          <span class="card-title">欠款明细</span>
          <el-button type="primary" :icon="Plus" @click="handleAddDebt">
            添加欠款
          </el-button>
          <el-button
            type="success"
            :icon="Download"
            :disabled="selectedDebts.length === 0"
            @click="handleExportSelected"
          >
            导出明细
          </el-button>
          <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
        </div>
      </template>

      <el-table
        v-loading="debtsLoading"
        :data="debts"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column label="金额" width="130" align="right">
          <template #default="{ row }">
            <span class="text-red-500 font-bold">
              ¥{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="欠款日期" width="120" align="center">
          <template #default="{ row }">
            {{ row.debtDate ? dayjs(row.debtDate).format("YYYY-MM-DD") : "-" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="description"
          label="描述"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="Excel明细" width="120" align="center">
          <template #default="{ row }">
            <div
              v-if="row.hasExcelData"
              class="flex flex-col items-center gap-1"
            >
              <el-tooltip content="查看Excel明细">
                <el-icon
                  :size="24"
                  color="#67C23A"
                  class="cursor-pointer"
                  @click="handleViewExcelDetail(row)"
                >
                  <Document />
                </el-icon>
              </el-tooltip>
              <span class="text-xs text-gray-500"
                >{{ row.excelItemCount }}条</span
              >
            </div>
            <el-tooltip v-else content="上传Excel">
              <el-button
                link
                type="primary"
                :icon="Upload"
                @click="handleUploadExcel(row)"
              >
                上传
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="图片" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="row.imageUrl" content="点击查看图片">
              <el-icon
                :size="20"
                color="#409EFF"
                class="cursor-pointer debt-image-icon"
                @click="showDebtImagePreview(row.imageUrl)"
              >
                <Picture />
              </el-icon>
            </el-tooltip>
            <el-tooltip v-else content="上传图片">
              <el-button
                link
                type="primary"
                :icon="Upload"
                @click="handleUploadImage(row)"
              >
                上传
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="warning"
              :icon="Edit"
              @click="handleEditDebt(row)"
            >
              修改
            </el-button>
            <el-button
              link
              type="danger"
              :icon="Delete"
              @click="handleDeleteDebt(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 欠款明细分页 -->
      <div class="mt-4 flex justify-between items-center">
        <div class="text-sm text-gray-500">
          共 {{ debtPagination.total }} 条记录
        </div>
        <el-pagination
          v-model:current-page="debtPagination.page"
          v-model:page-size="debtPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="debtPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleDebtSizeChange"
          @current-change="handleDebtPageChange"
        />
      </div>
    </el-card>

    <!-- 付款记录列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">付款记录</span>
          <el-button type="success" :icon="Money" @click="handleAddPayment">
            新增付款
          </el-button>
        </div>
      </template>

      <el-table v-loading="paymentsLoading" :data="payments" border stripe>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column label="付款金额" width="130" align="right">
          <template #default="{ row }">
            <span class="text-green-600 font-bold">
              ¥{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="付款日期" width="120" align="center">
          <template #default="{ row }">
            {{ row.paymentDate }}
          </template>
        </el-table-column>
        <el-table-column label="付款类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.paymentType === '现金' ? 'success' : 'warning'">
              {{ row.paymentType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="凭证" width="100" align="center">
          <template #default="{ row }">
            <div
              v-if="row.voucher && row.voucher !== 'LOADING'"
              class="voucher-icon-container"
            >
              <!-- 可点击的图标 -->
              <el-icon
                :size="20"
                color="#409EFF"
                class="voucher-icon cursor-pointer"
                @click="
                  () => {
                    showVoucherPreview(row.voucher);
                  }
                "
              >
                <Picture />
              </el-icon>
            </div>
            <div v-else-if="row.voucher === 'LOADING'" class="voucher-loading">
              <el-icon :size="20" color="#E6A23C" class="is-loading">
                <Loading />
              </el-icon>
              <span class="loading-text">加载中...</span>
            </div>
            <span v-else class="text-gray-400">无</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="remark"
          label="备注"
          min-width="150"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="warning"
              :icon="Edit"
              @click="handleEditPayment(row)"
            >
              修改
            </el-button>
            <el-button
              link
              type="danger"
              :icon="Delete"
              @click="handleDeletePayment(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 付款记录分页 -->
      <div class="mt-4 flex justify-between items-center">
        <div class="text-sm text-gray-500">
          共 {{ paymentPagination.total }} 条记录
        </div>
        <el-pagination
          v-model:current-page="paymentPagination.page"
          v-model:page-size="paymentPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="paymentPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePaymentSizeChange"
          @current-change="handlePaymentPageChange"
        />
      </div>
    </el-card>

    <!-- 添加欠款对话框 -->
    <el-dialog
      v-model="addDebtDialogVisible"
      title="添加欠款"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="addDebtFormRef"
        :model="addDebtForm"
        :rules="addDebtRules"
        label-width="100px"
      >
        <el-form-item label="欠款金额" prop="amount">
          <el-input-number
            v-model="addDebtForm.amount"
            :min="0"
            :precision="0"
            :step="100"
            placeholder="请输入欠款金额"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="欠款日期" prop="debtDate">
          <el-date-picker
            v-model="addDebtForm.debtDate"
            type="date"
            placeholder="请选择欠款日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="欠款描述" prop="description">
          <el-input
            v-model="addDebtForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入欠款描述（如：原材料采购费用）"
          />
        </el-form-item>
        <el-form-item label="Excel文件">
          <el-upload
            :auto-upload="false"
            :on-change="handleExcelChange"
            :file-list="addDebtExcelFileList"
            :limit="1"
            accept=".xlsx,.xls"
          >
            <el-button :icon="Document">选择Excel文件</el-button>
          </el-upload>
          <div class="text-sm text-gray-500 mt-2">
            <p>
              可选：上传包含产品明细的Excel文件，系统将自动解析并关联到此欠款
            </p>
            <el-button
              link
              type="primary"
              :icon="Download"
              size="small"
              @click="handleDownloadTemplate"
            >
              下载Excel模板
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="图片凭证">
          <el-upload
            :auto-upload="false"
            :on-change="handleImageChange"
            :file-list="addDebtImageFileList"
            :limit="1"
            accept="image/*"
            list-type="picture-card"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="text-sm text-gray-500 mt-2">
            可选：上传欠款凭证图片（如采购单、收据等）
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDebtDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddDebtSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 修改欠款对话框 -->
    <el-dialog
      v-model="editDebtDialogVisible"
      title="修改欠款"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editDebtFormRef"
        :model="editDebtForm"
        :rules="editDebtRules"
        label-width="100px"
      >
        <el-form-item label="欠款金额" prop="amount">
          <el-input-number
            v-model="editDebtForm.amount"
            :min="0"
            :precision="0"
            :step="100"
            placeholder="请输入欠款金额"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="欠款日期" prop="debtDate">
          <el-date-picker
            v-model="editDebtForm.debtDate"
            type="date"
            placeholder="请选择欠款日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="欠款描述" prop="description">
          <el-input
            v-model="editDebtForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入欠款描述"
          />
        </el-form-item>
        <el-form-item label="图片凭证">
          <el-upload
            :auto-upload="false"
            :on-change="handleEditDebtImageChange"
            :file-list="editDebtImageFileList"
            :limit="1"
            accept="image/*"
            list-type="picture-card"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="text-sm text-gray-500 mt-2">
            可选：上传或更新欠款凭证图片
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDebtDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="editDebtSubmitting"
          :disabled="editDebtSubmitting"
          @click="handleEditDebtSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 付款对话框 -->
    <el-dialog
      v-model="paymentDialogVisible"
      :title="isEditPayment ? '修改付款' : '新增付款'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="paymentFormRef"
        :model="paymentForm"
        :rules="paymentRules"
        label-width="100px"
      >
        <el-form-item label="付款金额" prop="amount">
          <el-input-number
            v-model="paymentForm.amount"
            :min="0"
            :precision="0"
            :step="100"
            placeholder="请输入付款金额"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="付款日期" prop="paymentDate">
          <el-date-picker
            v-model="paymentForm.paymentDate"
            type="date"
            placeholder="选择付款日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="付款类型" prop="paymentType">
          <el-select
            v-model="paymentForm.paymentType"
            placeholder="请选择付款类型"
            style="width: 100%"
          >
            <el-option label="现金" value="现金" />
            <el-option label="承兑" value="承兑" />
          </el-select>
        </el-form-item>
        <el-form-item label="上传凭证">
          <el-upload
            v-model:file-list="voucherFileList"
            :auto-upload="false"
            :on-change="handleVoucherUpload"
            :on-remove="handleVoucherRemove"
            :limit="1"
            accept="image/*"
            list-type="picture-card"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="text-sm text-gray-500 mt-2">
            支持JPG、PNG格式图片（可选）
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="paymentForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="paymentSubmitting"
          :disabled="paymentSubmitting"
          @click="handlePaymentSubmit"
        >
          {{ isEditPayment ? "确定修改" : "确定新增" }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Excel上传对话框 -->
    <el-dialog
      v-model="uploadExcelDialogVisible"
      width="580px"
      :close-on-click-modal="false"
      align-center
    >
      <template #header>
        <div class="dialog-header-excel">
          <el-icon :size="24" color="#67C23A">
            <Document />
          </el-icon>
          <span class="dialog-title">上传Excel产品明细</span>
        </div>
      </template>

      <div class="excel-upload-wrapper">
        <!-- 上传区域 -->
        <div class="upload-section">
          <el-upload
            v-model:file-list="excelFileList"
            :auto-upload="false"
            :on-change="handleExcelFileChange"
            :limit="1"
            accept=".xlsx,.xls"
            drag
            class="excel-upload-drag"
          >
            <div class="upload-content">
              <el-icon class="upload-icon" :size="48" color="#67C23A">
                <UploadFilled />
              </el-icon>
              <div class="upload-text">
                <p class="main-text">点击或拖拽文件到此处上传</p>
                <p class="sub-text">支持 .xlsx、.xls 格式文件</p>
              </div>
            </div>
          </el-upload>
        </div>

        <!-- 分割线 -->
        <el-divider>
          <span style="font-size: 13px; color: #909399">或</span>
        </el-divider>

        <!-- 模板下载区域 -->
        <div class="template-section">
          <div class="template-info">
            <el-icon :size="20" color="#409EFF">
              <Document />
            </el-icon>
            <span class="template-text">首次上传？下载模板了解格式要求</span>
          </div>
          <el-button
            type="primary"
            :icon="Download"
            @click="handleDownloadTemplate"
          >
            下载模板
          </el-button>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="uploadExcelDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :icon="Upload"
            @click="handleExcelUploadSubmit"
          >
            确定上传
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 图片上传对话框 -->
    <el-dialog
      v-model="uploadImageDialogVisible"
      title="上传图片凭证"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-upload
        v-model:file-list="imageFileList"
        :auto-upload="false"
        :on-change="handleImageFileChange"
        :limit="1"
        accept="image/*"
        list-type="picture-card"
      >
        <el-icon><Plus /></el-icon>
      </el-upload>
      <div class="text-sm text-gray-500 mt-2">
        <p>支持JPG、PNG等图片格式</p>
        <p>图片将作为欠款凭证保存</p>
      </div>
      <template #footer>
        <el-button @click="uploadImageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImageUploadSubmit">
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

    <!-- 凭证图片预览组件 -->
    <el-image-viewer
      v-if="voucherPreviewVisible"
      :url-list="[voucherPreviewUrl]"
      :initial-index="0"
      :z-index="9999"
      @close="closeVoucherPreview"
    />

    <!-- 欠款明细图片预览组件 -->
    <el-image-viewer
      v-if="debtImagePreviewVisible"
      :url-list="[debtImagePreviewUrl]"
      :initial-index="0"
      :z-index="9999"
      @close="closeDebtImagePreview"
    />
  </div>
</template>

<style scoped lang="scss">
.supplier-detail-container {
  padding: 8px;
}

.top-header {
  display: flex;
  gap: 16px;
  align-items: center;

  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
}

.statistics-container {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 12px 0;

  .stat-item {
    flex: 1;
    text-align: center;

    .stat-label {
      margin-bottom: 8px;
      font-size: 14px;
      color: #909399;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
    }
  }

  .stat-divider {
    width: 1px;
    height: 40px;
    background-color: #dcdfe6;
  }
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-start;

  .card-title {
    font-size: 16px;
    font-weight: 600;
  }
}

.supplier-image-preview-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.image-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 80vh;
  padding: 16px;
  overflow: auto;
  background-color: #1f1f1f;
  border-radius: 4px;

  .image-preview {
    width: 100%;
    max-height: 80vh;
  }

  .image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #909399;
  }
}

// Excel上传对话框样式
.dialog-header-excel {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 0;

  .dialog-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
}

.excel-upload-wrapper {
  padding: 10px 0 20px;

  .upload-section {
    .excel-upload-drag {
      :deep(.el-upload-dragger) {
        padding: 40px 20px;
        background-color: #fafafa;
        border: 2px dashed #d9d9d9;
        border-radius: 8px;
        transition: all 0.3s;

        &:hover {
          background-color: #f0f9ff;
          border-color: #67c23a;
        }
      }

      .upload-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-items: center;

        .upload-icon {
          transition: transform 0.3s;
        }

        &:hover .upload-icon {
          transform: scale(1.1);
        }

        .upload-text {
          text-align: center;

          .main-text {
            margin: 0 0 8px;
            font-size: 16px;
            font-weight: 500;
            color: #303133;
          }

          .sub-text {
            margin: 0;
            font-size: 13px;
            color: #909399;
          }
        }
      }
    }
  }

  .template-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(135deg, #f5f7fa 0%, #ecf5ff 100%);
    border: 1px solid #e4e7ed;
    border-radius: 8px;

    .template-info {
      display: flex;
      gap: 10px;
      align-items: center;

      .template-text {
        font-size: 14px;
        font-weight: 500;
        color: #606266;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
// 凭证图标样式
.voucher-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

.voucher-icon {
  transition: all 0.3s ease;

  &:hover {
    color: #337ecc;
    transform: scale(1.1);
  }
}

.cursor-pointer {
  cursor: pointer;
}

.voucher-loading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;

  .loading-text {
    font-size: 10px;
    color: #e6a23c;
  }
}

.image-slot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  padding: 8px;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  border: 1px dashed #e4e7ed;
  border-radius: 4px;
}

// 欠款明细图片图标样式
.debt-image-icon {
  transition: all 0.3s ease;

  &:hover {
    color: #337ecc;
    transform: scale(1.1);
  }
}
</style>
