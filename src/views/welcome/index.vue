<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from "vue";
import { useRouter } from "vue-router";
import {
  getCustomerStatistics,
  getCompanyDebtStatistics,
  type CompanyDebtStatistic
} from "@/api/customer";
import {
  getSupplierStatistics,
  getSupplierList,
  type Supplier
} from "@/api/supplier";
import { getContractStatistics, getContractList } from "@/api/business";
import {
  getSalesInvoiceStats,
  getPurchaseInvoiceStatsGrouped,
  type CompanyStats
} from "@/api/invoice";
import {
  getCompanyProfitStatistics,
  type CompanyProfitStats
} from "@/api/profit";
import { getExpenseStatistics } from "@/api/expense";
import { ElMessage } from "element-plus";
import echarts from "@/plugins/echarts";
import {
  Wallet,
  OfficeBuilding,
  Money,
  TrendCharts,
  Goods,
  Coin,
  User,
  Timer,
  Postcard,
  ArrowRight,
  List
} from "@element-plus/icons-vue";

defineOptions({
  name: "Welcome"
});

const router = useRouter();
const totalDebt = ref(0);
const totalPayable = ref(0);
const currentYearSales = ref(0);
const currentYearExpenses = ref(0);
const currentYearProfit = ref(0);
const currentYear = ref(new Date().getFullYear());
const loading = ref(false);
const companyDebtStats = ref<CompanyDebtStatistic[]>([]);
const supplierList = ref<Supplier[]>([]);
const companySalesList = ref<
  Array<{ name: string; sales: number; color?: string }>
>([]);
const companyMonthlySales = ref<Map<string, { [key: string]: number }>>(
  new Map()
);
const xAxisData = ref<string[]>([]);
const expenseCategoryStats = ref<
  Array<{ category: string; amount: number; percentage: number }>
>([]);
const invoiceStats = ref<CompanyStats[]>([]);
const purchaseInvoiceStats = ref<CompanyStats[]>([]);
const companyProfitStats = ref<CompanyProfitStats[]>([]);
const salesChartRef = ref<HTMLElement | null>(null);
const currentMonth = ref(new Date().getMonth() + 1);

// 顶部统计卡片数据
const topStats = computed(() => [
  {
    title: "客户总欠款",
    value: `¥ ${Number(totalDebt.value).toLocaleString()}`,
    icon: Wallet,
    chartColor: "#409eff",
    bgClass: "bg-blue",
    chartPath: "M0 18 C 20 18 20 8 40 8 S 60 15 80 5"
  },
  {
    title: "供应商欠款",
    value: `¥ ${Number(totalPayable.value).toLocaleString()}`,
    icon: Money,
    chartColor: "#f56c6c",
    bgClass: "bg-red",
    chartPath: "M0 15 C 15 15 25 22 40 12 S 65 5 80 10"
  },
  {
    title: `${currentYear.value}年度总销售额`,
    value: `¥ ${Number(currentYearSales.value).toLocaleString()}`,
    icon: TrendCharts,
    chartColor: "#67c23a",
    bgClass: "bg-green",
    chartPath: "M0 20 C 20 20 30 5 50 10 S 70 2 80 5"
  },
  {
    title: `${currentYear.value}年度总费用`,
    value: `¥ ${Number(currentYearExpenses.value).toLocaleString()}`,
    icon: Goods,
    chartColor: "#e6a23c",
    bgClass: "bg-orange",
    chartPath: "M0 18 C 20 18 35 10 50 12 S 70 5 80 8"
  },
  {
    title: `${currentYear.value}年度总利润`,
    value: `¥ ${Number(currentYearProfit.value).toLocaleString()}`,
    icon: Coin,
    chartColor: "#a0cfff",
    bgClass: "bg-purple",
    chartPath: "M0 22 C 15 22 25 10 40 12 S 65 0 80 2"
  }
]);

const initSalesChart = () => {
  if (salesChartRef.value) {
    const myChart = echarts.init(salesChartRef.value);

    // Define colors for specific companies or default colors
    const companyColors: Record<string, string> = {
      内蒙古昇民贸易有限公司: "#409eff",
      内蒙古乾塑环保材料有限公司: "#67c23a",
      内蒙古聚昌泰贸易有限公司: "#e6a23c"
    };
    const defaultColors = ["#f56c6c", "#a0cfff", "#909399"];

    // Prepare series data from companyMonthlySales
    const seriesData = [];
    let colorIndex = 0;

    // Sort companies by total sales descending (same as list order) to keep legend consistent
    const sortedCompanies = Array.from(companyMonthlySales.value.keys()).sort(
      (a, b) => {
        const salesA = Object.values(
          companyMonthlySales.value.get(a) || {}
        ).reduce((sum, val) => sum + val, 0);
        const salesB = Object.values(
          companyMonthlySales.value.get(b) || {}
        ).reduce((sum, val) => sum + val, 0);
        return salesB - salesA;
      }
    );

    for (const company of sortedCompanies) {
      const companyDataMap = companyMonthlySales.value.get(company) || {};
      const data = xAxisData.value.map(dateKey => companyDataMap[dateKey] || 0);
      const color =
        companyColors[company] ||
        defaultColors[colorIndex++ % defaultColors.length];

      seriesData.push({
        name: company,
        type: "bar",
        // stack: 'total', // Removed to display bars grouped side-by-side
        barWidth: "15%", // Reduced bar width to fit side-by-side bars
        barGap: "10%", // Small gap between bars in same group
        data: data,
        itemStyle: { color: color },
        label: {
          show: false
        }
      });
    }

    // Fallback if no data
    if (seriesData.length === 0) {
      seriesData.push({
        data: new Array(xAxisData.value.length).fill(0),
        type: "bar",
        barWidth: "40%",
        itemStyle: { color: "#ddd" }
      });
    }

    const option = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "none" }, // Disable shadow on hover
        confine: true, // Ensure tooltip stays within chart container
        padding: 8, // Reduce padding to make tooltip smaller
        textStyle: { fontSize: 12 }, // Reduce font size slightly
        formatter: (params: any) => {
          let result = "";
          if (params.length > 0) {
            result += `<div style="margin-bottom: 4px; font-weight: bold; color: #666;">${params[0].name}</div>`;
          }
          params.forEach((item: any) => {
            if (item.value > 0) {
              // Extract abbreviation from full name for tooltip
              let abbr = item.seriesName;
              if (item.seriesName.includes("昇民")) abbr = "昇民";
              else if (item.seriesName.includes("乾塑")) abbr = "乾塑";
              else if (item.seriesName.includes("聚昌泰")) abbr = "聚昌泰";

              result += `${item.marker} ${abbr}: ${item.value.toLocaleString()}<br/>`;
            }
          });
          return result;
        }
      },
      legend: {
        show: false // Hide chart legend as it is now above the chart
      },
      grid: {
        top: "10%",
        left: "2%", // Reduced left margin to balance
        right: "5%", // Increased right margin further to avoid scrollbar trigger
        bottom: "3%",
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: xAxisData.value,
        axisLine: { lineStyle: { color: "#ddd" } },
        axisLabel: {
          color: "#666",
          formatter: (value: string) => {
            const parts = value.split("-");
            if (parts.length === 2) {
              return `${parts[0]}\n${Number(parts[1])}月`;
            }
            return value;
          }
        }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed", color: "#eee" } }
      },
      series: seriesData
    };
    myChart.setOption(option);

    window.addEventListener("resize", () => myChart.resize());
  }
};

const goTo = (path: string) => {
  if (path) {
    router.push(path);
  } else {
    ElMessage.info("功能开发中...");
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const [
      customerRes,
      companyRes,
      supplierRes,
      supplierListRes,
      contractRes,
      expenseRes,
      contractListRes,
      invoiceRes,
      purchaseInvoiceRes,
      profitRes
    ] = await Promise.all([
      getCustomerStatistics(),
      getCompanyDebtStatistics(),
      getSupplierStatistics(),
      getSupplierList({ pageSize: 100 }),
      getContractStatistics(currentYear.value),
      getExpenseStatistics({ year: currentYear.value }),
      getContractList({
        contract_year: currentYear.value,
        pageSize: 1000,
        status: 1
      }),
      getSalesInvoiceStats(
        undefined,
        new Date().getFullYear(),
        new Date().getMonth() + 1
      ),
      getPurchaseInvoiceStatsGrouped(
        undefined,
        new Date().getFullYear(),
        new Date().getMonth() + 1
      ),
      getCompanyProfitStatistics(currentYear.value)
    ]);

    if (profitRes.success) {
      companyProfitStats.value = profitRes.data;
    }

    if (customerRes.success) {
      totalDebt.value = customerRes.data.totalDebt;
    }

    if (companyRes.success) {
      companyDebtStats.value = companyRes.data;
    }

    if (supplierRes.success) {
      totalPayable.value = supplierRes.data.totalPayable;
    }

    if (supplierListRes.success) {
      supplierList.value = supplierListRes.data.list;
    }

    if (
      contractListRes &&
      contractListRes.data &&
      Array.isArray(contractListRes.data.list)
    ) {
      // Generate x-axis data based on Gregorian Year
      const year = currentYear.value;
      const months: string[] = [];
      for (let m = 1; m <= 12; m++) {
        months.push(`${year}-${String(m).padStart(2, "0")}`);
      }
      xAxisData.value = months;

      const contracts = contractListRes.data.list;
      const salesMap = new Map<string, number>();
      const monthlySalesMap = new Map<string, Record<string, number>>();

      contracts.forEach((contract: any) => {
        // Try to get company name from different possible fields
        let companyName =
          contract.company_name ||
          contract.companies?.company_name ||
          "未知公司";

        // Normalize company name
        if (companyName.includes("昇民"))
          companyName = "内蒙古昇民贸易有限公司";
        else if (companyName.includes("乾塑"))
          companyName = "内蒙古乾塑环保材料有限公司";
        else if (companyName.includes("聚昌泰"))
          companyName = "内蒙古聚昌泰贸易有限公司";
        else
          companyName = companyName
            .replace(/上海|有限公司|科技|实业|贸易/g, "")
            .substring(0, 4);

        const amount = Number(contract.contract_amount || 0);

        // Update total sales per company
        if (salesMap.has(companyName)) {
          salesMap.set(companyName, salesMap.get(companyName)! + amount);
        } else {
          salesMap.set(companyName, amount);
        }

        // Update monthly sales per company (Gregorian month within Lunar range)
        const dateStr = contract.contract_date || contract.created_at;
        if (dateStr) {
          try {
            const date = new Date(dateStr);
            const yStr = date.getFullYear();
            const mStr = String(date.getMonth() + 1).padStart(2, "0");
            const key = `${yStr}-${mStr}`;

            // Only count if within the range
            if (months.includes(key)) {
              if (!monthlySalesMap.has(companyName)) {
                monthlySalesMap.set(companyName, {});
              }
              const currentSales = monthlySalesMap.get(companyName)!;
              currentSales[key] = (currentSales[key] || 0) + amount;
            }
          } catch (e) {
            console.warn("Date parsing error", e);
          }
        }
      });

      companySalesList.value = Array.from(salesMap.entries())
        .map(([name, sales]) => {
          let fullName = name;
          if (name.includes("昇民")) fullName = "内蒙古昇民贸易有限公司";
          else if (name.includes("乾塑"))
            fullName = "内蒙古乾塑环保材料有限公司";
          else if (name.includes("聚昌泰"))
            fullName = "内蒙古聚昌泰贸易有限公司";

          return { name: fullName, sales };
        })
        .filter(item => item.sales > 0)
        .sort((a, b) => b.sales - a.sales);

      // Assign colors to company list
      const companyColors: Record<string, string> = {
        内蒙古昇民贸易有限公司: "#409eff",
        内蒙古乾塑环保材料有限公司: "#67c23a",
        内蒙古聚昌泰贸易有限公司: "#e6a23c"
      };
      const defaultColors = ["#f56c6c", "#a0cfff", "#909399"];
      let colorIndex = 0;

      companySalesList.value.forEach(item => {
        item.color =
          companyColors[item.name] ||
          defaultColors[colorIndex++ % defaultColors.length];
      });

      companyMonthlySales.value = monthlySalesMap;

      // Re-initialize chart after data update
      nextTick(() => {
        initSalesChart();
      });
    }

    if (contractRes.success && expenseRes.success) {
      currentYearSales.value = contractRes.data.total_sales;

      const syncedExpenses = contractRes.data.total_expense || 0;
      const totalExpenses = expenseRes.data.totalExpenses || 0;
      const extraExpenses = Math.max(0, totalExpenses - syncedExpenses);

      currentYearProfit.value = contractRes.data.total_profit - extraExpenses;
    } else if (contractRes.success) {
      currentYearSales.value = contractRes.data.total_sales;
      currentYearProfit.value = contractRes.data.total_profit;
    }

    if (expenseRes.success) {
      currentYearExpenses.value = expenseRes.data.totalExpenses;
      expenseCategoryStats.value = expenseRes.data.categoryStatistics || [];
    }

    if (invoiceRes.success && Array.isArray(invoiceRes.data)) {
      invoiceStats.value = invoiceRes.data.filter(
        (item: CompanyStats) => item.monthlySales > 0
      );
    }

    if (purchaseInvoiceRes.success && Array.isArray(purchaseInvoiceRes.data)) {
      purchaseInvoiceStats.value = purchaseInvoiceRes.data.filter(
        (item: CompanyStats) => item.monthlyPurchase && item.monthlyPurchase > 0
      );
    }
  } catch (error) {
    console.error("获取统计数据失败:", error);
    ElMessage.error("获取数据失败");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
  nextTick(() => {
    setTimeout(initSalesChart, 500);
  });
});
</script>

<template>
  <div class="welcome-container">
    <!-- Row 1: 顶部5个统计卡片 (保持不变) -->
    <div class="top-stats-container">
      <div
        v-for="(item, index) in topStats"
        :key="index"
        v-loading="loading"
        class="top-stat-card"
      >
        <div class="card-header">
          <span class="card-title">{{ item.title }}</span>
          <div class="card-icon" :class="item.bgClass">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
        </div>

        <div class="card-body">
          <div class="card-value">{{ item.value }}</div>
          <div class="card-footer">
            <div class="mini-chart">
              <svg
                width="80"
                height="24"
                viewBox="0 0 80 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  :d="item.chartPath"
                  :stroke="item.chartColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  style="filter: drop-shadow(0 2px 4px rgb(0 0 0 / 10%))"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2: 客户欠款、供应商欠款、年度销售图表 -->
    <div class="grid grid-cols-5 gap-4 mb-4">
      <!-- 卡片1: 客户总欠款 -->
      <div class="col-span-1">
        <el-card v-loading="loading" shadow="never" class="stat-card">
          <template #header>
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-800">客户总欠款</span>
              <span
                class="text-xs text-gray-400 cursor-pointer hover:text-blue-500"
                @click="goTo('/customer/index')"
                >全部客户 <el-icon class="align-middle"><ArrowRight /></el-icon
              ></span>
            </div>
          </template>
          <div class="mt-1 h-[260px] overflow-y-auto scrollbar-hidden">
            <div v-if="companyDebtStats.length > 0">
              <div
                v-for="(company, index) in companyDebtStats"
                :key="index"
                class="mb-3"
              >
                <div
                  class="font-medium text-sm text-gray-800 mb-1 flex justify-between items-center bg-gray-50 px-2 py-1 rounded"
                >
                  <span>{{ company.name }}</span>
                  <span class="text-blue-500 font-bold"
                    >¥ {{ company.totalDebt.toLocaleString() }}</span
                  >
                </div>
                <div class="pl-2 pr-1">
                  <div
                    v-for="(customer, cIndex) in company.customers"
                    :key="cIndex"
                    class="flex justify-between items-center py-1 text-xs border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-1 transition-colors"
                  >
                    <span
                      class="text-gray-500 truncate flex-1 mr-2"
                      :title="customer.name"
                      >{{ customer.name }}</span
                    >
                    <span class="text-gray-700"
                      >¥ {{ customer.debt.toLocaleString() }}</span
                    >
                  </div>
                  <div
                    v-if="!company.customers || company.customers.length === 0"
                    class="text-xs text-gray-400 py-1 pl-1"
                  >
                    暂无客户欠款
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="flex h-full items-center justify-center text-gray-400 text-sm"
            >
              暂无欠款数据
            </div>
          </div>
        </el-card>
      </div>

      <!-- 卡片2: 供应商欠款 -->
      <div class="col-span-1">
        <el-card
          v-loading="loading"
          shadow="never"
          class="stat-card relative overflow-hidden"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-800">供应商欠款</span>
              <span
                class="text-xs text-gray-400 cursor-pointer hover:text-blue-500"
                @click="goTo('/supplier/index')"
                >全部供应商
                <el-icon class="align-middle"><ArrowRight /></el-icon
              ></span>
            </div>
          </template>
          <div class="mt-1 h-[260px] overflow-y-auto scrollbar-hidden">
            <div v-if="supplierList.length > 0">
              <div
                v-for="(supplier, index) in supplierList"
                :key="index"
                class="mb-2"
              >
                <div
                  class="font-medium text-sm text-gray-800 flex justify-between items-center bg-gray-50 px-2 py-2 rounded hover:bg-gray-100 transition-colors"
                >
                  <span class="truncate mr-2" :title="supplier.name">{{
                    supplier.name
                  }}</span>
                  <span class="text-red-500 font-bold whitespace-nowrap"
                    >¥ {{ supplier.totalPayable.toLocaleString() }}</span
                  >
                </div>
              </div>
            </div>
            <div
              v-else
              class="flex h-full items-center justify-center text-gray-400 text-sm"
            >
              暂无欠款数据
            </div>
          </div>
        </el-card>
      </div>

      <!-- 卡片3: 年度总销售 (柱状图) - 占3列 -->
      <div class="col-span-3">
        <el-card
          shadow="never"
          class="stat-card h-full"
          :body-style="{
            padding: '10px',
            height: 'calc(100% - 50px)',
            display: 'flex',
            flexDirection: 'column'
          }"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-800"
                >{{ currentYear }}年度总销售额</span
              >
            </div>
          </template>
          <div v-if="companySalesList.length > 0" class="px-2 pt-2 mb-2">
            <div
              class="flex flex-wrap items-center justify-center text-sm gap-x-32 gap-y-2"
            >
              <div
                v-for="item in companySalesList"
                :key="item.name"
                class="flex flex-col items-center"
              >
                <span
                  class="text-gray-800 font-bold text-xl whitespace-nowrap mb-1"
                  >{{ Math.round(item.sales) }}</span
                >
                <span
                  class="text-gray-500 text-sm"
                  :style="{ color: item.color }"
                  >{{ item.name }}</span
                >
              </div>
            </div>
          </div>
          <div
            v-else
            class="px-2 pt-2 mb-2 flex items-center justify-center text-gray-400 text-sm"
          >
            暂无公司销售数据
          </div>
          <div
            ref="salesChartRef"
            class="flex-1 w-full"
            style="min-height: 200px"
          />
        </el-card>
      </div>
    </div>

    <!-- Row 3: 费用统计、空白、空白、招聘&绩效 -->
    <div class="grid grid-cols-5 gap-4">
      <!-- 卡片1: 费用统计 -->
      <div class="col-span-1">
        <el-card v-loading="loading" shadow="never" class="stat-card">
          <template #header>
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-800">费用统计</span>
              <span
                class="text-xs text-gray-400 cursor-pointer hover:text-blue-500"
                @click="goTo('/expense/index')"
                >费用明细 <el-icon class="align-middle"><ArrowRight /></el-icon
              ></span>
            </div>
          </template>
          <div class="mt-0 h-[260px] overflow-y-auto scrollbar-hidden">
            <div v-if="expenseCategoryStats.length > 0">
              <div
                v-for="(category, index) in expenseCategoryStats"
                :key="index"
                class="expense-item-row"
              >
                <div class="expense-name" :title="category.category">
                  {{ category.category }}
                </div>
                <div class="expense-bar-container">
                  <div
                    class="expense-bar-wrapper"
                    :style="{ width: `${category.percentage}%` }"
                  >
                    <div class="expense-bar" />
                    <span class="expense-amount-inner">{{
                      Math.round(category.amount).toLocaleString()
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="no-data">暂无费用数据</div>
          </div>
        </el-card>
      </div>

      <!-- 卡片2: 发票管理 -->
      <div class="col-span-1">
        <el-card
          v-loading="loading"
          shadow="never"
          class="stat-card relative overflow-hidden"
        >
          <div class="watermark">{{ currentMonth }}</div>
          <template #header>
            <div class="flex justify-between items-center relative z-10">
              <span class="text-sm font-medium text-gray-800">发票管理</span>
              <span
                class="text-xs text-gray-400 cursor-pointer hover:text-blue-500"
                @click="goTo('/invoice/index')"
                >全部发票 <el-icon class="align-middle"><ArrowRight /></el-icon
              ></span>
            </div>
          </template>
          <div
            class="mt-1 h-[260px] overflow-y-auto scrollbar-hidden relative z-10"
          >
            <div v-if="invoiceStats.length > 0">
              <div
                v-for="(company, index) in invoiceStats"
                :key="index"
                class="mb-3"
              >
                <div
                  class="font-medium text-sm text-gray-800 mb-1 flex justify-between items-center bg-gray-50/80 px-2 py-1 rounded backdrop-blur-sm"
                >
                  <span>{{ company.companyName }}</span>
                  <span class="text-blue-500 font-bold"
                    >¥ {{ company.monthlySales.toLocaleString() }}</span
                  >
                </div>
                <div class="pl-2 pr-1">
                  <div
                    v-for="(buyer, bIndex) in company.buyers"
                    :key="bIndex"
                    class="flex justify-between items-center py-1 text-xs border-b border-gray-50 last:border-0 hover:bg-gray-50/80 rounded px-1 transition-colors"
                  >
                    <span
                      class="text-gray-500 truncate flex-1 mr-2"
                      :title="buyer.name"
                      >{{ buyer.name }}</span
                    >
                    <span class="text-gray-700"
                      >¥ {{ buyer.amount.toLocaleString() }}</span
                    >
                  </div>
                  <div
                    v-if="!company.buyers || company.buyers.length === 0"
                    class="text-xs text-gray-400 py-1 pl-1"
                  >
                    暂无开票明细
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="flex h-full items-center justify-center text-gray-400 text-sm"
            >
              暂无开票数据
            </div>
          </div>
        </el-card>
      </div>

      <!-- 卡片3: 进项管理 -->
      <div class="col-span-1">
        <el-card
          v-loading="loading"
          shadow="never"
          class="stat-card relative overflow-hidden"
        >
          <div class="watermark">{{ currentMonth }}</div>
          <template #header>
            <div class="flex justify-between items-center relative z-10">
              <span class="text-sm font-medium text-gray-800">进项管理</span>
              <span
                class="text-xs text-gray-400 cursor-pointer hover:text-blue-500"
                @click="goTo('/invoice/index')"
                >全部进项 <el-icon class="align-middle"><ArrowRight /></el-icon
              ></span>
            </div>
          </template>
          <div
            class="mt-1 h-[260px] overflow-y-auto scrollbar-hidden relative z-10"
          >
            <div v-if="purchaseInvoiceStats.length > 0">
              <div
                v-for="(company, index) in purchaseInvoiceStats"
                :key="index"
                class="mb-3"
              >
                <div
                  class="font-medium text-sm text-gray-800 mb-1 flex justify-between items-center bg-gray-50/80 px-2 py-1 rounded backdrop-blur-sm"
                >
                  <div class="flex flex-col">
                    <span>{{ company.companyName }}</span>
                    <span
                      v-if="company.pendingPurchaseCount"
                      class="text-xs text-orange-500 mt-0.5"
                    >
                      待开进项: {{ company.pendingPurchaseCount }} 笔
                    </span>
                  </div>
                  <span class="text-blue-500 font-bold"
                    >¥ {{ company.monthlyPurchase?.toLocaleString() }}</span
                  >
                </div>
                <div class="pl-2 pr-1">
                  <div
                    v-for="(seller, sIndex) in company.sellers"
                    :key="sIndex"
                    class="flex justify-between items-center py-1 text-xs border-b border-gray-50 last:border-0 hover:bg-gray-50/80 rounded px-1 transition-colors"
                  >
                    <span
                      class="text-gray-500 truncate flex-1 mr-2"
                      :title="seller.name"
                      >{{ seller.name }}</span
                    >
                    <span class="text-gray-700"
                      >¥ {{ seller.amount.toLocaleString() }}</span
                    >
                  </div>
                  <div
                    v-if="!company.sellers || company.sellers.length === 0"
                    class="text-xs text-gray-400 py-1 pl-1"
                  >
                    暂无进项明细
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="flex h-full items-center justify-center text-gray-400 text-sm"
            >
              暂无进项数据
            </div>
          </div>
        </el-card>
      </div>

      <!-- 卡片4: 年度公司利润 -->
      <div class="col-span-2">
        <el-card
          shadow="never"
          class="stat-card h-full"
          :body-style="{ padding: '15px' }"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-800"
                >{{ currentYear }}年度公司利润</span
              >
            </div>
          </template>
          <div class="mt-1 h-[260px] overflow-y-auto scrollbar-hidden">
            <div v-if="companyProfitStats.length > 0">
              <div
                v-for="company in companyProfitStats"
                :key="company.companyId"
                class="mb-4 pb-4 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0"
              >
                <div class="flex justify-between items-center mb-3">
                  <div class="flex items-center">
                    <span class="font-bold text-gray-900 text-sm">{{
                      company.companyName
                    }}</span>
                  </div>
                  <div
                    class="text-right flex items-center bg-gray-50 px-3 py-1 rounded-full"
                  >
                    <span class="text-xs text-gray-600 mr-2">净利润</span>
                    <span
                      :class="
                        company.netProfit >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      "
                      class="font-bold text-sm"
                    >
                      ¥{{ Math.round(company.netProfit).toLocaleString() }}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-5 gap-2 text-xs">
                  <!-- Sales -->
                  <div class="flex flex-col items-center">
                    <div
                      class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-1 text-blue-600"
                    >
                      <el-icon><TrendCharts /></el-icon>
                    </div>
                    <span class="text-gray-600 scale-90 mb-0.5">总销售额</span>
                    <span class="text-gray-900 font-medium"
                      >¥{{
                        Math.round(company.totalSales).toLocaleString()
                      }}</span
                    >
                  </div>

                  <!-- Purchase -->
                  <div class="flex flex-col items-center">
                    <div
                      class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mb-1 text-purple-600"
                    >
                      <el-icon><Goods /></el-icon>
                    </div>
                    <span class="text-gray-600 scale-90 mb-0.5">进货成本</span>
                    <span class="text-gray-900 font-medium"
                      >¥{{
                        Math.round(company.totalPurchase).toLocaleString()
                      }}</span
                    >
                  </div>

                  <!-- Project Expense -->
                  <div class="flex flex-col items-center">
                    <div
                      class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mb-1 text-orange-600"
                    >
                      <el-icon><List /></el-icon>
                    </div>
                    <span class="text-gray-600 scale-90 mb-0.5">项目费用</span>
                    <span class="text-gray-900 font-medium"
                      >¥{{
                        Math.round(company.projectExpense || 0).toLocaleString()
                      }}</span
                    >
                  </div>

                  <!-- Tax -->
                  <div class="flex flex-col items-center">
                    <div
                      class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mb-1 text-red-600"
                    >
                      <el-icon><Money /></el-icon>
                    </div>
                    <span class="text-gray-600 scale-90 mb-0.5">预估税费</span>
                    <span class="text-gray-900 font-medium"
                      >¥{{
                        Math.round(company.totalTax || 0).toLocaleString()
                      }}</span
                    >
                  </div>

                  <!-- Operation Expense -->
                  <div class="flex flex-col items-center">
                    <div
                      class="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mb-1 text-green-600"
                    >
                      <el-icon><OfficeBuilding /></el-icon>
                    </div>
                    <span class="text-gray-600 scale-90 mb-0.5">运营费用</span>
                    <span class="text-gray-900 font-medium"
                      >¥{{
                        Math.round(
                          company.operationExpense || 0
                        ).toLocaleString()
                      }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="flex h-full items-center justify-center text-gray-400 text-sm flex-col"
            >
              <el-icon class="text-4xl mb-2 text-gray-300"><Coin /></el-icon>
              <span>暂无年度利润数据</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-container {
  padding: 8px;
  background-color: transparent;
}

/* 顶部统计卡片容器 */
.top-stats-container {
  display: flex;
  gap: 16px;
  padding: 5px 2px 10px;
  margin-bottom: 8px;
  overflow-x: auto;
}

/* 顶部统计卡片样式 */
.top-stat-card {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  min-width: 220px;
  padding: 20px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.top-stat-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgb(0 0 0 / 5%);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #909399;
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  border-radius: 6px;
}

.bg-blue {
  color: #409eff;
  background-color: #ecf5ff;
}

.bg-red {
  color: #f56c6c;
  background-color: #fef0f0;
}

.bg-green {
  color: #67c23a;
  background-color: #f0f9eb;
}

.bg-orange {
  color: #e6a23c;
  background-color: #fdf6ec;
}

.bg-purple {
  color: #79bbff;
  background-color: #f2f6fc;
}

.card-body {
  display: flex;
  flex-direction: column;
}

.card-value {
  margin-bottom: 8px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  color: #303133;
}

.card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  margin-top: 4px;
}

.mini-chart {
  opacity: 0.8;
  transition: opacity 0.3s;
}

.top-stat-card:hover .mini-chart {
  opacity: 1;
  transform: scale(1.02);
}

/* 通用统计卡片 */
.stat-card {
  height: 100%;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgb(0 0 0 / 5%);
  transform: translateY(-2px);
}

.stat-card :deep(.el-card__header) {
  padding-bottom: 0;
  border-bottom: none;
}

/* 隐藏滚动条但保留滚动功能 */
.scrollbar-hidden {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.scrollbar-hidden::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.expense-list-container {
  height: 100%;
  max-height: 200px; /* 限制高度 */
}

.expense-item-row {
  display: flex;
  align-items: center;
  padding: 2px 0;
  font-size: 12px;
}

.expense-name {
  width: 60px;
  margin-right: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #606266;
  text-align: right;
  white-space: nowrap;
}

.expense-bar-container {
  display: flex;
  flex: 1;
  align-items: center;
  height: 14px;
  margin-right: 8px;
  overflow: visible;
  background-color: transparent;
}

.expense-bar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
}

.expense-bar {
  width: 100%;
  height: 100%;
  background-color: #409eff;
  border-radius: 0;
}

.expense-amount-inner {
  margin-left: 6px;
  font-size: 12px;
  line-height: 1;
  color: #606266;
  white-space: nowrap;
}

.no-data {
  padding: 12px;
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
}

/* Utility classes for Tailwind-like behavior if Tailwind is not fully effective */
.grid {
  display: grid;
}

.grid-cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.grid-cols-5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.grid-cols-6 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.gap-4 {
  gap: 16px;
}

.col-span-1 {
  grid-column: span 1 / span 1;
}

.col-span-2 {
  grid-column: span 2 / span 2;
}

.col-span-3 {
  grid-column: span 3 / span 3;
}

.col-span-4 {
  grid-column: span 4 / span 4;
}

.mb-4 {
  margin-bottom: 16px;
}

.h-full {
  height: 100%;
}

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.justify-center {
  justify-content: center;
}

.text-sm {
  font-size: 14px;
}

.text-xs {
  font-size: 12px;
}

.text-2xl {
  font-size: 24px;
}

.font-bold {
  font-weight: 700;
}

.font-medium {
  font-weight: 500;
}

.text-gray-500 {
  color: #909399;
}

.text-gray-800 {
  color: #303133;
}

.text-gray-400 {
  color: #c0c4cc;
}

.text-blue-500 {
  color: #409eff;
}

.text-red-500 {
  color: #f56c6c;
}

.bg-blue-50 {
  background-color: #ecf5ff;
}

.bg-red-50 {
  background-color: #fef0f0;
}

.rounded-lg {
  border-radius: 8px;
}

.w-8 {
  width: 32px;
}

.h-8 {
  height: 32px;
}

.p-2 {
  padding: 8px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.border-dashed {
  border-style: dashed;
}

.border-b-0 {
  border-bottom-width: 0;
}

.pb-0 {
  padding-bottom: 0;
}

.bg-gray-50 {
  background-color: #f9fafc;
}

.hover\:bg-gray-100:hover {
  background-color: #f5f7fa;
}

.transition {
  transition: all 0.3s;
}

.cursor-pointer {
  cursor: pointer;
}

.text-4xl {
  font-size: 36px;
}

.mb-2 {
  margin-bottom: 8px;
}

.watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  font-family: Arial, sans-serif;
  font-size: 160px;
  font-weight: 800;
  line-height: 1;
  color: rgb(64 158 255 / 5%);
  pointer-events: none;
  transform: translate(-50%, -50%);
}

/* 确保内容在水印之上 */
.stat-card .el-card__body {
  position: relative;
  z-index: 2;
}
</style>
