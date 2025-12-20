import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import ExcelDetail from "../excel-detail.vue";

const routerBack = vi.fn();
const mockRoute = { params: { debtId: "5" } };

function stubComponent(name = "ElStub", slotProps?: any) {
  return defineComponent({
    name,
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.(slotProps));
    }
  });
}

vi.mock("vue-router", () => ({
  useRouter: () => ({ back: routerBack }),
  useRoute: () => mockRoute
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
    ArrowLeft: makeIcon("ArrowLeft"),
    Refresh: makeIcon("Refresh")
  };
});

vi.mock("@/api/supplier", () => ({
  getDebtExcelItems: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          id: 1,
          productName: "品1",
          productModel: "A",
          quantity: 2,
          unit: "件",
          unitPrice: 100,
          amount: 200,
          hasTax: true
        },
        {
          id: 2,
          productName: "品2",
          productModel: "B",
          quantity: 1,
          unit: "件",
          unitPrice: 50,
          amount: 50,
          hasTax: false
        }
      ]
    })
  )
}));

vi.mock("element-plus", () => {
  const ElMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const base = stubComponent();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        amount: 0,
        unitPrice: 0,
        quantity: 0,
        productName: "",
        productModel: "",
        unit: "",
        hasTax: false
      };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const tag = stubComponent("ElTag");
  return {
    ElMessage,
    ElCard: base,
    ElButton: base,
    ElTable: table,
    ElTableColumn: column,
    ElIcon: base,
    ElTag: tag
  };
});

describe("Supplier debt excel detail page", () => {
  const base = stubComponent();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        amount: 0,
        unitPrice: 0,
        quantity: 0,
        productName: "",
        productModel: "",
        unit: "",
        hasTax: false
      };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const tag = stubComponent("ElTag");

  const mountOptions = {
    global: {
      directives: { loading: () => undefined },
      components: {
        ElCard: base,
        ElButton: base,
        ElTable: table,
        ElTableColumn: column,
        ElIcon: base,
        ElTag: tag
      }
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    routerBack.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads excel items and computes total", async () => {
    const wrapper = mount(ExcelDetail, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      excelItems: Array<any>;
      totalAmount: number;
    };
    expect(vm.excelItems.length).toBe(2);
    expect(vm.totalAmount).toBe(250);
  });

  it("goes back on click", async () => {
    const wrapper = mount(ExcelDetail, mountOptions);
    await flushPromises();
    const vm = wrapper.vm as unknown as { goBack: () => void };
    vm.goBack();
    expect(routerBack).toHaveBeenCalled();
  });
});
