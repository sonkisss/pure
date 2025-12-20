import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import SupplierDetail from "../detail.vue";

const routerPush = vi.fn();
const mockRoute = { params: { id: "3" } };

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
    Delete: makeIcon("Delete"),
    Edit: makeIcon("Edit"),
    Refresh: makeIcon("Refresh"),
    Money: makeIcon("Money"),
    Document: makeIcon("Document"),
    Picture: makeIcon("Picture"),
    Upload: makeIcon("Upload"),
    UploadFilled: makeIcon("UploadFilled"),
    Download: makeIcon("Download"),
    Loading: makeIcon("Loading"),
    ZoomIn: makeIcon("ZoomIn")
  };
});

vi.mock("@/api/supplier", () => ({
  getSupplierDetail: vi.fn(() =>
    Promise.resolve({ success: true, data: { id: 3, name: "供应商X" } })
  ),
  getSupplierDebts: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        list: [
          { id: 1, amount: 800, createTime: "2024-01-01" },
          { id: 2, amount: 200, createTime: "2024-02-01" }
        ],
        total: 2
      }
    })
  ),
  getSupplierPaymentList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        list: [
          {
            id: 10,
            amount: 500,
            paymentTime: "2024-03-01",
            paymentType: "现金"
          }
        ],
        totalDebt: 1000,
        totalPaid: 500,
        total: 1
      }
    })
  ),
  addSupplierDebt: vi.fn(() => Promise.resolve({ success: true })),
  updateSupplierDebt: vi.fn(() => Promise.resolve({ success: true })),
  deleteSupplierDebt: vi.fn(() => Promise.resolve({ success: true })),
  addSupplierPayment: vi.fn(() => Promise.resolve({ success: true })),
  updateSupplierPayment: vi.fn(() => Promise.resolve({ success: true })),
  deleteSupplierPayment: vi.fn(() => Promise.resolve({ success: true })),
  uploadDebtExcel: vi.fn(),
  exportDebtsExcel: vi.fn(),
  uploadSupplierVoucher: vi.fn()
}));

vi.mock("@/components/ImagePreview", () => ({
  default: defineComponent({
    name: "ImagePreview",
    setup(_, { slots }) {
      return () => h("div", slots.default?.());
    }
  })
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
      const row = { id: 0, amount: 0, remark: "", paymentType: "现金" };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const upload = stubComponent("ElUpload");
  const datePicker = stubComponent("ElDatePicker");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");
  const checkbox = stubComponent("ElCheckbox");
  const row = stubComponent("ElRow");
  const col = stubComponent("ElCol");
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");
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
    ElInputNumber: base,
    ElUpload: upload,
    ElDatePicker: datePicker,
    ElTag: tag,
    ElAlert: alert,
    ElCheckbox: checkbox,
    ElRow: row,
    ElCol: col,
    ElSelect: select,
    ElOption: option,
    ElIcon: base
  };
});

describe("Supplier detail page", () => {
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = { id: 0, amount: 0, remark: "", paymentType: "现金" };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const upload = stubComponent("ElUpload");
  const datePicker = stubComponent("ElDatePicker");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");
  const checkbox = stubComponent("ElCheckbox");
  const row = stubComponent("ElRow");
  const col = stubComponent("ElCol");
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");

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
        ElInputNumber: base,
        ElUpload: upload,
        ElDatePicker: datePicker,
        ElTag: tag,
        ElAlert: alert,
        ElCheckbox: checkbox,
        ElRow: row,
        ElCol: col,
        ElSelect: select,
        ElOption: option,
        ElIcon: base
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

  it("loads supplier detail and aggregates statistics", async () => {
    const wrapper = mount(SupplierDetail, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      supplier: { name: string } | null;
      debts: Array<any>;
      payments: Array<any>;
      statistics: {
        totalDebtAmount: number;
        paidAmount: number;
        currentDebt: number;
      };
    };

    expect(vm.supplier?.name).toBe("供应商X");
    expect(vm.debts.length).toBe(2);
    expect(vm.payments.length).toBe(1);
    expect(vm.statistics.totalDebtAmount).toBe(1000);
    expect(vm.statistics.paidAmount).toBe(500);
    expect(vm.statistics.currentDebt).toBe(500);
  });

  it("navigates back to list", async () => {
    const wrapper = mount(SupplierDetail, mountOptions);
    await flushPromises();
    const vm = wrapper.vm as unknown as { goBack: () => void };
    vm.goBack();
    expect(routerPush).toHaveBeenCalledWith("/supplier/index");
  });
});
