import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import ContractDetails from "../contract-details.vue";

const routerPush = vi.fn();

function stubComponent(name = "ElStub", slotProps?: any) {
  return defineComponent({
    name,
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.(slotProps));
    }
  });
}

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: routerPush })
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
    Download: makeIcon("Download"),
    Refresh: makeIcon("Refresh"),
    Loading: makeIcon("Loading")
  };
});

vi.mock("@/api/business", () => ({
  getAllContractDetails: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          product_name: "产品A",
          spec_model: "S1",
          unit: "个",
          quantity: 2,
          purchase_price: 100,
          sale_price: 150,
          supplier: "供应商A",
          includes_tax: 1,
          contract_year: 2024,
          company_name: "公司A",
          contract_name: "合同1",
          contract_date: "2024-01-01"
        }
      ],
      total: 1
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
        product_name: "",
        spec_model: "",
        unit: "",
        quantity: 0,
        purchase_price: 0,
        sale_price: 0,
        supplier: "",
        includes_tax: 1,
        contract_year: 2024,
        company_name: "",
        contract_name: "",
        contract_date: ""
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
    ElPagination: base,
    ElIcon: base,
    ElTag: tag,
    ElForm: base,
    ElFormItem: base,
    ElInput: base
  };
});

describe("Product contract details page", () => {
  const base = stubComponent();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        product_name: "",
        spec_model: "",
        unit: "",
        quantity: 0,
        purchase_price: 0,
        sale_price: 0,
        supplier: "",
        includes_tax: 1,
        contract_year: 2024,
        company_name: "",
        contract_name: "",
        contract_date: ""
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
        ElPagination: base,
        ElIcon: base,
        ElTag: tag,
        ElForm: base,
        ElFormItem: base,
        ElInput: base
      }
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads contract details and sets pagination total", async () => {
    const wrapper = mount(ContractDetails, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      tableData: Array<any>;
      pagination: { total: number };
    };
    expect(vm.tableData.length).toBe(1);
    expect(vm.pagination.total).toBe(1);
  });
});
