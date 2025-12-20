import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import Welcome from "../index.vue";

function createElStub() {
  return defineComponent({
    name: "ElStub",
    setup(_, { slots, attrs }) {
      return () =>
        h("div", attrs, [
          slots.header?.(),
          slots.default?.(),
          slots.footer?.()
        ]);
    }
  });
}

const routerPush = vi.fn();
const chartSetOption = vi.fn();
const chartResize = vi.fn();
const chartDispose = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: routerPush })
}));

vi.mock("@/plugins/echarts", () => ({
  default: {
    init: () => ({
      setOption: chartSetOption,
      resize: chartResize,
      dispose: chartDispose
    }),
    getInstanceByDom: () => null
  }
}));

vi.mock("@element-plus/icons-vue", () => {
  const makeIcon = (name: string) =>
    defineComponent({
      name,
      setup(_, { slots }) {
        return () => slots.default?.() ?? h("span", name);
      }
    });
  return {
    Wallet: makeIcon("Wallet"),
    OfficeBuilding: makeIcon("OfficeBuilding"),
    Money: makeIcon("Money"),
    TrendCharts: makeIcon("TrendCharts"),
    Goods: makeIcon("Goods"),
    Coin: makeIcon("Coin"),
    User: makeIcon("User"),
    Timer: makeIcon("Timer"),
    Postcard: makeIcon("Postcard"),
    ArrowRight: makeIcon("ArrowRight"),
    List: makeIcon("List")
  };
});

vi.mock("element-plus", () => {
  const ElMessage = { info: vi.fn(), error: vi.fn() };
  const elStub = createElStub();
  return {
    ElMessage,
    ElCard: elStub,
    ElIcon: elStub,
    ElEmpty: elStub,
    ElButton: elStub,
    ElSkeleton: elStub,
    ElSkeletonItem: elStub
  };
});

vi.mock("@/api/customer", () => ({
  getCustomerStatistics: vi.fn(() =>
    Promise.resolve({ success: true, data: { totalDebt: 123456 } })
  ),
  getCompanyDebtStatistics: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          name: "测试公司A",
          totalDebt: 5000,
          customers: [{ name: "客户1", debt: 3000 }]
        }
      ]
    })
  )
}));

vi.mock("@/api/supplier", () => ({
  getSupplierStatistics: vi.fn(() =>
    Promise.resolve({ success: true, data: { totalPayable: 98765 } })
  ),
  getSupplierList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { list: [{ name: "供应商1", totalPayable: 2000 }] }
    })
  )
}));

vi.mock("@/api/business", () => ({
  getContractStatistics: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { total_sales: 500000, total_expense: 80000, total_profit: 200000 }
    })
  ),
  getContractList: vi.fn(() =>
    Promise.resolve({
      data: {
        list: [
          {
            contract_amount: 100000,
            contract_date: "2024-02-15",
            company_name: "内蒙古昇民贸易有限公司"
          }
        ]
      }
    })
  )
}));

vi.mock("@/api/expense", () => ({
  getExpenseStatistics: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        totalExpenses: 120000,
        categoryStatistics: [
          { category: "差旅", amount: 20000, percentage: 20 }
        ]
      }
    })
  )
}));

vi.mock("@/api/invoice", () => ({
  getSalesInvoiceStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          companyName: "昇民",
          monthlySales: 150000,
          buyers: [{ name: "买方A", amount: 150000 }]
        }
      ]
    })
  ),
  getPurchaseInvoiceStatsGrouped: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          companyName: "昇民",
          monthlyPurchase: 80000,
          pendingPurchaseCount: 1,
          sellers: [{ name: "卖方A", amount: 80000 }]
        }
      ]
    })
  )
}));

vi.mock("@/api/profit", () => ({
  getCompanyProfitStatistics: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          companyId: 1,
          companyName: "昇民",
          totalSales: 200000,
          totalPurchase: 80000,
          projectExpense: 10000,
          totalTax: 5000,
          operationExpense: 3000,
          netProfit: 107000
        }
      ]
    })
  )
}));

describe("Welcome page", () => {
  const elStub = createElStub();
  const mountOptions = {
    global: {
      directives: { loading: () => undefined },
      components: {
        "el-card": elStub,
        ElCard: elStub,
        "el-icon": elStub,
        ElIcon: elStub,
        "el-empty": elStub,
        ElEmpty: elStub,
        "el-button": elStub,
        ElButton: elStub,
        "el-skeleton": elStub,
        ElSkeleton: elStub,
        "el-skeleton-item": elStub,
        ElSkeletonItem: elStub
      }
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    routerPush.mockReset();
    chartSetOption.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders top stats with fetched data", async () => {
    const wrapper = mount(Welcome, mountOptions);

    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const values = wrapper
      .findAll(".top-stat-card .card-value")
      .map(node => node.text());

    expect(values[0]).toContain("¥ 123,456");
    expect(values[1]).toContain("¥ 98,765");
    expect(values[2]).toContain("¥ 500,000");
    expect(values[3]).toContain("¥ 120,000");
    expect(values[4]).toContain("¥ 160,000");
    expect(chartSetOption).toHaveBeenCalled();
  });

  it("navigates to customer page when clicking link", async () => {
    const wrapper = mount(Welcome, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const navLink = wrapper
      .findAll("span")
      .find(node => node.text().includes("全部客户"));
    expect(navLink).toBeTruthy();

    await navLink?.trigger("click");
    expect(routerPush).toHaveBeenCalledWith("/customer/index");
  });
});
