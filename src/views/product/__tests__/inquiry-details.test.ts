import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import InquiryDetails from "../inquiry-details.vue";

function stubComponent(name = "ElStub", slotProps?: any) {
  return defineComponent({
    name,
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.(slotProps));
    }
  });
}

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

vi.mock("@/api/inquiry", () => ({
  getAllInquiryDetails: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          product_name: "品1",
          spec_model: "S1",
          unit: "个",
          quantity: 2,
          purchase_price: 80,
          sale_price: 120,
          supplier: "供应商A",
          tax_type: "含税",
          remark: "",
          company_name: "公司A",
          inquiry_name: "询价1"
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
        tax_type: "含税",
        remark: "",
        company_name: "",
        inquiry_name: ""
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

describe("Product inquiry details page", () => {
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
        tax_type: "含税",
        remark: "",
        company_name: "",
        inquiry_name: ""
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

  it("loads inquiry details and sets pagination total", async () => {
    const wrapper = mount(InquiryDetails, mountOptions);
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
