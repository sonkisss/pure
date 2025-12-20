<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  computed,
  watchEffect,
  defineComponent,
  PropType,
  watch,
  nextTick
} from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Check, InfoFilled, Plus, Document } from "@element-plus/icons-vue";
import { type UploadFile, type UploadProps } from "element-plus";
import { getAllCompanies, type Company } from "@/api/business";
import { formatMoney } from "@/utils/format";
import {
  getSalesInvoices,
  getPurchaseInvoices,
  createSalesInvoice,
  createPurchaseInvoice,
  updateSalesInvoice,
  updatePurchaseInvoice,
  deleteSalesInvoice as deleteSalesInvoiceAPI,
  deletePurchaseInvoice as deletePurchaseInvoiceAPI,
  deleteInvoiceFile as deleteInvoiceFileAPI,
  uploadInvoiceFile,
  getInvoicePublicUrl,
  getPendingPurchaseInvoiceCount,
  type SalesInvoice,
  type PurchaseInvoice
} from "@/api/invoice";
import { extractOssObjectPath } from "@/services/storage";

defineOptions({
  name: "InvoiceManagement"
});

// 测试环境下跳过进度定时器，避免单测悬挂
const isTestEnv =
  (typeof process !== "undefined" && Boolean((process as any).env?.VITEST)) ||
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.MODE === "test");
const createProgressInterval = (cb: () => void, delay = 200) => {
  if (isTestEnv) return null;
  return setInterval(cb, delay);
};
const clearProgressInterval = (timer: NodeJS.Timeout | number | null) => {
  if (timer) clearInterval(timer as any);
};

// 当前激活的标签页
const activeTab = ref("sales");

// 公司统计数据
const companyStats = ref<any[]>([]);
const updatingStats = ref(false);

// 选中的公司ID
const selectedCompanyId = ref<number | null>(null);

// 所有公司列表（用于下拉选择）
const allCompanies = ref<Company[]>([]);

// 年份和月份选择
const selectedYear = ref<number>(new Date().getFullYear());
const selectedMonth = ref<number>(new Date().getMonth() + 1);

// 获取当前月份显示文本（用于统计卡片）
const currentMonth = computed(() => {
  if (selectedMonth.value) {
    return `${selectedMonth.value}月`;
  } else {
    return `${selectedYear.value}年`;
  }
});

// 获取月份选择器按钮显示文本
const monthSelectorDisplay = computed(() => {
  return selectedMonth.value ? `${selectedMonth.value}月` : "全部月份";
});

// 生成年份选项
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  // 添加最近5年
  for (let i = 0; i <= 4; i++) {
    years.push(currentYear - i);
  }
  return years;
});

// 月份选择器数据和方法
const monthOptions = [
  { label: "1月", value: 1 },
  { label: "2月", value: 2 },
  { label: "3月", value: 3 },
  { label: "4月", value: 4 },
  { label: "5月", value: 5 },
  { label: "6月", value: 6 },
  { label: "7月", value: 7 },
  { label: "8月", value: 8 },
  { label: "9月", value: 9 },
  { label: "10月", value: 10 },
  { label: "11月", value: 11 },
  { label: "12月", value: 12 }
];

// 月份选择器展开状态
const monthSelectorVisible = ref(false);

// 加载状态
const loading = ref(false);

// 文件上传状态跟踪
const uploadingRows = ref(new Set()); // 跟踪正在上传的行ID
const dialogUploading = ref(false); // 对话框中的上传状态
// 私有桶强制使用签名 URL，避免 AccessDenied
const ossPublicRead = false;

// 切换月份选择器显示状态
const toggleMonthSelector = () => {
  monthSelectorVisible.value = !monthSelectorVisible.value;
};

// 选择月份并关闭选择器，如果点击已选中的月份则撤销选择
const selectMonth = (monthValue: number) => {
  if (selectedMonth.value === monthValue) {
    // 如果点击的是已选中的月份，则撤销选择
    selectedMonth.value = undefined;
  } else {
    // 选择新的月份
    selectedMonth.value = monthValue;
  }
  monthSelectorVisible.value = false;
};

// 计算预估缴税（基于参数传入的数据）
const calculateEstimatedTaxFromData = (
  salesAmount: number,
  purchaseAmount: number
) => {
  // 计算应纳税额（销项 - 进项）
  const taxableAmount = Math.max(0, salesAmount - purchaseAmount);

  // 增值税（13%）
  // 公式调整：÷ (1 + 13%) × 13%
  const vat = (taxableAmount / 1.13) * 0.13;

  // 附加税费（按市区标准计算）
  const urbanConstructionTax = (vat * 0.07) / 2; // 城建税 7%减半征收 = 3.5%
  const educationFee = (vat * 0.03) / 2; // 教育费附加 3%减半征收 = 1.5%
  const localEducationFee = (vat * 0.02) / 2; // 地方教育附加 2%减半征收 = 1%

  // 印花税（按销售收入的万分之三计算，减半征收）
  const stampTax = (salesAmount * 0.0003) / 2;

  // 水利建设基金（按增值税的1%计算，减半征收）
  const waterConstructionFund = (vat * 0.01) / 2;

  // 总税额
  const totalTax =
    vat +
    urbanConstructionTax +
    educationFee +
    localEducationFee +
    stampTax +
    waterConstructionFund;

  return {
    vat: Math.round(vat * 100) / 100,
    urbanConstructionTax: Math.round(urbanConstructionTax * 100) / 100,
    educationFee: Math.round(educationFee * 100) / 100,
    localEducationFee: Math.round(localEducationFee * 100) / 100,
    stampTax: Math.round(stampTax * 100) / 100,
    waterConstructionFund: Math.round(waterConstructionFund * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    // 生成详细计算过程
    breakdown: `增值税: ${taxableAmount.toFixed(2).replace(/,/g, "")} ÷ 1.13 × 13% = ${vat.toFixed(2).replace(/,/g, "")}
城建税: ${vat.toFixed(2).replace(/,/g, "")} × 7% ÷ 2 = ${urbanConstructionTax.toFixed(2).replace(/,/g, "")}
教育费: ${vat.toFixed(2).replace(/,/g, "")} × 3% ÷ 2 = ${educationFee.toFixed(2).replace(/,/g, "")}
地方教育: ${vat.toFixed(2).replace(/,/g, "")} × 2% ÷ 2 = ${localEducationFee.toFixed(2).replace(/,/g, "")}
印花税: ${salesAmount.toFixed(2).replace(/,/g, "")} × 0.3‰ ÷ 2 = ${stampTax.toFixed(2).replace(/,/g, "")}
水利基金: ${vat.toFixed(2).replace(/,/g, "")} × 1% ÷ 2 = ${waterConstructionFund.toFixed(2).replace(/,/g, "")}
合计税额: ${totalTax.toFixed(2).replace(/,/g, "")}`
  };
};

// 格式化税额计算明细，将合计税额标红
const formatTaxBreakdown = (breakdown: string) => {
  if (!breakdown) return "";

  // 将最后一行的合计税额标红
  const lines = breakdown.split("\n");
  const lastLine = lines[lines.length - 1];

  if (lastLine && lastLine.includes("合计税额:")) {
    const redLastLine = `<span style="color: #ff4757; font-weight: bold;">${lastLine}</span>`;
    lines[lines.length - 1] = redLastLine;
    return lines.join("\n");
  }

  return breakdown;
};

// 更新公司统计数据
const updateCompanyStats = async () => {
  if (updatingStats.value) return;
  updatingStats.value = true;
  if (companyStats.value.length === 0) {
    updatingStats.value = false;
    return;
  }

  companyStats.value = await Promise.all(
    companyStats.value.map(async company => {
      // 根据筛选器计算实际的销项和进项
      const actualSales = allSalesInvoices.value
        .filter(invoice => {
          const isRelatedCompany = invoice.sellerId === company.companyId;
          const invoiceDate = new Date(invoice.invoiceDate);
          const invoiceYear = invoiceDate.getFullYear();
          const invoiceMonth = invoiceDate.getMonth() + 1;
          const isYearMatch = invoiceYear === selectedYear.value;
          const isMonthMatch =
            !selectedMonth.value || invoiceMonth === selectedMonth.value;
          return isRelatedCompany && isYearMatch && isMonthMatch;
        })
        .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

      const actualPurchase = allPurchaseInvoices.value
        .filter(invoice => {
          const isRelatedCompany = invoice.buyerId === company.companyId;
          const paymentDate = new Date(invoice.paymentDate);
          const paymentYear = paymentDate.getFullYear();
          const paymentMonth = paymentDate.getMonth() + 1;
          const isYearMatch = paymentYear === selectedYear.value;
          const isMonthMatch =
            !selectedMonth.value || paymentMonth === selectedMonth.value;
          const isInvoiceIssued = invoice.invoiceIssued === true; // 只统计已开回发票
          return (
            isRelatedCompany && isYearMatch && isMonthMatch && isInvoiceIssued
          );
        })
        .reduce((sum, invoice) => sum + invoice.paymentAmount, 0);

      // 从数据库获取未开进项发票数量
      const pendingCountResult = await getPendingPurchaseInvoiceCount(
        company.companyId,
        selectedYear.value || undefined,
        selectedMonth.value || undefined
      );
      const pendingPurchaseCount = pendingCountResult.success
        ? pendingCountResult.data
        : 0;

      // 计算新的预估缴税
      const taxData = calculateEstimatedTaxFromData(
        actualSales,
        actualPurchase
      );

      return {
        ...company,
        monthlySales: actualSales,
        monthlyPurchase: actualPurchase,
        pendingPurchaseCount: pendingPurchaseCount,
        estimatedTax: taxData.totalTax,
        taxBreakdown: taxData.breakdown
      };
    })
  );
  updatingStats.value = false;
};

// 监听年份和月份变化，重新计算公司统计数据
watch([selectedYear, selectedMonth], () => {
  updateCompanyStats();
});

// 将存储的路径/历史 URL 转为可访问的签名地址
const resolveInvoiceUrl = async (
  rawPath?: string | null,
  options?: { inline?: boolean; fileName?: string }
) => {
  if (!rawPath) return "";

  // 提取 OSS 对象路径
  const extractObjectPath = (value: string) => {
    if (!value) return "";

    // 兼容历史数据中被 encode 后的 URL
    if (value.includes("%3A") || value.includes("%2F")) {
      try {
        value = decodeURIComponent(value);
      } catch (error) {
        // ignore decode errors and keep original value
      }
    }

    // 处理 Supabase 存储公共 URL -> 提取对象路径
    if (value.startsWith("http") && value.includes("supabase.co")) {
      try {
        const urlObj = new URL(value);
        const marker = "/storage/v1/object/public/";
        const idx = urlObj.pathname.indexOf(marker);
        if (idx !== -1) {
          const pathPart = urlObj.pathname.slice(idx + marker.length); // invoices/...
          return decodeURIComponent(pathPart);
        }
      } catch (error) {
        console.warn("解析 Supabase URL 失败，使用原值", error);
      }
      return value;
    }

    // 处理 OSS 链接（包含自定义域名），提取 object path 后重新签名
    if (value.startsWith("http")) {
      const cleanValue = value.split("?")[0];
      const extracted = extractOssObjectPath(cleanValue);
      if (extracted) return extracted;
      return value;
    }

    // 非 http 直接去掉前导 /
    return value.startsWith("/") ? value.slice(1) : value;
  };

  const objectPath = extractObjectPath(rawPath);
  if (!objectPath) return rawPath || "";

  const normalizedPath = objectPath.startsWith("invoices/")
    ? objectPath.slice("invoices/".length)
    : objectPath;

  const fileName =
    options?.fileName ||
    normalizedPath.split("/").pop() ||
    "invoice.pdf";

  const { data, error } = await getInvoicePublicUrl(normalizedPath, {
    inline: options?.inline ?? true,
    fileName
  });
  if (error || !data?.signedUrl) {
    throw error || new Error("发票签名URL生成失败");
  }
  return data.signedUrl;
};

// 将任意 URL/路径规范化为存储用的对象路径（避免将长签名 URL 写入数据库）
const extractInvoicePathForSave = (value?: string | null) => {
  if (!value) return "";
  let normalized = value;

  // 解码已编码的 URL
  if (normalized.includes("%3A") || normalized.includes("%2F")) {
    try {
      normalized = decodeURIComponent(normalized);
    } catch {
      // ignore decode errors
    }
  }

  // 处理 Supabase 公共 URL
  if (normalized.startsWith("http") && normalized.includes("supabase.co")) {
    try {
      const urlObj = new URL(normalized);
      const marker = "/storage/v1/object/public/";
      const idx = urlObj.pathname.indexOf(marker);
      if (idx !== -1) {
        normalized = urlObj.pathname.slice(idx + marker.length); // invoices/...
      } else {
        normalized = urlObj.pathname.startsWith("/")
          ? urlObj.pathname.slice(1)
          : urlObj.pathname;
      }
    } catch {
      // keep normalized
    }
  } else if (normalized.startsWith("http") && normalized.includes("aliyuncs.com")) {
    // 处理 OSS 链接（带或不带签名）
    try {
      const urlObj = new URL(normalized);
      normalized = urlObj.pathname.startsWith("/")
        ? urlObj.pathname.slice(1)
        : urlObj.pathname;
    } catch {
      // keep normalized
    }
  }

  // 去除可能的 invoices/ 前缀，存储只保留对象路径
  if (normalized.startsWith("invoices/")) {
    normalized = normalized.slice("invoices/".length);
  }
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }
  return normalized;
};

// 从Supabase加载发票数据
const loadInvoiceData = async () => {
  loading.value = true;
  try {
    // 加载销售发票
    const salesResult = await getSalesInvoices();
    if (salesResult.success && salesResult.data) {
      const salesWithUrl = await Promise.all(
        salesResult.data.map(async invoice => {
          const resolvedUrl = await resolveInvoiceUrl(invoice.invoice_url);
          return {
            id: invoice.id,
            sellerName: invoice.seller_name,
            buyerName: invoice.buyer_name,
            totalAmount: invoice.total_amount,
            invoiceDate: invoice.invoice_date,
            invoiceUrl: resolvedUrl,
            invoicePath: invoice.invoice_url,
            invoice_file_name: invoice.invoice_file_name,
            invoiceFile:
              invoice.invoice_file_name && resolvedUrl
                ? {
                    name: invoice.original_file_name || invoice.invoice_file_name,
                    url: resolvedUrl
                  }
                : null,
            sellerId: invoice.seller_id,
            buyerId: invoice.buyer_id
          };
        })
      );
      allSalesInvoices.value = salesWithUrl;
    }

    // 加载进项发票
    const purchaseResult = await getPurchaseInvoices();
    if (purchaseResult.success && purchaseResult.data) {
      const purchaseWithUrl = await Promise.all(
        purchaseResult.data.map(async invoice => {
          const resolvedUrl = await resolveInvoiceUrl(invoice.invoice_url);
          return {
            id: invoice.id,
            sellerName: invoice.seller_name,
            buyerName: invoice.buyer_name,
            paymentAmount: invoice.payment_amount,
            paymentDate: invoice.payment_date,
            invoiceType: invoice.invoice_type,
            invoiceIssued: invoice.invoice_issued,
            invoiceUrl: resolvedUrl,
            invoicePath: invoice.invoice_url,
            invoice_file_name: invoice.invoice_file_name,
            invoiceFile:
              invoice.invoice_file_name && resolvedUrl
                ? {
                    name: invoice.original_file_name || invoice.invoice_file_name,
                    url: resolvedUrl
                  }
                : null,
            sellerId: invoice.seller_id,
            buyerId: invoice.buyer_id
          };
        })
      );
      allPurchaseInvoices.value = purchaseWithUrl;
    }
  } catch (error) {
    console.error("加载发票数据失败:", error);
    ElMessage.error("加载发票数据失败");
  } finally {
    loading.value = false;
    // 数据加载完成后更新统计数据
    await updateCompanyStats();
  }
};

// 所有销售发票数据（从Supabase加载）
const allSalesInvoices = ref([]);

// 根据选中公司、年份和月份筛选的销售发票
const salesInvoices = computed(() => {
  return allSalesInvoices.value.filter(invoice => {
    // 按公司筛选
    const isCompanyMatch =
      !selectedCompanyId.value ||
      invoice.sellerId === selectedCompanyId.value ||
      invoice.buyerId === selectedCompanyId.value;

    // 按年份月份筛选
    const invoiceDate = new Date(invoice.invoiceDate);
    const invoiceYear = invoiceDate.getFullYear();
    const invoiceMonth = invoiceDate.getMonth() + 1;
    const isYearMatch =
      !selectedYear.value || invoiceYear === selectedYear.value;
    const isMonthMatch =
      !selectedMonth.value || invoiceMonth === selectedMonth.value;

    return isCompanyMatch && isYearMatch && isMonthMatch;
  });
});

// 计算销售发票的序号
const salesInvoiceIndex = (index: number) => {
  return index + 1;
};

// 所有进项发票数据（从Supabase加载）
const allPurchaseInvoices = ref([]);

// 根据选中公司、年份和月份筛选的进项发票
const purchaseInvoices = computed(() => {
  return allPurchaseInvoices.value.filter(invoice => {
    // 按公司筛选
    const isCompanyMatch =
      !selectedCompanyId.value || invoice.buyerId === selectedCompanyId.value;

    // 按年份月份筛选
    const paymentDate = new Date(invoice.paymentDate);
    const paymentYear = paymentDate.getFullYear();
    const paymentMonth = paymentDate.getMonth() + 1;
    const isYearMatch =
      !selectedYear.value || paymentYear === selectedYear.value;
    const isMonthMatch =
      !selectedMonth.value || paymentMonth === selectedMonth.value;

    return isCompanyMatch && isYearMatch && isMonthMatch;
  });
});

// 计算进项发票的序号
const purchaseInvoiceIndex = (index: number) => {
  return index + 1;
};

// 加载公司数据
const loadCompanyData = async () => {
  try {
    const res = await getAllCompanies(1); // 获取启用的公司
    console.log("API返回的数据:", res); // 调试日志

    // 直接使用返回的数据，不加success判断
    if (res && res.data && Array.isArray(res.data)) {
      // 保存所有公司数据用于下拉选择
      allCompanies.value = res.data;

      // 为每个公司添加模拟的统计数据
      companyStats.value = res.data.slice(0, 3).map((company: Company) => {
        const companyId = company.id;

        // 创建公司对象
        const stats = {
          companyId: companyId,
          companyName: company.company_name,
          monthlySales: 0, // 初始为0，会通过updateCompanyStats更新
          monthlyPurchase: 0, // 初始为0，会通过updateCompanyStats更新
          pendingPurchaseCount: 0, // 初始为0，会通过updateCompanyStats更新
          estimatedTax: 0, // 初始为0，会通过updateCompanyStats更新
          taxBreakdown: "" // 初始为空，会通过updateCompanyStats更新
        };

        return stats;
      });
    } else {
      throw new Error("数据格式错误");
    }
  } catch (error) {
    console.error("加载公司数据失败:", error);
    // 如果API调用失败，使用默认数据
    allCompanies.value = [
      { id: 1, company_name: "默认公司一", status: 1 },
      { id: 2, company_name: "默认公司二", status: 1 },
      { id: 3, company_name: "默认公司三", status: 1 }
    ];
    companyStats.value = [
      {
        companyId: 1,
        companyName: "默认公司一",
        monthlySales: 339000,
        monthlyPurchase: 123000,
        pendingPurchaseCount: 3,
        estimatedTax: 30156.83,
        taxBreakdown:
          "增值税: 216000.00 × 13% = 28080.00\n城建税: 28080.00 × 7% = 1965.60\n教育费: 28080.00 × 3% = 842.40\n地方教育: 28080.00 × 2% = 561.60\n印花税: 339000.00 × 0.3‰ = 101.70\n水利基金: 28080.00 × 1% = 280.80\n合计税额: 30156.83"
      },
      {
        companyId: 2,
        companyName: "默认公司二",
        monthlySales: 395500,
        monthlyPurchase: 56300,
        pendingPurchaseCount: 5,
        estimatedTax: 47732.4,
        taxBreakdown:
          "增值税: 339200.00 × 13% = 44096.00\n城建税: 44096.00 × 7% = 3086.72\n教育费: 44096.00 × 3% = 1322.88\n地方教育: 44096.00 × 2% = 881.92\n印花税: 395500.00 × 0.3‰ = 118.65\n水利基金: 44096.00 × 1% = 440.96\n合计税额: 47732.40"
      },
      {
        companyId: 3,
        companyName: "默认公司三",
        monthlySales: 536750,
        monthlyPurchase: 345000,
        pendingPurchaseCount: 2,
        estimatedTax: 28899.13,
        taxBreakdown:
          "增值税: 191750.00 × 13% = 24927.50\n城建税: 24927.50 × 7% = 1744.93\n教育费: 24927.50 × 3% = 747.83\n地方教育: 24927.50 × 2% = 498.55\n印花税: 536750.00 × 0.3‰ = 161.03\n水利基金: 24927.50 × 1% = 249.28\n合计税额: 28899.13"
      }
    ];
  }

  // 初始化完成后，更新统计数据
  updateCompanyStats();
};

// 标签页切换
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName;
};

// 切换公司选择状态
const toggleCompanySelection = (companyId: number) => {
  if (selectedCompanyId.value === companyId) {
    // 如果已经选中，则取消选择
    selectedCompanyId.value = null;
  } else {
    // 否则选中该公司
    selectedCompanyId.value = companyId;
  }
};

// 获取选中公司的信息
const getSelectedCompanyInfo = () => {
  if (!selectedCompanyId.value) return null;
  return companyStats.value.find(
    company => company.companyId === selectedCompanyId.value
  );
};

// 处理销售方选择变化
const handleSellerChange = (companyId: number) => {
  const company = allCompanies.value.find(c => c.id === companyId);
  if (company) {
    editForm.value.sellerName = company.company_name;
    editForm.value.sellerId = companyId;
  }
};

// 处理购买方选择变化
const handleBuyerChange = (companyId: number) => {
  const company = allCompanies.value.find(c => c.id === companyId);
  if (company) {
    editForm.value.buyerName = company.company_name;
    editForm.value.buyerId = companyId;
  }
};

// 新增销售发票
const addSalesInvoice = async () => {
  editType.value = "sales";
  editDialogTitle.value = "新增销售发票";

  // 先初始化表单
  editForm.value = {
    id: null, // 新增时id为null
    sellerId: null, // 销售方ID，将由下拉选择设置
    sellerName: "", // 销售方名称
    buyerId: null, // 购买方ID，不使用下拉列表
    buyerName: "", // 购买方名称，由用户手动输入
    totalAmount: null,
    invoiceDate: new Date().toISOString().split("T")[0], // 默认今天
    invoiceFileName: "", // 发票文件名
    invoiceUrl: "", // 发票文件URL
    invoice_file_name: "" // 数据库字段名
  };

  // 确保公司数据已加载
  console.log("🚀 新增销售发票开始，检查公司数据");
  if (allCompanies.value.length === 0) {
    console.log("公司数据为空，重新加载...");
    const res = await getAllCompanies(1);
    console.log("📊 获取到的公司数据:", res);

    if (res && res.data && Array.isArray(res.data)) {
      allCompanies.value = res.data;
      console.log("✅ allCompanies已更新，数量:", allCompanies.value.length);
      console.log(
        "📋 公司名称列表:",
        allCompanies.value.map(c => c.company_name)
      );
    } else {
      console.error("❌ 获取公司数据失败:", res);
      ElMessage.error("获取公司数据失败");
      return;
    }
  } else {
    console.log("✅ 公司数据已存在，数量:", allCompanies.value.length);
  }

  // 设置默认选中公司
  if (selectedCompanyId.value) {
    editForm.value.sellerId = selectedCompanyId.value;
    const selectedCompany = allCompanies.value.find(
      c => c.id === selectedCompanyId.value
    );
    if (selectedCompany) {
      editForm.value.sellerName = selectedCompany.company_name;
    }
  }

  // 使用nextTick确保数据更新完成后再显示对话框
  await nextTick();
  editDialogVisible.value = true;
  console.log(
    "🎯 对话框已显示，当前allCompanies数量:",
    allCompanies.value.length
  );
  console.log("📋 当前表单sellerId:", editForm.value.sellerId);
};

// 新增进项发票
const addPurchaseInvoice = async () => {
  editType.value = "purchase";
  editDialogTitle.value = "新增进项发票";

  // 先初始化表单
  editForm.value = {
    id: null, // 新增时id为null
    sellerId: null, // 销售方ID，不使用下拉列表
    sellerName: "", // 销售方名称，由用户手动输入
    buyerId: null, // 购买方ID，将由下拉选择设置
    buyerName: "", // 购买方名称
    paymentAmount: null,
    paymentDate: new Date().toISOString().split("T")[0], // 默认今天
    invoiceType: "专票", // 默认专票
    invoiceIssued: false, // 新增时默认未开票
    invoiceFileName: "", // 发票文件名
    invoiceUrl: "", // 发票文件URL
    invoice_file_name: "" // 数据库字段名
  };

  // 确保公司数据已加载
  console.log("🚀 新增进项发票开始，检查公司数据");
  if (allCompanies.value.length === 0) {
    console.log("公司数据为空，重新加载...");
    const res = await getAllCompanies(1);
    console.log("📊 获取到的公司数据:", res);

    if (res && res.data && Array.isArray(res.data)) {
      allCompanies.value = res.data;
      console.log("✅ allCompanies已更新，数量:", allCompanies.value.length);
      console.log(
        "📋 公司名称列表:",
        allCompanies.value.map(c => c.company_name)
      );
    } else {
      console.error("❌ 获取公司数据失败:", res);
      ElMessage.error("获取公司数据失败");
      return;
    }
  } else {
    console.log("✅ 公司数据已存在，数量:", allCompanies.value.length);
  }

  // 设置默认选中公司
  if (selectedCompanyId.value) {
    editForm.value.buyerId = selectedCompanyId.value;
    const selectedCompany = allCompanies.value.find(
      c => c.id === selectedCompanyId.value
    );
    if (selectedCompany) {
      editForm.value.buyerName = selectedCompany.company_name;
    }
  }

  // 使用nextTick确保数据更新完成后再显示对话框
  await nextTick();
  editDialogVisible.value = true;
  console.log(
    "🎯 对话框已显示，当前allCompanies数量:",
    allCompanies.value.length
  );
  console.log("📋 当前表单buyerId:", editForm.value.buyerId);
};

// 销售发票 - 文件上传前的处理
const beforeUploadInvoice = (file: File) => {
  const isPDF = file.type === "application/pdf";
  const isLt10M = file.size / 1024 / 1024 < 10;

  if (!isPDF) {
    ElMessage.error("只能上传PDF格式的发票文件！");
    return false;
  }
  if (!isLt10M) {
    ElMessage.error("发票文件大小不能超过10MB！");
    return false;
  }
  return true;
};

// 强制重新编译 - 临时测试
console.log("=== Invoice component script setup is working ===");

// 销售发票 - 自定义上传方法
const customUpload = async (options: any, row: any) => {
  const { file, onProgress, onSuccess, onError } = options;
  const rowId = row.id || `temp_${Date.now()}`; // 为新行生成临时ID

  try {
    console.log("🚀 自定义上传开始:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      rowId
    });

    // 添加到上传状态跟踪
    uploadingRows.value.add(rowId);

    // 显示上传开始消息
    ElMessage.info({
      message: `正在上传发票文件: ${file.name}`,
      duration: 2000
    });

    // 模拟上传进度
    const progressInterval = createProgressInterval(() => {
      const progress = Math.random() * 90 + 10; // 10-100的随机进度
      onProgress({ percent: progress }, file);
    }, 200);

    // 调用上传API
    const result = await uploadInvoiceFile(file, file.name, "sales");

    // 清除进度模拟
    clearProgressInterval(progressInterval as any);
    onProgress({ percent: 100 }, file);

    if (!result.success) {
      console.error("❌ 自定义上传失败:", result.error);
      ElMessage.error(`上传失败: ${result.error || "文件上传失败"}`);
      onError(result.error || new Error("文件上传失败"));
      return;
    }

    console.log("✅ 自定义上传成功:", result.data);

    // 本地校验：仅允许 PDF，避免远程请求因 OSS 权限导致误判
    const isPdfFile =
      (file.type && file.type.toLowerCase().includes("pdf")) ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfFile) {
      console.error("❌ 文件类型验证失败:", file.type);
      ElMessage.error("上传失败: 仅支持 PDF 文件");
      onError(new Error("文件类型错误"));
      return;
    }

    // 更新行数据
    const filePath = result.data?.path || "";
    const fileUrl = result.data?.signedUrl || result.data?.url || "";

    row.invoice_url = filePath;
    row.invoicePath = filePath;
    row.invoice_file_name = result.data?.fileName || file.name;
    row.invoiceFile = result.data
      ? {
          name: file.name,
          url: fileUrl
        }
      : null;

    // 更新数据库
    if (row.id) {
      await updateSalesInvoice(row.id, {
        invoice_url: filePath,
        invoice_file_name: result.data?.fileName || file.name,
        original_file_name: file.name
      });
    }

    // 显示成功消息
    ElMessage.success({
      message: `发票文件上传成功: ${file.name}`,
      duration: 3000
    });

    // 调用成功回调
    onSuccess(
      {
        url: fileUrl,
        fileName: result.data?.fileName || file.name
      },
      file
    );
  } catch (error) {
    console.error("❌ 自定义上传异常:", error);
    const errorMessage =
      error instanceof Error ? error.message : "上传过程中发生未知错误";

    ElMessage.error({
      message: `上传失败: ${errorMessage}`,
      duration: 5000
    });

    onError(new Error(errorMessage));
  } finally {
    // 从上传状态跟踪中移除
    uploadingRows.value.delete(rowId);
  }
};

// 进项发票自定义上传函数
const customPurchaseUpload = async (options: any, row: any) => {
  const { file, onProgress, onSuccess, onError } = options;
  const rowId = row.id || `temp_${Date.now()}`; // 为新行生成临时ID

  try {
    console.log("🚀 进项发票自定义上传开始:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      rowId
    });

    // 添加到上传状态跟踪
    uploadingRows.value.add(rowId);

    // 显示上传开始消息
    ElMessage.info({
      message: `正在上传发票文件: ${file.name}`,
      duration: 2000
    });

    // 模拟上传进度
    const progressInterval = createProgressInterval(() => {
      const progress = Math.random() * 90 + 10; // 10-100的随机进度
      onProgress({ percent: progress }, file);
    }, 200);

    // 调用上传API（进项发票）
    const result = await uploadInvoiceFile(file, file.name, "purchase");

    // 清除进度模拟
    clearProgressInterval(progressInterval as any);
    onProgress({ percent: 100 }, file);

    if (!result.success) {
      console.error("❌ 进项发票自定义上传失败:", result.error);
      ElMessage.error(`上传失败: ${result.error || "文件上传失败"}`);
      onError(result.error || new Error("文件上传失败"));
      return;
    }

    console.log("✅ 进项发票自定义上传成功:", result.data);

    // 本地校验：仅允许 PDF，避免远程请求因 OSS 权限导致误判
    const isPdfFile =
      (file.type && file.type.toLowerCase().includes("pdf")) ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfFile) {
      console.error("❌ 文件类型验证失败:", file.type);
      ElMessage.error("上传失败: 仅支持 PDF 文件");
      onError(new Error("文件类型错误"));
      return;
    }

    const filePath = result.data?.path || "";
    const fileUrl = result.data?.signedUrl || result.data?.url || "";

    // 更新行数据
    row.invoice_url = filePath;
    row.invoicePath = filePath;
    row.invoice_file_name = result.data?.fileName || file.name;
    row.invoiceFile = result.data
      ? {
          name: file.name,
          url: fileUrl
        }
      : null;
    row.invoiceIssued = true; // 上传文件时自动设置为已开票

    // 更新数据库 - 上传文件时自动设置为已开票
    if (row.id) {
      await updatePurchaseInvoice(row.id, {
        invoice_url: filePath,
        invoice_file_name: result.data?.fileName || file.name,
        original_file_name: file.name,
        invoice_issued: true // 上传文件时自动设置为已开票
      });
    }

    // 显示成功消息
    ElMessage.success({
      message: `发票文件上传成功: ${file.name}`,
      duration: 3000
    });

    // 调用成功回调
    onSuccess(
      {
        url: fileUrl,
        fileName: result.data?.fileName || file.name
      },
      file
    );
  } catch (error) {
    console.error("❌ 进项发票上传异常:", error);
    const errorMessage =
      error instanceof Error ? error.message : "上传过程中发生未知错误";

    ElMessage.error({
      message: `上传失败: ${errorMessage}`,
      duration: 5000
    });

    onError(new Error(errorMessage));
  } finally {
    // 从上传状态跟踪中移除
    uploadingRows.value.delete(rowId);
  }
};

// 销售发票 - 文件上传成功处理
const handleInvoiceUploadSuccess = async (
  response: any,
  uploadFile: UploadFile,
  row: any
) => {
  try {
    if (!uploadFile.raw) {
      ElMessage.error("文件获取失败");
      return;
    }

    console.log("🚀 开始上传销售发票文件:", {
      fileName: uploadFile.name,
      fileSize: uploadFile.size,
      fileType: uploadFile.raw?.type
    });

    // 上传到 Supabase 存储
    const result = await uploadInvoiceFile(
      uploadFile.raw,
      uploadFile.name,
      "sales"
    );

    if (!result.success) {
      console.error("❌ 上传失败:", result.error);
      ElMessage.error(`发票上传失败: ${result.error?.message || "未知错误"}`);
      return;
    }

    console.log("✅ 发票上传成功:", result.data);

    const filePath = result.data?.path || "";
    const fileUrl = result.data?.signedUrl || result.data?.url || "";

    // 更新行数据
    row.invoice_url = filePath;
    row.invoicePath = filePath;
    row.invoice_file_name = result.data?.fileName || uploadFile.name;
    row.original_file_name = result.data?.originalName || uploadFile.name;

    // 如果是已保存的记录，更新到数据库
    if (row.id) {
      await updateSalesInvoice(row.id, {
        invoice_file_name: result.data?.fileName || uploadFile.name,
        invoice_url: filePath
      });
    }

    ElMessage.success("发票上传成功");
  } catch (error) {
    console.error("❌ 上传处理失败:", error);
    const errorMessage =
      error instanceof Error ? error.message : "发票上传处理失败";
    ElMessage.error(errorMessage);
  }
};

// 销售发票 - 预览发票
const previewInvoice = async (row: any) => {
  try {
    // 优先使用路径生成新的签名URL，避免过期，并指定 inline 预览
    const invoicePath = row.invoicePath || row.invoice_url;
    const invoiceUrl =
      invoicePath || row.invoiceUrl || row.invoiceFile?.url
        ? await resolveInvoiceUrl(
            invoicePath || row.invoiceUrl || row.invoiceFile?.url,
            {
              inline: true,
              fileName:
                row.invoice_file_name ||
                row.invoiceFile?.name ||
                (invoicePath || "").split("/").pop()
            }
          )
        : "";

    if (invoiceUrl) {
      console.log("🖥️ 发票预览 URL:", invoiceUrl);
      window.open(invoiceUrl);
    } else {
      ElMessage.warning("请先上传发票文件");
    }
  } catch (err) {
    console.error("发票预览失败:", err);
    ElMessage.error("发票预览失败，请重新上传文件后重试");
  }
};

// 销售发票 - 重新上传发票
const reuploadInvoice = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要重新上传发票吗？这将替换当前的发票文件。`,
      "重新上传确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    // 清空当前的发票文件信息，触发重新上传
    row.invoiceFile = null;
    row.invoiceUrl = "";
    row.invoice_file_name = "";
    row.invoicePath = "";
    row.invoicePath = "";
    row.invoicePath = "";

    // 清空数据库中的发票信息
    await updateSalesInvoice(row.id, {
      invoice_url: "",
      invoice_file_name: ""
    });

    ElMessage.success("请选择新的发票文件");
  } catch (error) {
    // 用户取消操作
  }
};

// 销售发票 - 删除发票
const deleteSalesInvoice = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${row.sellerName}"的发票吗？`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    const deleteFileResult = await deleteOssFileIfExists(row);
    if (!deleteFileResult.success) {
      console.error("❌ 删除OSS文件失败:", deleteFileResult.error);
      ElMessage.error("删除OSS文件失败，请稍后重试");
      return;
    }

    const result = await deleteSalesInvoiceAPI(row.id);
    if (result.success) {
      ElMessage.success("删除成功");
      // 重新加载数据以确保同步
      await loadInvoiceData();
    } else {
      ElMessage.error(result.error || "删除失败");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除销售发票失败:", error);
      ElMessage.error("删除失败");
    } else {
      ElMessage.info("已取消删除");
    }
  }
};

// 进项发票 - 切换发票状态
const toggleInvoiceStatus = async (row: any) => {
  try {
    // 检查：如果已经上传发票且当前是已开票状态，不允许切换到未开票
    if (row.invoiceFile && row.invoiceIssued) {
      ElMessage.warning("已上传发票的记录不能切换到未开票状态");
      // 恢复开关状态
      row.invoiceIssued = true;
      return;
    }

    // 调用API更新数据库中的发票状态
    const result = await updatePurchaseInvoice(row.id, {
      invoice_issued: row.invoiceIssued
    });

    if (result.success) {
      ElMessage.success(
        `发票状态已更新为"${row.invoiceIssued ? "已开" : "未开"}"`
      );
      console.log("✅ 发票状态更新成功:", {
        id: row.id,
        invoiceIssued: row.invoiceIssued
      });
    } else {
      // 如果更新失败，恢复开关状态
      row.invoiceIssued = !row.invoiceIssued;
      ElMessage.error(result.error || "发票状态更新失败");
    }
  } catch (error) {
    // 如果发生异常，恢复开关状态
    row.invoiceIssued = !row.invoiceIssued;
    console.error("❌ 发票状态更新异常:", error);
    ElMessage.error("发票状态更新失败");
  }
};

// 进项发票 - 上传发票（针对进项发票）
const handlePurchaseInvoiceUpload = async (
  response: any,
  uploadFile: UploadFile,
  row: any
) => {
  try {
    if (!uploadFile.raw) {
      ElMessage.error("文件获取失败");
      return;
    }

    console.log("🚀 开始上传进项发票文件:", {
      fileName: uploadFile.name,
      fileSize: uploadFile.size,
      fileType: uploadFile.raw?.type
    });

    // 上传到 Supabase 存储
    const result = await uploadInvoiceFile(
      uploadFile.raw,
      uploadFile.name,
      "purchase"
    );

    if (!result.success) {
      console.error("❌ 上传失败:", result.error);
      ElMessage.error(`发票上传失败: ${result.error?.message || "未知错误"}`);
      return;
    }

    console.log("✅ 进项发票上传成功:", result.data);

    if (result.data) {
      const filePath = result.data.path || result.data.url;
      const fileUrl = result.data.signedUrl || result.data.url || "";
      row.invoiceUrl = fileUrl;
      row.invoicePath = filePath;
      row.invoiceFile = {
        name: uploadFile.name,
        url: fileUrl
      };
      // 如果是已保存的记录，更新到数据库
      if (row.id) {
        await updatePurchaseInvoice(row.id, {
          invoice_file_name: result.data.fileName || uploadFile.name,
          invoice_url: filePath
        });
      }
      ElMessage.success("发票上传成功");
    }
  } catch (error) {
    console.error("❌ 上传处理失败:", error);
    const errorMessage =
      error instanceof Error ? error.message : "发票上传处理失败";
    ElMessage.error(errorMessage);
  }
};

// 进项发票 - 预览发票
const previewPurchaseInvoice = async (row: any) => {
  try {
    // 优先使用路径生成新的签名URL，避免过期，并指定 inline 预览
    const invoicePath = row.invoicePath || row.invoice_url;
    const invoiceUrl =
      invoicePath || row.invoiceUrl || row.invoiceFile?.url
        ? await resolveInvoiceUrl(
            invoicePath || row.invoiceUrl || row.invoiceFile?.url,
            {
              inline: true,
              fileName:
                row.invoice_file_name ||
                row.invoiceFile?.name ||
                (invoicePath || "").split("/").pop()
            }
          )
        : "";

    if (invoiceUrl) {
      window.open(invoiceUrl);
    } else {
      ElMessage.warning("请先上传发票文件");
    }
  } catch (err) {
    console.error("发票预览失败:", err);
    ElMessage.error("发票预览失败，请重新上传文件后重试");
  }
};

// 进项发票 - 重新上传发票
const reuploadPurchaseInvoice = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要重新上传发票吗？这将替换当前的发票文件。`,
      "重新上传确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    // 清空当前的发票文件信息，触发重新上传
    row.invoiceFile = null;
    row.invoiceUrl = "";
    row.invoice_file_name = "";

    // 清空数据库中的发票信息
    await updatePurchaseInvoice(row.id, {
      invoice_url: "",
      invoice_file_name: ""
    });

    ElMessage.success("请选择新的发票文件");
  } catch (error) {
    // 用户取消操作
  }
};

// 进项发票 - 删除
const deletePurchaseInvoice = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除该进项发票记录吗？`, "删除确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });

    const deleteFileResult = await deleteOssFileIfExists(row);
    if (!deleteFileResult.success) {
      console.error("❌ 删除OSS文件失败:", deleteFileResult.error);
      ElMessage.error("删除OSS文件失败，请稍后重试");
      return;
    }

    const result = await deletePurchaseInvoiceAPI(row.id);
    if (result.success) {
      ElMessage.success("删除成功");
      // 重新加载数据以确保同步
      await loadInvoiceData();
    } else {
      ElMessage.error(result.error || "删除失败");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除进项发票失败:", error);
      ElMessage.error("删除失败");
    } else {
      ElMessage.info("已取消删除");
    }
  }
};

// 编辑对话框状态
const editDialogVisible = ref(false);
const editDialogTitle = ref("");
const editForm = ref<any>({});
const editType = ref<"sales" | "purchase">("sales");

// 销售发票 - 修改
const editSalesInvoice = (row: any) => {
  console.log("🔧 修改销售发票 - 原始行数据:", row);

  editType.value = "sales";
  editDialogTitle.value = "修改销售发票";
  editForm.value = {
    id: row.id,
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    buyerId: row.buyerId,
    buyerName: row.buyerName,
    totalAmount: row.totalAmount,
    invoiceDate: row.invoiceDate,
    // 修复发票文件信息映射 - 使用 invoiceFile 对象中的信息
    invoiceFileName: row.invoiceFile
      ? row.invoiceFile.name
      : row.invoice_file_name || "",
    invoiceUrl: row.invoiceFile ? row.invoiceFile.url : row.invoiceUrl || "",
    invoicePath: row.invoicePath || row.invoice_url || "",
    // 保留原始字段用于数据库更新
    invoice_file_name: row.invoiceFile
      ? row.invoiceFile.name
      : row.invoice_file_name || "",
    original_file_name: row.invoiceFile
      ? row.invoiceFile.name
      : row.original_file_name || ""
  };

  console.log("🔧 修改销售发票 - 表单数据:", editForm.value);
  editDialogVisible.value = true;
};

// 进项发票 - 修改
const editPurchaseInvoice = (row: any) => {
  console.log("🔧 修改进项发票 - 原始行数据:", row);

  editType.value = "purchase";
  editDialogTitle.value = "修改进项发票";
  editForm.value = {
    id: row.id,
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    buyerId: row.buyerId,
    buyerName: row.buyerName,
    paymentAmount: row.paymentAmount,
    paymentDate: row.paymentDate,
    invoiceType: row.invoiceType,
    // 添加缺失的 invoiceIssued 字段
    invoiceIssued: row.invoiceIssued,
    // 修复发票文件信息映射 - 使用 invoiceFile 对象中的信息
    invoiceFileName: row.invoiceFile
      ? row.invoiceFile.name
      : row.invoice_file_name || "",
    invoiceUrl: row.invoiceFile ? row.invoiceFile.url : row.invoiceUrl || "",
    invoicePath: row.invoicePath || row.invoice_url || "",
    // 保留原始字段用于数据库更新
    invoice_file_name: row.invoiceFile
      ? row.invoiceFile.name
      : row.invoice_file_name || "",
    original_file_name: row.invoiceFile
      ? row.invoiceFile.name
      : row.original_file_name || ""
  };

  console.log("🔧 修改进项发票 - 表单数据:", editForm.value);
  editDialogVisible.value = true;
};

// 删除发票文件
const deleteInvoiceFile = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      "确定要删除当前发票文件吗？删除后可重新上传。",
      "删除发票文件",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    // 先删除 OSS 文件（如果有可用路径）
    const rawPath =
      row.invoicePath ||
      row.invoice_url ||
      row.invoiceUrl ||
      row.invoiceFile?.url ||
      "";
    const filePathForDelete = extractInvoicePathForSave(rawPath);
    if (filePathForDelete) {
      const deleteResult = await deleteInvoiceFileAPI(filePathForDelete);
      if (!deleteResult.success) {
        console.error("❌ 删除OSS文件失败:", deleteResult.error);
        ElMessage.error("删除OSS文件失败，请稍后重试");
        return;
      }
    }

    // 更新数据库 - 同时清空文件信息和设置为未开票
    if (editType.value === "sales") {
      await updateSalesInvoice(row.id, {
        invoice_url: "",
        invoice_file_name: ""
      });
    } else {
      await updatePurchaseInvoice(row.id, {
        invoice_url: "",
        invoice_file_name: "",
        invoice_issued: false // 删除文件时同时设置为未开票
      });
    }

    // 清空发票文件信息
    row.invoiceFile = null;
    row.invoiceUrl = "";
    row.invoice_file_name = "";
    row.invoicePath = "";
    // 对于进项发票，同时设置为未开票
    if (editType.value !== "sales") {
      row.invoiceIssued = false;
    }

    // 更新表单
    editForm.value.invoiceFileName = "";
    editForm.value.invoiceUrl = "";
    editForm.value.invoiceFile = null;
    editForm.value.invoice_file_name = "";
    editForm.value.invoicePath = "";
    // 对于进项发票，同时设置为未开票
    if (editType.value !== "sales") {
      editForm.value.invoiceIssued = false;
    }

    // 同步更新表格中的数据
    if (editType.value !== "sales") {
      // 进项发票表格
      const purchaseIndex = allPurchaseInvoices.value.findIndex(
        item => item.id === row.id
      );
      if (purchaseIndex !== -1) {
        allPurchaseInvoices.value[purchaseIndex].invoiceFile = null;
        allPurchaseInvoices.value[purchaseIndex].invoiceUrl = "";
        allPurchaseInvoices.value[purchaseIndex].invoice_file_name = "";
        allPurchaseInvoices.value[purchaseIndex].invoicePath = "";
        allPurchaseInvoices.value[purchaseIndex].invoiceIssued = false;
      }
    } else {
      // 销售发票表格
      const salesIndex = allSalesInvoices.value.findIndex(
        item => item.id === row.id
      );
      if (salesIndex !== -1) {
        allSalesInvoices.value[salesIndex].invoiceFile = null;
        allSalesInvoices.value[salesIndex].invoiceUrl = "";
        allSalesInvoices.value[salesIndex].invoice_file_name = "";
        allSalesInvoices.value[salesIndex].invoicePath = "";
      }
    }

    ElMessage.success("发票文件已删除");
  } catch (error) {
    // 用户取消操作
  }
};

// 删除 OSS 文件（用于记录删除时）
const deleteOssFileIfExists = async (row: any) => {
  const rawPath =
    row.invoicePath ||
    row.invoice_url ||
    row.invoiceUrl ||
    row.invoiceFile?.url ||
    "";
  const filePathForDelete = extractInvoicePathForSave(rawPath);
  if (!filePathForDelete) return { success: true };
  return await deleteInvoiceFileAPI(filePathForDelete);
};

// 重新上传发票文件（在编辑对话框中使用）
const reuploadInvoiceInDialog = async (row: any) => {
  try {
    // 清空当前发票文件信息
    row.invoiceFile = null;
    row.invoiceUrl = "";
    row.invoice_file_name = "";
    row.invoicePath = "";

    // 更新数据库
    if (editType.value === "sales") {
      await updateSalesInvoice(row.id, {
        invoice_url: "",
        invoice_file_name: ""
      });
    } else {
      await updatePurchaseInvoice(row.id, {
        invoice_url: "",
        invoice_file_name: ""
      });
    }

    // 更新表单
    editForm.value.invoiceFileName = "";
    editForm.value.invoiceUrl = "";

    ElMessage.success("请选择新的发票文件进行上传");
  } catch (error) {
    ElMessage.error("操作失败");
  }
};

// 编辑对话框中的上传处理函数
const handleInvoiceUploadInDialog = async (
  response: any,
  uploadFile: UploadFile,
  formData: any
) => {
  try {
    if (!uploadFile.raw) {
      ElMessage.error("文件获取失败");
      return;
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const uniqueFileName = `${timestamp}_${randomStr}_${uploadFile.name}`;
    const fileName =
      editType.value === "sales"
        ? `sales_invoices/${uniqueFileName}`
        : `purchase_invoices/${uniqueFileName}`;

    // 上传到 Supabase 存储
    const { data, error } = await uploadInvoiceFile(uploadFile.raw, fileName);

    if (error) {
      console.error("上传失败:", error);
      ElMessage.error("发票上传失败: " + error.message);
      return;
    }

    // 获取签名URL（不再回退公共/原链接）
    const { data: urlData, error: urlErr } = await getInvoicePublicUrl(
      fileName
    );
    if (urlErr || !urlData?.signedUrl) {
      throw urlErr || new Error("发票签名URL生成失败");
    }

    const accessibleUrl = urlData.signedUrl;
    const filePath = fileName;
    // 更新表单数据
    formData.invoiceUrl = accessibleUrl;
    formData.invoicePath = filePath;
    formData.invoice_file_name = uploadFile.name;
    formData.invoiceFileName = uploadFile.name;

    // 更新数据库
    if (editType.value === "sales") {
      await updateSalesInvoice(formData.id, {
        invoice_file_name: uploadFile.name,
        invoice_url: filePath
      });
    } else {
      await updatePurchaseInvoice(formData.id, {
        invoice_file_name: uploadFile.name,
        invoice_url: filePath
      });
    }

    ElMessage.success("发票上传成功");
  } catch (error) {
    console.error("上传处理失败:", error);
    const errorMessage =
      error instanceof Error ? error.message : "发票上传处理失败";
    ElMessage.error(errorMessage);
  }
};

// 销售发票对话框上传处理
const handleSalesInvoiceUploadDialog = (options: any) => {
  console.log("🚀 销售发票上传开始:", options.file.name);
  console.log("🔍 检查 editForm 状态:", {
    editForm: editForm,
    editFormValue: editForm.value,
    editType: editType.value
  });

  // 检查 editForm.value 是否存在
  if (!editForm.value) {
    console.error("❌ editForm.value 是 undefined，无法进行上传");
    options.onError(new Error("表单数据异常，请重新打开对话框"));
    return;
  }

  // 立即更新文件名，让用户看到反馈
  try {
    editForm.value.invoiceFileName = options.file.name;
    console.log("✅ 文件名已更新:", options.file.name);
  } catch (error) {
    console.error("❌ 更新文件名失败:", error);
    options.onError(error);
    return;
  }

  // 调用上传处理函数
  customUploadInDialog(options, editForm.value)
    .then(() => {
      console.log("✅ 销售发票上传成功");
      options.onSuccess({ url: editForm.value?.invoiceUrl });
    })
    .catch(error => {
      console.error("❌ 销售发票上传失败:", error);
      // 失败时清除文件名
      if (editForm.value) {
        editForm.value.invoiceFileName = "";
        editForm.value.invoiceUrl = "";
      }
      options.onError(error);
    });
};

// 进项发票对话框上传处理
const handlePurchaseInvoiceUploadDialog = (options: any) => {
  console.log("🚀 进项发票上传开始:", options.file.name);

  // 立即更新文件名，让用户看到反馈
  if (editForm.value) {
    editForm.value.invoiceFileName = options.file.name;
  }

  // 调用上传处理函数
  customUploadInDialog(options, editForm.value)
    .then(() => {
      console.log("✅ 进项发票上传成功");
      options.onSuccess({ url: editForm.value?.invoiceUrl });
    })
    .catch(error => {
      console.error("❌ 进项发票上传失败:", error);
      // 失败时清除文件名
      if (editForm.value) {
        editForm.value.invoiceFileName = "";
        editForm.value.invoiceUrl = "";
      }
      options.onError(error);
    });
};

// 编辑对话框中的自定义上传函数
const customUploadInDialog = async (options: any, formData: any) => {
  const { file, onProgress, onSuccess, onError } = options;

  try {
    console.log("🚀 开始对话框上传:", file.name);

    // 设置对话框上传状态
    dialogUploading.value = true;

    // 显示上传开始消息
    ElMessage.info({
      message: `正在上传发票文件: ${file.name}`,
      duration: 2000
    });

    // 模拟上传进度
    const progressInterval = createProgressInterval(() => {
      const progress = Math.random() * 90 + 10; // 10-100的随机进度
      onProgress({ percent: progress }, file);
    }, 200);

    // 上传到 Supabase 存储
    const fileType = editType.value === "sales" ? "sales" : "purchase";
    const result = await uploadInvoiceFile(file, file.name, fileType);

    // 清除进度模拟
    clearInterval(progressInterval);
    onProgress({ percent: 100 }, file);

    if (!result.success) {
      console.error("❌ 上传失败:", result.error);
      ElMessage.error(`上传失败: ${result.error || "文件上传失败"}`);
      onError(result.error || new Error("文件上传失败"));
      return;
    }

    console.log("✅ 文件上传成功:", result.data);

    // 本地校验：仅允许 PDF，避免远程请求因 OSS 权限导致误判
    const isPdfFile =
      (file.type && file.type.toLowerCase().includes("pdf")) ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfFile) {
      console.error("❌ 文件类型验证失败:", file.type);
      ElMessage.error("上传失败: 仅支持 PDF 文件");
      onError(new Error("文件类型错误"));
      return;
    }

    const filePath = result.data?.path || file.name;
    const fileUrl = result.data?.signedUrl || result.data?.url || "";

    // 更新表单数据 - 这是关键！
    // 需要更新Vue响应式对象 editForm.value
    if (editForm.value) {
      editForm.value.invoiceUrl = fileUrl;
      editForm.value.invoicePath = filePath;
      editForm.value.invoice_file_name = result.data?.fileName || file.name;
      editForm.value.invoiceFileName = result.data?.fileName || file.name;
      editForm.value.original_file_name = file.name;
      editForm.value.originalFileName = file.name;

      console.log("📋 表单数据已更新:", {
        invoiceFileName: editForm.value.invoiceFileName,
        invoiceUrl: editForm.value.invoiceUrl,
        originalFileName: editForm.value.originalFileName,
        editForm: editForm.value
      });

      // 显示成功消息
      ElMessage.success({
        message: `发票文件上传成功: ${file.name}`,
        duration: 3000
      });

      // 强制触发Vue响应式更新
      await nextTick();
      console.log("✅ nextTick完成，UI应该已更新");

      console.log("✅ 上传完成，UI应该已更新");
      onSuccess();
    } else {
      console.error("❌ editForm.value 是 undefined，无法更新文件信息");
      ElMessage.error("表单数据丢失，请重新尝试");
      onError(new Error("表单数据丢失，请重新尝试"));
    }
  } catch (error) {
    console.error("❌ 对话框上传异常:", error);
    const errorMessage =
      error instanceof Error ? error.message : "上传过程中发生未知错误";

    ElMessage.error({
      message: `上传失败: ${errorMessage}`,
      duration: 5000
    });

    onError(error instanceof Error ? error : new Error(errorMessage));
  } finally {
    // 重置对话框上传状态
    dialogUploading.value = false;
  }
};

// 统一获取可持久化的发票路径（OSS 对象名）
const getInvoicePathForSave = (formData: any) =>
  extractInvoicePathForSave(
    formData?.invoicePath || formData?.invoice_url || formData?.invoiceUrl || ""
  );

// 保存编辑（支持新增和修改）
const saveEdit = async () => {
  try {
    if (editType.value === "sales") {
      if (editForm.value.id === null) {
        // 查找或设置购买方ID
        let buyerId = null;
        if (editForm.value.buyerName) {
          // 尝试在现有公司中查找匹配的购买方
          const buyerCompany = allCompanies.value.find(
            c => c.company_name === editForm.value.buyerName
          );
          if (buyerCompany) {
            buyerId = buyerCompany.id;
          } else {
            // 如果没找到，使用第一个公司作为默认购买方
            buyerId =
              allCompanies.value.length > 0 ? allCompanies.value[0].id : 1;
          }
        }

        // 确保seller_id也不为null
        const sellerId =
          editForm.value.sellerId ||
          selectedCompanyId.value ||
          (allCompanies.value.length > 0 ? allCompanies.value[0].id : 1);

        // 新增销售发票
        const newInvoice = {
          seller_id: sellerId,
          buyer_id: buyerId, // 确保buyer_id不为null以满足数据库约束
          seller_name: editForm.value.sellerName,
          buyer_name: editForm.value.buyerName,
          total_amount: parseFloat(editForm.value.totalAmount) || 0,
          invoice_date: editForm.value.invoiceDate,
          // 添加文件信息 - 使用多个字段名确保兼容性
          invoice_file_name:
            editForm.value.invoiceFileName || editForm.value.invoice_file_name,
          invoice_url: getInvoicePathForSave(editForm.value),
          original_file_name:
            editForm.value.originalFileName || editForm.value.original_file_name
        };

        console.log("🚀 准备保存销售发票:", {
          ...newInvoice,
          editForm_invoiceFileName: editForm.value.invoiceFileName,
          editForm_invoice_file_name: editForm.value.invoice_file_name,
          editForm_invoiceUrl: editForm.value.invoiceUrl
        });
        const { data, success, error } = await createSalesInvoice(newInvoice);
        console.log("📊 保存结果:", { data, success, error });

        if (success && data) {
          const resolvedUrl = await resolveInvoiceUrl(data.invoice_url);
          // 将新发票添加到本地数组
          const localInvoice = {
            id: data.id,
            sellerName: data.seller_name,
            buyerName: data.buyer_name,
            totalAmount: data.total_amount,
            invoiceDate: data.invoice_date,
            invoiceUrl: resolvedUrl,
            invoicePath: data.invoice_url,
            invoiceFile:
              data.invoice_file_name &&
              resolvedUrl
                ? {
                    name: data.original_file_name || data.invoice_file_name,
                    url: resolvedUrl
                  }
                : null,
            sellerId: data.seller_id,
            buyerId: data.buyer_id
          };
          allSalesInvoices.value.push(localInvoice);
          ElMessage.success("新增销售发票成功");
        } else {
          console.error("❌ 新增销售发票失败:", error);
          ElMessage.error(`新增销售发票失败: ${error?.message || "未知错误"}`);
          return;
        }
      } else {
        // 修改现有销售发票
        const updates = {
          seller_name: editForm.value.sellerName,
          buyer_name: editForm.value.buyerName,
          total_amount: parseFloat(editForm.value.totalAmount) || 0,
          invoice_date: editForm.value.invoiceDate,
          // 如果有文件信息，也要更新
          ...(editForm.value.invoiceFileName &&
          getInvoicePathForSave(editForm.value)
            ? {
                invoice_file_name: editForm.value.invoiceFileName,
                invoice_url: getInvoicePathForSave(editForm.value),
                original_file_name:
                  editForm.value.originalFileName ||
                  editForm.value.original_file_name
              }
            : {})
        };

        const { data, success } = await updateSalesInvoice(
          editForm.value.id!,
          updates
        );
        if (success && data) {
          const resolvedUrl = await resolveInvoiceUrl(data.invoice_url);
          // 更新本地数组中的数据
          const index = allSalesInvoices.value.findIndex(
            item => item.id === editForm.value.id
          );
          if (index > -1) {
            allSalesInvoices.value[index] = {
              ...allSalesInvoices.value[index],
              sellerName: data.seller_name,
              buyerName: data.buyer_name,
              totalAmount: data.total_amount,
              invoiceDate: data.invoice_date,
              invoiceUrl: resolvedUrl,
              invoicePath: data.invoice_url,
              invoiceFile:
                data.invoice_file_name &&
                resolvedUrl
                  ? {
                      name: data.original_file_name || data.invoice_file_name,
                      url: resolvedUrl
                    }
                  : allSalesInvoices.value[index].invoiceFile
            };
            ElMessage.success("修改销售发票成功");
          }
        } else {
          ElMessage.error("修改销售发票失败");
          return;
        }
      }
    } else {
      if (editForm.value.id === null) {
        // 新增进项发票
        const newInvoice = {
          seller_id: null, // 进项发票的销售方使用手动输入，所以seller_id设为null
          buyer_id: editForm.value.buyerId || selectedCompanyId.value || 1,
          seller_name: editForm.value.sellerName,
          buyer_name: editForm.value.buyerName,
          payment_amount: parseFloat(editForm.value.paymentAmount) || 0,
          payment_date: editForm.value.paymentDate,
          invoice_type: editForm.value.invoiceType,
          // 添加文件信息 - 使用多个字段名确保兼容性
          invoice_file_name:
            editForm.value.invoiceFileName || editForm.value.invoice_file_name,
          invoice_url: getInvoicePathForSave(editForm.value),
          original_file_name:
            editForm.value.originalFileName || editForm.value.original_file_name
        };

        console.log("🚀 准备保存进项发票:", {
          ...newInvoice,
          editForm_invoiceFileName: editForm.value.invoiceFileName,
          editForm_invoice_file_name: editForm.value.invoice_file_name,
          editForm_invoiceUrl: editForm.value.invoiceUrl
        });
        const { data, success } = await createPurchaseInvoice(newInvoice);
        console.log("📊 保存进项发票结果:", { data, success });
        if (success && data) {
          const resolvedUrl = await resolveInvoiceUrl(data.invoice_url);
          // 将新发票添加到本地数组
          const localInvoice = {
            id: data.id,
            sellerName: data.seller_name,
            buyerName: data.buyer_name,
            paymentAmount: data.payment_amount,
            paymentDate: data.payment_date,
            invoiceType: data.invoice_type,
            invoiceIssued: data.invoice_issued,
            invoiceUrl: resolvedUrl,
            invoicePath: data.invoice_url,
            invoiceFile:
              data.invoice_file_name &&
              resolvedUrl
                ? {
                    name: data.original_file_name || data.invoice_file_name,
                    url: resolvedUrl
                  }
                : null,
            sellerId: data.seller_id,
            buyerId: data.buyer_id
          };
          allPurchaseInvoices.value.push(localInvoice);
          ElMessage.success("新增进项发票成功");
        } else {
          ElMessage.error("新增进项发票失败");
          return;
        }
      } else {
        // 修改现有进项发票
        const updates = {
          seller_name: editForm.value.sellerName,
          buyer_name: editForm.value.buyerName,
          payment_amount: parseFloat(editForm.value.paymentAmount) || 0,
          payment_date: editForm.value.paymentDate,
          invoice_type: editForm.value.invoiceType,
          // 如果有文件信息，也要更新
          ...(editForm.value.invoiceFileName &&
          getInvoicePathForSave(editForm.value)
            ? {
                invoice_file_name: editForm.value.invoiceFileName,
                invoice_url: getInvoicePathForSave(editForm.value),
                original_file_name:
                  editForm.value.originalFileName ||
                  editForm.value.original_file_name
              }
            : {})
        };

        const { data, success } = await updatePurchaseInvoice(
          editForm.value.id!,
          updates
        );
        if (success && data) {
          const resolvedUrl = await resolveInvoiceUrl(data.invoice_url);
          // 更新本地数组中的数据
          const index = allPurchaseInvoices.value.findIndex(
            item => item.id === editForm.value.id
          );
          if (index > -1) {
            allPurchaseInvoices.value[index] = {
              ...allPurchaseInvoices.value[index],
              sellerName: data.seller_name,
              buyerName: data.buyer_name,
              paymentAmount: data.payment_amount,
              paymentDate: data.payment_date,
              invoiceType: data.invoice_type,
              invoiceIssued: data.invoice_issued,
              invoiceUrl: resolvedUrl,
              invoicePath: data.invoice_url,
              invoiceFile: data.invoice_file_name
                ? { name: data.invoice_file_name, url: resolvedUrl }
                : allPurchaseInvoices.value[index].invoiceFile
            };
            ElMessage.success("修改进项发票成功");
          }
        } else {
          ElMessage.error("修改进项发票失败");
          return;
        }
      }
    }

    editDialogVisible.value = false;
    // 更新统计数据
    updateCompanyStats();
  } catch (error) {
    console.error("保存发票失败:", error);
    ElMessage.error("保存发票失败");
  }
};

// 取消编辑
const cancelEdit = () => {
  editDialogVisible.value = false;
  editForm.value = {};
};

// 处理对话框关闭（防止上传过程中关闭）
const handleDialogClose = (done: () => void) => {
  if (dialogUploading.value) {
    ElMessage.warning("文件上传中，请等待上传完成后再关闭对话框");
    return;
  }
  done();
};

// 页面加载
onMounted(() => {
  loadCompanyData();
  loadInvoiceData();
});
</script>

<template>
  <div class="invoice-container">
    <!-- 公司统计卡片 -->
    <el-row :gutter="20">
      <el-col
        v-for="company in companyStats"
        :key="company.companyId"
        :xs="24"
        :sm="12"
        :md="8"
      >
        <el-card
          shadow="hover"
          class="company-card cursor-pointer"
          :class="{ selected: selectedCompanyId === company.companyId }"
          @click="toggleCompanySelection(company.companyId)"
        >
          <div class="company-card-content">
            <div class="company-name">{{ company.companyName }}</div>
            <div class="company-stats">
              <div class="stat-item">
                <div class="stat-label">{{ currentMonth }}销项</div>
                <div class="stat-value text-blue-600">
                  {{ formatMoney(company.monthlySales) }}
                </div>
              </div>
              <div class="stat-divider" />
              <div class="stat-item">
                <div class="stat-label">{{ currentMonth }}进项</div>
                <div class="stat-value text-green-600">
                  {{ formatMoney(company.monthlyPurchase) }}
                </div>
              </div>
              <div class="stat-divider" />
              <div class="stat-item">
                <div class="stat-label">未开进项</div>
                <div class="stat-value text-orange-500">
                  {{ company.pendingPurchaseCount }}笔
                </div>
              </div>
              <div class="stat-divider" />
              <div class="stat-item">
                <div class="stat-label">预估缴税</div>
                <div
                  class="stat-value text-red-600 cursor-pointer hover:text-red-500 transition-colors"
                >
                  <el-tooltip
                    effect="light"
                    placement="top"
                    :show-after="200"
                    popper-class="tax-tooltip"
                  >
                    <template #content>
                      <div
                        class="tax-calculation"
                        v-html="formatTaxBreakdown(company.taxBreakdown)"
                      />
                    </template>
                    <span>{{ formatMoney(company.estimatedTax) }}</span>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="selectedCompanyId === company.companyId"
            class="selected-indicator"
          >
            <el-icon><Check /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 发票列表 -->
    <el-card shadow="never" class="mt-4">
      <!-- 标签页 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="销售发票" name="sales">
          <!-- 筛选器和操作按钮 -->
          <div class="filter-section mb-4">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">年份:</span>
                  <el-select
                    v-model="selectedYear"
                    placeholder="选择年份"
                    style="width: 120px"
                  >
                    <el-option
                      v-for="year in yearOptions"
                      :key="year"
                      :label="year + '年'"
                      :value="year"
                    />
                  </el-select>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">月份:</span>
                  <div class="month-selector-dropdown">
                    <button
                      class="month-selector-trigger"
                      @click="toggleMonthSelector"
                    >
                      {{ monthSelectorDisplay }}
                      <span
                        class="selector-arrow"
                        :class="{ expanded: monthSelectorVisible }"
                        >▼</span
                      >
                    </button>
                    <div
                      v-if="monthSelectorVisible"
                      class="month-selector-popup"
                      @click.stop
                    >
                      <div class="month-grid">
                        <button
                          v-for="month in monthOptions"
                          :key="month.value"
                          :class="[
                            'month-button',
                            { active: selectedMonth === month.value }
                          ]"
                          @click="selectMonth(month.value)"
                        >
                          {{ month.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <el-button type="primary" @click="addSalesInvoice">
                <el-icon><Plus /></el-icon>
                新增销售发票
              </el-button>
            </div>
          </div>
          <!-- 销售发票表格 -->
          <el-table :data="salesInvoices" border stripe>
            <el-table-column
              type="index"
              label="序号"
              width="60"
              align="center"
              :index="salesInvoiceIndex"
            />
            <el-table-column
              prop="sellerName"
              label="销售方"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column
              prop="buyerName"
              label="购买方"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column label="发票金额" width="150" align="right">
              <template #default="{ row }">
                <span class="text-blue-600 font-bold">
                  ¥{{ formatMoney(row.totalAmount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="invoiceDate" label="开票日期" width="120" />
            <el-table-column label="发票" width="200" align="center">
              <template #default="{ row }">
                <el-upload
                  class="invoice-uploader"
                  action="#"
                  :auto-upload="true"
                  :show-file-list="false"
                  :http-request="options => customUpload(options, row)"
                  :before-upload="beforeUploadInvoice"
                  accept=".pdf"
                >
                  <el-button
                    v-if="!row.invoiceFile"
                    type="primary"
                    size="small"
                    :loading="uploadingRows.has(row.id || `temp_${row.$index}`)"
                    :disabled="
                      uploadingRows.has(row.id || `temp_${row.$index}`)
                    "
                  >
                    {{
                      uploadingRows.has(row.id || `temp_${row.$index}`)
                        ? "上传中..."
                        : "上传发票"
                    }}
                  </el-button>
                  <template v-else>
                    <el-button
                      type="success"
                      size="small"
                      @click.stop="previewInvoice(row)"
                    >
                      <el-icon><Document /></el-icon>
                    </el-button>
                  </template>
                </el-upload>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="editSalesInvoice(row)"
                >
                  修改
                </el-button>
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="deleteSalesInvoice(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="进项发票" name="purchase">
          <!-- 筛选器和操作按钮 -->
          <div class="filter-section mb-4">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">年份:</span>
                  <el-select
                    v-model="selectedYear"
                    placeholder="选择年份"
                    style="width: 120px"
                  >
                    <el-option
                      v-for="year in yearOptions"
                      :key="year"
                      :label="year + '年'"
                      :value="year"
                    />
                  </el-select>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">月份:</span>
                  <div class="month-selector-dropdown">
                    <button
                      class="month-selector-trigger"
                      @click="toggleMonthSelector"
                    >
                      {{ monthSelectorDisplay }}
                      <span
                        class="selector-arrow"
                        :class="{ expanded: monthSelectorVisible }"
                        >▼</span
                      >
                    </button>
                    <div
                      v-if="monthSelectorVisible"
                      class="month-selector-popup"
                      @click.stop
                    >
                      <div class="month-grid">
                        <button
                          v-for="month in monthOptions"
                          :key="month.value"
                          :class="[
                            'month-button',
                            { active: selectedMonth === month.value }
                          ]"
                          @click="selectMonth(month.value)"
                        >
                          {{ month.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <el-button type="primary" @click="addPurchaseInvoice">
                <el-icon><Plus /></el-icon>
                新增进项发票
              </el-button>
            </div>
          </div>
          <!-- 进项发票表格 -->
          <el-table :data="purchaseInvoices" border stripe>
            <el-table-column
              type="index"
              label="序号"
              width="60"
              align="center"
              :index="purchaseInvoiceIndex"
            />
            <el-table-column
              prop="sellerName"
              label="销售方"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column
              prop="buyerName"
              label="购买方"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column label="打款金额" width="150" align="right">
              <template #default="{ row }">
                <span class="text-green-600 font-bold">
                  ¥{{ formatMoney(row.paymentAmount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="paymentDate" label="打款日期" width="120" />
            <el-table-column
              prop="invoiceType"
              label="发票类型"
              width="130"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.invoiceType"
                  :type="row.invoiceType === '专票' ? 'success' : 'warning'"
                >
                  {{ row.invoiceType }}
                </el-tag>
                <span v-else class="text-gray-400">-</span>
              </template>
            </el-table-column>
            <el-table-column label="是否开票" width="130" align="center">
              <template #default="{ row }">
                <el-switch
                  v-model="row.invoiceIssued"
                  inline-prompt
                  :active-text="row.invoiceIssued ? '已开' : ''"
                  :inactive-text="!row.invoiceIssued ? '未开' : ''"
                  :active-value="true"
                  :inactive-value="false"
                  :disabled="row.invoiceFile && row.invoiceIssued"
                  style="

                    --el-switch-on-color: #67c23a;
                    --el-switch-off-color: #dcdfe6;
                  "
                  @change="toggleInvoiceStatus(row)"
                />
              </template>
            </el-table-column>
            <!-- 发票列 -->
            <el-table-column label="发票" width="200" align="center">
              <template #default="{ row }">
                <template v-if="!row.invoiceIssued">
                  <el-upload
                    class="invoice-uploader"
                    action="#"
                    :auto-upload="true"
                    :show-file-list="false"
                    :http-request="
                      options => customPurchaseUpload(options, row)
                    "
                    :before-upload="beforeUploadInvoice"
                    accept=".pdf"
                  >
                    <el-button
                      type="primary"
                      size="small"
                      :loading="
                        uploadingRows.has(row.id || `temp_${row.$index}`)
                      "
                      :disabled="
                        uploadingRows.has(row.id || `temp_${row.$index}`)
                      "
                    >
                      {{
                        uploadingRows.has(row.id || `temp_${row.$index}`)
                          ? "上传中..."
                          : "上传发票"
                      }}
                    </el-button>
                  </el-upload>
                </template>
                <template v-else>
                  <!-- 已开票且有文件 -->
                  <template v-if="row.invoiceFile">
                    <el-button
                      type="success"
                      size="small"
                      @click.stop="previewPurchaseInvoice(row)"
                    >
                      <el-icon><Document /></el-icon>
                    </el-button>
                  </template>
                  <!-- 已开票但没有文件 -->
                  <template v-else>
                    <el-upload
                      class="invoice-uploader"
                      action="#"
                      :auto-upload="true"
                      :show-file-list="false"
                      :http-request="
                        options => customPurchaseUpload(options, row)
                      "
                      :before-upload="beforeUploadInvoice"
                      accept=".pdf"
                    >
                      <el-button
                        type="warning"
                        size="small"
                        :loading="
                          uploadingRows.has(row.id || `temp_${row.$index}`)
                        "
                        :disabled="
                          uploadingRows.has(row.id || `temp_${row.$index}`)
                        "
                      >
                        {{
                          uploadingRows.has(row.id || `temp_${row.$index}`)
                            ? "上传中..."
                            : "补传发票"
                        }}
                      </el-button>
                    </el-upload>
                  </template>
                </template>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="editPurchaseInvoice(row)"
                >
                  修改
                </el-button>
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="deletePurchaseInvoice(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editDialogTitle"
      width="600px"
      :before-close="handleDialogClose"
      :close-on-click-modal="!dialogUploading"
      :close-on-press-escape="!dialogUploading"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        label-width="100px"
        label-position="right"
      >
        <!-- 销售发票表单 -->
        <template v-if="editType === 'sales'">
          <el-form-item label="销售方" required>
            <el-select
              v-model="editForm.sellerId"
              placeholder="请选择销售方"
              filterable
              clearable
              style="width: 100%"
              @change="handleSellerChange"
            >
              <el-option
                v-for="company in allCompanies"
                :key="company.id"
                :label="company.company_name"
                :value="company.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="购买方" required>
            <el-input
              v-model="editForm.buyerName"
              placeholder="请输入购买方名称"
              clearable
            />
          </el-form-item>
          <el-form-item label="发票金额" required>
            <el-input
              v-model="editForm.totalAmount"
              type="number"
              :min="0"
              step="0.01"
              placeholder="请输入发票金额"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="开票日期" required>
            <el-date-picker
              v-model="editForm.invoiceDate"
              type="date"
              placeholder="请选择开票日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>

          <!-- 发票文件管理 -->
          <el-form-item label="发票文件">
            <div v-if="editForm.invoiceFileName" class="invoice-file-section">
              <div class="file-info">
                <el-icon class="file-icon"><Document /></el-icon>
                <span class="file-name">{{ editForm.invoiceFileName }}</span>
                <el-button
                  type="danger"
                  size="small"
                  style="margin-left: 10px"
                  @click="deleteInvoiceFile(editForm)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <div v-else class="no-file">
              <div class="no-file-content">
                <span class="no-file-text">
                  {{ loading ? "正在上传..." : "暂无发票文件" }}
                </span>
                <el-upload
                  class="invoice-uploader"
                  action="#"
                  :auto-upload="true"
                  :show-file-list="false"
                  :disabled="loading"
                  :http-request="handleSalesInvoiceUploadDialog"
                  :before-upload="beforeUploadInvoice"
                  accept=".pdf"
                >
                  <el-button
                    type="primary"
                    size="small"
                    :loading="loading"
                    :disabled="loading"
                  >
                    {{ loading ? "上传中..." : "上传发票" }}
                  </el-button>
                </el-upload>
              </div>
            </div>
          </el-form-item>
        </template>

        <!-- 进项发票表单 -->
        <template v-else>
          <el-form-item label="销售方" required>
            <el-input
              v-model="editForm.sellerName"
              placeholder="请输入销售方名称"
              clearable
            />
          </el-form-item>
          <el-form-item label="购买方" required>
            <el-select
              v-model="editForm.buyerId"
              placeholder="请选择购买方"
              filterable
              clearable
              style="width: 100%"
              @change="handleBuyerChange"
            >
              <el-option
                v-for="company in allCompanies"
                :key="company.id"
                :label="company.company_name"
                :value="company.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="打款金额" required>
            <el-input
              v-model="editForm.paymentAmount"
              type="number"
              :min="0"
              step="0.01"
              placeholder="请输入打款金额"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="打款日期" required>
            <el-date-picker
              v-model="editForm.paymentDate"
              type="date"
              placeholder="请选择打款日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="发票类型">
            <el-select
              v-model="editForm.invoiceType"
              placeholder="请选择发票类型"
              style="width: 100%"
            >
              <el-option label="专票" value="专票" />
              <el-option label="普票" value="普票" />
            </el-select>
          </el-form-item>

          <!-- 发票文件管理 -->
          <el-form-item v-if="editForm.invoiceIssued" label="发票文件">
            <div v-if="editForm.invoiceFileName" class="invoice-file-section">
              <div class="file-info">
                <el-icon class="file-icon"><Document /></el-icon>
                <span class="file-name">{{ editForm.invoiceFileName }}</span>
                <el-button
                  type="danger"
                  size="small"
                  style="margin-left: 10px"
                  @click="deleteInvoiceFile(editForm)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <div v-else class="no-file">
              <div class="no-file-content">
                <span class="no-file-text">
                  {{ loading ? "正在上传..." : "暂无发票文件" }}
                </span>
                <el-upload
                  class="invoice-uploader"
                  action="#"
                  :auto-upload="true"
                  :show-file-list="false"
                  :disabled="loading"
                  :http-request="handlePurchaseInvoiceUploadDialog"
                  :before-upload="beforeUploadInvoice"
                  accept=".pdf"
                >
                  <el-button
                    type="primary"
                    size="small"
                    :loading="loading"
                    :disabled="loading"
                  >
                    {{ loading ? "上传中..." : "上传发票" }}
                  </el-button>
                </el-upload>
              </div>
            </div>
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button :disabled="dialogUploading" @click="cancelEdit">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="dialogUploading"
            :disabled="dialogUploading"
            @click="saveEdit"
          >
            {{ dialogUploading ? "上传中..." : "保存" }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss">
/* 全局样式 - 覆盖提示框样式 */
.el-popper.tax-tooltip {
  color: #303133 !important;
  background-color: rgb(255 255 255 / 98%) !important;
  border: 1px solid #e4e7ed !important;
  border-radius: 6px !important;
  box-shadow: 0 4px 16px 0 rgb(0 0 0 / 8%) !important;
}

.el-popper.tax-tooltip .el-tooltip__arrow::before {
  background-color: rgb(255 255 255 / 98%) !important;
  border: 1px solid #e4e7ed !important;
}
</style>

<style scoped lang="scss">
// 响应式调整
@media (width <= 768px) {
  .company-stats {
    flex-direction: column;
    gap: 16px;
  }

  .stat-divider {
    width: 60%;
    height: 1px;
  }
}

.invoice-container {
  padding: 8px;
}

.company-card {
  position: relative;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
    transform: translateY(-2px);
  }

  &.selected {
    border: 2px solid #409eff;
    box-shadow: 0 4px 12px rgb(64 158 255 / 30%);
  }

  .selected-indicator {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 14px;
    color: white;
    background-color: #409eff;
    border-radius: 50%;
  }
}

.company-card-content {
  padding: 16px 0;
}

.company-name {
  padding-bottom: 12px;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  text-align: center;
  border-bottom: 1px solid #ebeef5;
}

.tax-calculation {
  max-width: 400px;
  padding: 12px 16px;
  margin: 0;
  font-family:
    "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.6;
  color: #303133;
  letter-spacing: 0.5px;
  white-space: pre;
  background: #fff;
}

.filter-section {
  padding: 16px 0;
  padding-right: 16px;
  padding-left: 16px;
  margin: 0 -16px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.company-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: #909399;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background-color: #ebeef5;
}

// 上传组件样式
.invoice-uploader {
  :deep(.el-upload) {
    .el-upload-dragger {
      width: auto;
      height: auto;
      background: transparent;
      border: none;
    }
  }
}

.ml-2 {
  margin-left: 8px;
}

// 下拉式月份选择器样式
.month-selector-dropdown {
  position: relative;
  display: inline-block;
}

.month-selector-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 120px;
  height: 32px;
  padding: 0 8px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    border-color: #409eff;
  }

  &:focus {
    outline: none;
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgb(64 158 255 / 20%);
  }
}

.selector-arrow {
  margin-left: 8px;
  font-size: 12px;
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(180deg);
  }
}

.month-selector-popup {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 9999;
  width: 200px;
  max-height: 160px;
  padding: 8px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.month-button {
  min-height: 28px;
  padding: 4px 2px;
  font-size: 12px;
  color: #606266;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  background: #fff;
  border: 1px solid transparent;
  border-radius: 3px;
  transition: all 0.2s;

  &:hover {
    color: #409eff;
    background: #f5f7fa;
    border-color: #c6e2ff;
  }

  &.active {
    color: #fff;
    background: #409eff;
    border-color: #409eff;
  }
}

// 确保月份选择器在筛选区域中的布局
.flex {
  .month-selector-dropdown {
    flex-shrink: 0;
  }
}

// 发票文件管理区域样式
.invoice-file-section {
  .file-info {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 12px;
    background-color: #f8f9fa;
    border: 1px solid #e4e7ed;
    border-radius: 6px;

    .file-icon {
      margin-right: 8px;
      font-size: 16px;
      color: #409eff;
    }

    .file-name {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }
  }

  .file-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.no-file {
  text-align: center;
  background-color: #fafbfc;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;

  .no-file-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    padding: 20px;
  }

  .no-file-text {
    font-size: 14px;
    color: #909399;
  }
}
</style>
