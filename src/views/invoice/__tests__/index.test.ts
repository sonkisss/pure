import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import InvoicePage from "../index.vue";

function stubComponent(name = "ElStub") {
  return defineComponent({
    name,
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.());
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
    Check: makeIcon("Check"),
    InfoFilled: makeIcon("InfoFilled"),
    Plus: makeIcon("Plus"),
    Document: makeIcon("Document")
  };
});

vi.mock("@/api/business", () => ({
  getAllCompanies: vi.fn(() =>
    Promise.resolve({ success: true, data: [{ id: 1, company_name: "公司A" }] })
  )
}));

vi.mock("@/api/invoice", () => ({
  getSalesInvoices: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          id: 1,
          buyer_name: "买家1",
          seller_name: "卖家1",
          total_amount: 1000,
          invoice_date: "2024-01-01",
          invoice_url: "http://example.com/invoice1.pdf",
          invoice_file_name: "invoice1.pdf",
          invoicePath: "path1",
          invoice_issued: true,
          buyer_id: 1,
          seller_id: 1,
          payment_date: "2024-01-10",
          payment_amount: 1000,
          original_file_name: "invoice1.pdf"
        }
      ]
    })
  ),
  getPurchaseInvoices: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [
        {
          id: 2,
          seller_name: "供方1",
          buyer_name: "公司A",
          payment_amount: 500,
          payment_date: "2024-01-05",
          invoice_type: "普票",
          invoice_issued: false,
          invoice_url: "http://example.com/invoice2.pdf",
          invoice_file_name: "invoice2.pdf",
          buyer_id: 1,
          seller_id: 2,
          original_file_name: "invoice2.pdf"
        }
      ]
    })
  ),
  createSalesInvoice: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  createPurchaseInvoice: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  updateSalesInvoice: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  updatePurchaseInvoice: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  deleteSalesInvoice: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  deletePurchaseInvoice: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  deleteInvoiceFile: vi.fn(() => Promise.resolve({ success: true })),
  uploadInvoiceFile: vi.fn(() =>
    Promise.resolve({
      success: true,
      filePath: "path1",
      fileUrl: "http://example.com/file.pdf"
    })
  ),
  getInvoicePublicUrl: vi.fn(() =>
    Promise.resolve({
      data: { signedUrl: "http://example.com/file.pdf" },
      error: null
    })
  ),
  getPendingPurchaseInvoiceCount: vi.fn(() =>
    Promise.resolve({ success: true, data: 3 })
  )
}));

vi.mock("@/services/storage", () => ({
  extractOssObjectPath: vi.fn(() => "oss/path")
}));

vi.mock("element-plus", () => {
  const ElMessage = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  };
  const ElMessageBox = { confirm: vi.fn(() => Promise.resolve()) };
  const base = stubComponent();
  const form = stubComponent("ElForm");
  const table = defineComponent({
    name: "ElTableStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.());
    }
  });
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.({ row: {}, $index: 0 }));
    }
  });
  const tabs = stubComponent("ElTabs");
  const tabPane = stubComponent("ElTabPane");
  const upload = stubComponent("ElUpload");
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");
  const tag = stubComponent("ElTag");
  const tooltip = stubComponent("ElTooltip");
  const divider = stubComponent("ElDivider");
  const checkbox = stubComponent("ElCheckbox");
  const checkboxGroup = stubComponent("ElCheckboxGroup");
  const inputNumber = stubComponent("ElInputNumber");
  const elSwitch = stubComponent("ElSwitch");
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
    ElUpload: upload,
    ElIcon: base,
    ElTabs: tabs,
    ElTabPane: tabPane,
    ElTag: tag,
    ElTooltip: tooltip,
    ElDivider: divider,
    ElCheckbox: checkbox,
    ElCheckboxGroup: checkboxGroup,
    ElRow: base,
    ElCol: base,
    ElEmpty: base,
    ElSwitch: elSwitch,
    ElSkeleton: base,
    ElSkeletonItem: base
  };
});

describe("Invoice management page", () => {
  const base = stubComponent();
  const form = stubComponent("ElForm");
  const table = defineComponent({
    name: "ElTableStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.());
    }
  });
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      return () => h("div", attrs, slots.default?.({ row: {}, $index: 0 }));
    }
  });
  const tabs = stubComponent("ElTabs");
  const tabPane = stubComponent("ElTabPane");
  const upload = stubComponent("ElUpload");
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");
  const datePicker = stubComponent("ElDatePicker");
  const tag = stubComponent("ElTag");
  const tooltip = stubComponent("ElTooltip");
  const divider = stubComponent("ElDivider");
  const checkbox = stubComponent("ElCheckbox");
  const checkboxGroup = stubComponent("ElCheckboxGroup");
  const inputNumber = stubComponent("ElInputNumber");
  const elSwitch = stubComponent("ElSwitch");

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
        ElUpload: upload,
        ElIcon: base,
        ElTabs: tabs,
        ElTabPane: tabPane,
        ElTag: tag,
        ElTooltip: tooltip,
        ElDivider: divider,
        ElCheckbox: checkbox,
        ElCheckboxGroup: checkboxGroup,
        ElRow: base,
        ElCol: base,
        ElEmpty: base,
        ElSwitch: elSwitch,
        ElSkeleton: base,
        ElSkeletonItem: base,
        ElDatePicker: datePicker
      }
    }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads sales and purchase invoices with companies", async () => {
    const wrapper = mount(InvoicePage, mountOptions);
    const vm = wrapper.vm as unknown as {
      salesInvoices: Array<any>;
      purchaseInvoices: Array<any>;
      allCompanies: Array<any>;
      selectedMonth: number | undefined;
      selectedYear: number;
    };
    // 关闭月份过滤，确保数据不过滤掉
    vm.selectedMonth = undefined;
    vm.selectedYear = 2024;
    await flushPromises();

    expect(vm.salesInvoices.length).toBe(1);
    expect(vm.purchaseInvoices.length).toBe(1);
    expect(vm.allCompanies.length).toBe(1);
    wrapper.unmount();
  });

  it("opens add sales invoice dialog", async () => {
    const wrapper = mount(InvoicePage, mountOptions);
    const vm = wrapper.vm as unknown as {
      editDialogVisible: boolean;
      addSalesInvoice: () => Promise<void>;
    };
    vm.editDialogVisible = false;
    await vm.addSalesInvoice();
    expect(vm.editDialogVisible).toBe(true);
    wrapper.unmount();
  });
});
