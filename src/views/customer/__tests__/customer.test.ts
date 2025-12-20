import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import CustomerPage from "../index.vue";

// Helper to avoid undefined before initialization when used in mocks
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

function createFormStub() {
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

const routerPush = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerPush,
    afterEach: () => undefined,
    options: { history: { state: {} } }
  })
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
    Search: makeIcon("Search")
  };
});

vi.mock("element-plus", () => {
  const ElMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const ElMessageBox = {
    confirm: vi.fn(() => Promise.resolve())
  };
  const elStub = createElStub();
  const ElFormStub = createFormStub();
  const ElTableStub = defineComponent({
    name: "ElTableStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.());
    }
  });
  const ElTableColumnStub = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.({ row: {} }));
    }
  });
  return {
    ElMessage,
    ElMessageBox,
    ElCard: elStub,
    ElButton: elStub,
    ElTable: ElTableStub,
    ElTableColumn: ElTableColumnStub,
    ElPagination: elStub,
    ElDialog: elStub,
    ElForm: ElFormStub,
    ElFormItem: elStub,
    ElInput: elStub,
    ElSelect: elStub,
    ElOption: elStub,
    ElInputNumber: elStub,
    ElAlert: elStub,
    ElIcon: elStub
  };
});

vi.mock("@/api/customer", () => ({
  getCustomerList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        list: [
          {
            id: 1,
            name: "客户A",
            debt: 1000,
            companyId: 1,
            companyName: "公司1"
          },
          {
            id: 2,
            name: "客户B",
            debt: 200,
            companyId: 2,
            companyName: "公司2"
          }
        ],
        total: 2
      }
    })
  ),
  addCustomer: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteCustomer: vi.fn(() =>
    Promise.resolve({ success: true, message: "deleted" })
  ),
  batchDeleteCustomer: vi.fn(() =>
    Promise.resolve({ success: true, message: "batch deleted" })
  ),
  updateCustomer: vi.fn(() =>
    Promise.resolve({ success: true, message: "updated" })
  ),
  checkCustomerRecords: vi.fn()
}));

vi.mock("@/api/business", () => ({
  getAllCompanies: vi.fn(() =>
    Promise.resolve({ data: [{ id: 1, company_name: "公司1" }] })
  )
}));

describe("Customer management page", () => {
  const elStub = createElStub();
  const formStub = createFormStub();
  const ElTableStub = defineComponent({
    name: "ElTableStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.());
    }
  });
  const ElTableColumnStub = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.({ row: {} }));
    }
  });
  const mountOptions = {
    global: {
      directives: { loading: () => undefined },
      components: {
        ElCard: elStub,
        ElButton: elStub,
        ElTable: ElTableStub,
        ElTableColumn: ElTableColumnStub,
        ElPagination: elStub,
        ElDialog: elStub,
        ElForm: formStub,
        ElFormItem: elStub,
        ElInput: elStub,
        ElSelect: elStub,
        ElOption: elStub,
        ElInputNumber: elStub,
        ElAlert: elStub,
        ElIcon: elStub
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

  it("loads customers on mount and computes stats", async () => {
    const wrapper = mount(CustomerPage, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      tableData: Array<{ debt: number }>;
      totalDebt: number;
      debtCustomerCount: number;
      companyList: Array<{ id: number }>;
    };

    expect(vm.tableData.length).toBe(2);
    expect(vm.totalDebt).toBe(1200);
    expect(vm.debtCustomerCount).toBe(2);
    expect(vm.companyList.length).toBe(1);
  });

  it("navigates to detail when clicking a customer name", async () => {
    const wrapper = mount(CustomerPage, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      handleGoToDetail: (id: number) => void;
    };
    vm.handleGoToDetail(3);
    expect(routerPush).toHaveBeenCalledWith("/customer/detail/3");
  });

  it("opens add dialog via handleAdd", async () => {
    const wrapper = mount(CustomerPage, mountOptions);
    const vm = wrapper.vm as unknown as {
      dialogVisible: boolean;
      dialogTitle: string;
      handleAdd: () => void;
    };

    vm.handleAdd();
    expect(vm.dialogVisible).toBe(true);
    expect(vm.dialogTitle).toBe("添加客户");
  });
});
