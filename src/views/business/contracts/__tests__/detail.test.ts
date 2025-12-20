import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import ContractDetail from "../detail.vue";

const routerPush = vi.fn();
const mockRoute = { params: { id: "1" } };

function stubComponent(name = "ElStub", slotProps?: any) {
  return defineComponent({
    name,
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.(slotProps));
    }
  });
}

function formStub() {
  return defineComponent({
    name: "ElFormStub",
    setup(_, { slots, expose }) {
      const clearValidate = vi.fn();
      const validate = async (cb?: (valid: boolean) => void) => cb?.(true);
      expose({ clearValidate, validate });
      return () => h("div", slots.default?.());
    }
  });
}

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: routerPush }),
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
    Plus: makeIcon("Plus"),
    Upload: makeIcon("Upload"),
    Download: makeIcon("Download"),
    Delete: makeIcon("Delete"),
    Select: makeIcon("Select")
  };
});

// 简化 XLSX 依赖
vi.mock("xlsx", () => ({}));

vi.mock("@/api/business", () => ({
  getContractDetail: vi.fn(() =>
    Promise.resolve({
      data: {
        contract: {
          id: 1,
          contract_name: "合同A",
          company_id: 1,
          company_name: "公司A"
        },
        details: [
          {
            id: 101,
            product_name: "产品1",
            sale_amount: 1000,
            purchase_amount: 400,
            is_credited: true,
            credit_amount: 300
          },
          {
            id: 102,
            product_name: "产品2",
            sale_amount: 500,
            purchase_amount: 200,
            is_credited: false,
            credit_amount: 0
          }
        ],
        expenses: [
          { id: 201, expense_amount: 100, expense_type: "运输", payer_id: 1 }
        ]
      }
    })
  ),
  addContractDetail: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  updateContractDetail: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteContractDetail: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  addExpense: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  updateExpense: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteExpense: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  updateContract: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  getExpenseCategories: vi.fn(() =>
    Promise.resolve({ data: [{ id: 1, name: "运输" }] })
  ),
  addExpenseCategory: vi.fn(() => Promise.resolve({ success: true })),
  updateExpenseCategory: vi.fn(() => Promise.resolve({ success: true })),
  deleteExpenseCategory: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock("@/api/expense", () => ({
  getPayerList: vi.fn(() => Promise.resolve({ data: [] }))
}));

vi.mock("@/services/storage", () => ({
  getSignedFileUrl: vi.fn(() => Promise.resolve("http://signed-url")),
  extractOssObjectPath: vi.fn(() => "oss/path")
}));

vi.mock("element-plus", () => {
  const ElMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const ElMessageBox = { confirm: vi.fn(() => Promise.resolve()) };
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        id: 0,
        sale_amount: 0,
        purchase_amount: 0,
        is_credited: false,
        credit_amount: 0,
        expense_amount: 0,
        product_name: "",
        remark: ""
      };
      return () => h("div", attrs, slots.default?.({ row, $index: 0 }));
    }
  });
  const upload = stubComponent("ElUpload");
  const datePicker = stubComponent("ElDatePicker");
  const tooltip = stubComponent("ElTooltip");
  const tag = stubComponent("ElTag");
  const row = stubComponent("ElRow");
  const col = stubComponent("ElCol");
  const alert = stubComponent("ElAlert");
  const radio = stubComponent("ElRadio");
  const radioGroup = stubComponent("ElRadioGroup");
  const elSwitch = stubComponent("ElSwitch");
  return {
    ElMessage,
    ElMessageBox,
    ElCard: base,
    ElButton: base,
    ElTable: table,
    ElTableColumn: column,
    ElDialog: base,
    ElForm: form,
    ElFormItem: base,
    ElInput: base,
    ElInputNumber: base,
    ElSelect: base,
    ElOption: base,
    ElUpload: upload,
    ElDatePicker: datePicker,
    ElTooltip: tooltip,
    ElTag: tag,
    ElIcon: base,
    ElRow: row,
    ElCol: col,
    ElAlert: alert,
    ElRadio: radio,
    ElRadioGroup: radioGroup,
    ElSwitch: elSwitch
  };
});

describe("Business contract detail page", () => {
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        id: 0,
        sale_amount: 0,
        purchase_amount: 0,
        is_credited: false,
        credit_amount: 0,
        expense_amount: 0,
        product_name: "",
        remark: ""
      };
      return () => h("div", attrs, slots.default?.({ row, $index: 0 }));
    }
  });
  const upload = stubComponent("ElUpload");
  const datePicker = stubComponent("ElDatePicker");
  const tooltip = stubComponent("ElTooltip");
  const tag = stubComponent("ElTag");
  const row = stubComponent("ElRow");
  const col = stubComponent("ElCol");
  const alert = stubComponent("ElAlert");
  const radio = stubComponent("ElRadio");
  const radioGroup = stubComponent("ElRadioGroup");
  const elSwitch = stubComponent("ElSwitch");

  const mountOptions = {
    global: {
      directives: { loading: () => undefined },
      components: {
        ElCard: base,
        ElButton: base,
        ElTable: table,
        ElTableColumn: column,
        ElDialog: base,
        ElForm: form,
        ElFormItem: base,
        ElInput: base,
        ElInputNumber: base,
        ElSelect: base,
        ElOption: base,
        ElUpload: upload,
        ElDatePicker: datePicker,
        ElTooltip: tooltip,
        ElTag: tag,
        ElIcon: base,
        ElRow: row,
        ElCol: col,
        ElAlert: alert,
        ElRadio: radio,
        ElRadioGroup: radioGroup,
        ElSwitch: elSwitch
      }
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    routerPush.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads contract detail and computes profit stats", async () => {
    const wrapper = mount(ContractDetail, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      contract: { contract_name: string };
      displayedContractDetails: Array<any>;
      profit: { contract_amount: number; total_profit: number };
    };

    expect(vm.contract.contract_name).toBe("合同A");
    expect(vm.displayedContractDetails.length).toBe(2);
    expect(vm.profit.contract_amount).toBeGreaterThan(0);
  });

  it("navigates back to contract list", async () => {
    const wrapper = mount(ContractDetail, mountOptions);
    await flushPromises();
    const vm = wrapper.vm as unknown as { handleBack: () => void };
    vm.handleBack();
    expect(routerPush).toHaveBeenCalled();
    expect(routerPush.mock.calls[0][0].name).toBe("ContractList");
  });
});
