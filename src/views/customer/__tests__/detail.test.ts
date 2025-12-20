import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import DetailPage from "../detail.vue";

const routerPush = vi.fn();
const mockRoute = { params: { id: "1" } };
function createElStub() {
  return defineComponent({
    name: "ElStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, [slots.header?.(), slots.default?.(), slots.footer?.()]);
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
    Delete: makeIcon("Delete"),
    Refresh: makeIcon("Refresh"),
    Edit: makeIcon("Edit"),
    Document: makeIcon("Document"),
    View: makeIcon("View"),
    Money: makeIcon("Money")
  };
});

vi.mock("element-plus", () => {
  const ElMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const ElMessageBox = { confirm: vi.fn(() => Promise.resolve()) };
  const elStub = createElStub();
  const formStub = createFormStub();
  const TableStub = defineComponent({
    name: "ElTableStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.());
    }
  });
  const ColumnStub = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const defaultRow = {
        amount: 0,
        remark: "",
        paymentTime: "",
        paymentType: "现金",
        creditDate: "",
        invoiceUrl: ""
      };
      return () => h("div", attrs, slots.default?.({ row: defaultRow, column: {} }));
    }
  });
  return {
    ElMessage,
    ElMessageBox,
    ElCard: elStub,
    ElButton: elStub,
    ElTable: TableStub,
    ElTableColumn: ColumnStub,
    ElDialog: elStub,
    ElForm: formStub,
    ElFormItem: elStub,
    ElInput: elStub,
    ElInputNumber: elStub,
    ElDatePicker: elStub,
    ElSelect: elStub,
    ElOption: elStub,
    ElUpload: elStub,
    ElAlert: elStub,
    ElTag: elStub,
    ElIcon: elStub,
    ElTooltip: elStub
  };
});

vi.mock("@/api/customer", () => ({
  getCustomerDetail: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { id: 1, name: "客户A", companyName: "公司1", debt: 3000, companyId: 1 }
    })
  ),
  getPaymentRecordList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        list: [
          {
            id: 10,
            customerId: 1,
            amount: 500,
            paymentTime: "2024-01-10",
            paymentType: "现金",
            remark: "首付款",
            createTime: "2024-01-10"
          }
        ]
      }
    })
  ),
  getCreditRecordList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        list: [
          {
            id: 20,
            customerId: 1,
            amount: 2000,
            creditDate: "2024-01-05",
            invoiceUrl: "",
            remark: "挂账A",
            createTime: "2024-01-05"
          }
        ]
      }
    })
  ),
  addPaymentRecord: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  updatePaymentRecord: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deletePaymentRecord: vi.fn(() => Promise.resolve({ success: true, message: "deleted" })),
  addCreditRecord: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  updateCreditRecord: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteCreditRecord: vi.fn(() => Promise.resolve({ success: true, message: "deleted" }))
}));

vi.mock("@/api/business", () => ({
  getAllCompanies: vi.fn(() =>
    Promise.resolve({ data: [{ id: 1, company_name: "公司1" }] })
  )
}));

// storage 服务 stub，避免真实网络
vi.mock("@/services/storage", () => ({
  uploadFileToSupabase: vi.fn(() => Promise.resolve({ success: true, filePath: "path/file.pdf", fileUrl: "http://x/file.pdf" })),
  getPublicFileUrl: vi.fn(),
  deleteFileFromSupabase: vi.fn(() => Promise.resolve({ success: true })),
  getSignedFileUrl: vi.fn(() => Promise.resolve("http://signed-url")),
  extractOssObjectPath: vi.fn(() => "oss/object/path")
}));

describe("Customer detail page", () => {
  const elStub = createElStub();
  const formStub = createFormStub();
  const tableStub = defineComponent({
    name: "ElTableStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.());
    }
  });
  const columnStub = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const defaultRow = {
        amount: 0,
        remark: "",
        paymentTime: "",
        paymentType: "现金",
        creditDate: "",
        invoiceUrl: ""
      };
      return () => h("div", attrs, slots.default?.({ row: defaultRow, column: {} }));
    }
  });

  const mountOptions = {
    global: {
      directives: { loading: () => undefined },
      components: {
        ElCard: elStub,
        ElButton: elStub,
        ElTable: tableStub,
        ElTableColumn: columnStub,
        ElDialog: elStub,
        ElForm: formStub,
        ElFormItem: elStub,
        ElInput: elStub,
        ElInputNumber: elStub,
        ElDatePicker: elStub,
        ElSelect: elStub,
        ElOption: elStub,
        ElUpload: elStub,
        ElAlert: elStub,
        ElTag: elStub,
        ElIcon: elStub,
        ElTooltip: elStub
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

  it("loads detail and aggregates stats", async () => {
    const wrapper = mount(DetailPage, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      customer: { name: string; debt: number } | null;
      totalDebt: number;
      totalPayments: number;
      totalCredits: number;
      initialDebt: number;
      transactionRecords: Array<{ type: string }>;
    };

    expect(vm.customer?.name).toBe("客户A");
    expect(vm.totalDebt).toBe(3000);
    expect(vm.totalPayments).toBe(500);
    expect(vm.totalCredits).toBe(2000);
    expect(vm.initialDebt).toBe(2000);
    // 应包含付款和挂账两类
    expect(vm.transactionRecords.map(r => r.type).sort()).toEqual(["credit", "payment"]);
  });

  it("navigates back to list", async () => {
    const wrapper = mount(DetailPage, mountOptions);
    await flushPromises();
    const vm = wrapper.vm as unknown as { handleBack: () => void };
    vm.handleBack();
    expect(routerPush).toHaveBeenCalledWith("/customer/index");
  });

  it("opens add payment dialog and resets form", async () => {
    const wrapper = mount(DetailPage, mountOptions);
    await flushPromises();
    const vm = wrapper.vm as unknown as {
      dialogVisible: boolean;
      dialogTitle: string;
      formData: { amount: number };
      handleAddPayment: () => void;
    };

    vm.handleAddPayment();
    expect(vm.dialogVisible).toBe(true);
    expect(vm.dialogTitle).toBe("新增付款");
    expect(vm.formData.amount).toBe(0);
  });
});
