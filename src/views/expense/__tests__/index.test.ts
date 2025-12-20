import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import ExpensePage from "../index.vue";

const routerPush = vi.fn();

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
    Plus: makeIcon("Plus"),
    Delete: makeIcon("Delete"),
    Edit: makeIcon("Edit"),
    Refresh: makeIcon("Refresh"),
    Management: makeIcon("Management"),
    Tools: makeIcon("Tools"),
    Download: makeIcon("Download")
  };
});

vi.mock("@/api/expense", () => ({
  getExpenseList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        list: [
          {
            id: 1,
            title: "费用1",
            amount: 100,
            year: 2024,
            category: "差旅",
            companyName: "公司A",
            expenseDate: "2024-01-01"
          },
          {
            id: 2,
            title: "费用2",
            amount: 200,
            year: 2024,
            category: "办公",
            companyName: "公司B",
            expenseDate: "2024-02-01"
          }
        ],
        total: 2
      }
    })
  ),
  addExpense: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  updateExpense: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteExpense: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  batchDeleteExpense: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  getExpenseCategories: vi.fn(() =>
    Promise.resolve({ success: true, data: [{ id: 1, name: "差旅" }] })
  ),
  addExpenseCategory: vi.fn(() => Promise.resolve({ success: true })),
  updateExpenseCategory: vi.fn(() => Promise.resolve({ success: true })),
  deleteExpenseCategory: vi.fn(() => Promise.resolve({ success: true })),
  getExpenseStatistics: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        totalExpenses: 300,
        companyStatistics: [
          { companyId: 1, companyName: "公司A", totalExpense: 100 }
        ]
      }
    })
  ),
  getCompanies: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [{ id: 1, company_name: "公司A" }]
    })
  ),
  getPayerList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [{ id: 9, nickname: "张三", username: "zs" }]
    })
  )
}));

vi.mock("@/services/supabase", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://file" } }))
      })
    }
  }
}));

vi.mock("@/utils/excelExporter", () => ({
  ExcelExporter: {
    exportExpenses: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

vi.mock("xlsx", () => ({}));

vi.mock("element-plus", () => {
  const ElMessage = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  };
  const ElMessageBox = { confirm: vi.fn(() => Promise.resolve()) };
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        id: 0,
        title: "",
        amount: 0,
        companyName: "",
        category: ""
      };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const datePicker = stubComponent("ElDatePicker");
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");
  const inputNumber = stubComponent("ElInputNumber");
  const treeSelect = stubComponent("ElTreeSelect");
  return {
    ElMessage,
    ElMessageBox,
    ElCard: base,
    ElButton: base,
    ElTable: table,
    ElTableColumn: column,
    ElPagination: base,
    ElDialog: base,
    ElForm: form,
    ElFormItem: base,
    ElInput: base,
    ElInputNumber: inputNumber,
    ElSelect: select,
    ElOption: option,
    ElDatePicker: datePicker,
    ElTag: tag,
    ElAlert: alert,
    ElTreeSelect: treeSelect,
    ElIcon: base,
    ElTooltip: base,
    ElDivider: base,
    ElRow: base,
    ElCol: base,
    ElCheckbox: base,
    ElCheckboxGroup: base,
    ElSkeleton: base,
    ElSkeletonItem: base
  };
});

describe("Expense management page", () => {
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        id: 0,
        title: "",
        amount: 0,
        companyName: "",
        category: ""
      };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const datePicker = stubComponent("ElDatePicker");
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");
  const inputNumber = stubComponent("ElInputNumber");
  const treeSelect = stubComponent("ElTreeSelect");

  const mountOptions = {
    global: {
      directives: { loading: () => undefined },
      components: {
        ElCard: base,
        ElButton: base,
        ElTable: table,
        ElTableColumn: column,
        ElPagination: base,
        ElDialog: base,
        ElForm: form,
        ElFormItem: base,
        ElInput: base,
        ElInputNumber: inputNumber,
        ElSelect: select,
        ElOption: option,
        ElDatePicker: datePicker,
        ElTag: tag,
        ElAlert: alert,
        ElTreeSelect: treeSelect,
        ElIcon: base,
        ElTooltip: base,
        ElDivider: base,
        ElRow: base,
        ElCol: base,
        ElCheckbox: base,
        ElCheckboxGroup: base,
        ElSkeleton: base,
        ElSkeletonItem: base
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

  it("loads expenses, categories, companies, payers, and statistics", async () => {
    const wrapper = mount(ExpensePage, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      tableData: Array<any>;
      total: number;
      categories: Array<any>;
      companies: Array<any>;
      payers: Array<any>;
      statistics: { totalExpenses: number } | null;
    };

    expect(vm.tableData.length).toBe(2);
    expect(vm.total).toBe(2);
    expect(vm.categories.length).toBe(1);
    expect(vm.companies.length).toBe(1);
    expect(vm.payers.length).toBe(1);
    expect(vm.statistics?.totalExpenses).toBe(300);
  });

  it("opens add dialog", async () => {
    const wrapper = mount(ExpensePage, mountOptions);
    const vm = wrapper.vm as unknown as {
      dialogVisible: boolean;
      handleAdd: () => void;
      dialogTitle: string;
    };
    vm.dialogVisible = false;
    vm.dialogTitle = "";
    vm.handleAdd();
    expect(vm.dialogVisible).toBe(true);
    expect(vm.dialogTitle).toBe("添加费用");
  });
});
