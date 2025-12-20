import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import InquiryDetail from "../detail.vue";

const routerPush = vi.fn();
const mockRoute = { params: { id: "7" } };

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
    Refresh: makeIcon("Refresh"),
    Upload: makeIcon("Upload"),
    Delete: makeIcon("Delete"),
    Download: makeIcon("Download"),
    UploadFilled: makeIcon("UploadFilled"),
    MoreFilled: makeIcon("MoreFilled"),
    MagicStick: makeIcon("MagicStick"),
    Money: makeIcon("Money"),
    ZoomIn: makeIcon("ZoomIn"),
    Picture: makeIcon("Picture"),
    Document: makeIcon("Document"),
    DocumentCopy: makeIcon("DocumentCopy"),
    Files: makeIcon("Files")
  };
});

vi.mock("@/components/ImagePreview", () => ({
  default: defineComponent({
    name: "ImagePreview",
    setup(_, { slots }) {
      return () => h("div", slots.default?.());
    }
  })
}));

vi.mock("@/api/inquiry", () => ({
  getInquiryDetail: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        id: 7,
        name: "询价单X",
        attachments: [],
        items: [
          { id: 1, productName: "品1", quantity: 2, purchasePrice: 100, salePrice: 150, taxType: "含税" },
          { id: 2, productName: "品2", quantity: 1, purchasePrice: 50, salePrice: 80, taxType: "不含税" }
        ]
      }
    })
  ),
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  selectMatchedProduct: vi.fn(),
  manualMatchProduct: vi.fn(),
  uploadInquiryExcel: vi.fn(),
  addInquiryItems: vi.fn(() => Promise.resolve({ success: true })),
  updateInquiryItem: vi.fn(() => Promise.resolve({ success: true })),
  getMatchedProducts: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  saveProfitCalculation: vi.fn(),
  getProfitCalculation: vi.fn(() => Promise.resolve({ success: true, data: null })),
  saveCustomFees: vi.fn(),
  deleteInquiryItems: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock("@/api/product", () => ({
  getProductList: vi.fn(() => Promise.resolve({ success: true, data: { list: [] } }))
}));

vi.mock("@/api/business", () => ({
  oneClickProductSelection: vi.fn(() => Promise.resolve({ success: true, data: [] }))
}));

vi.mock("@/services/storage", () => ({
  extractOssObjectPath: vi.fn(() => "oss/path"),
  getSignedFileUrl: vi.fn(() => Promise.resolve("http://signed-url"))
}));

vi.mock("@/utils/excelParser", () => ({
  ExcelParser: {
    parseInquiryExcel: vi.fn(() => ({ success: true, data: [] }))
  }
}));

vi.mock("xlsx", () => ({}));

vi.mock("element-plus", () => {
  const ElMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
  const ElMessageBox = { confirm: vi.fn(() => Promise.resolve()) };
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = { id: 0, productName: "", quantity: 0, purchasePrice: 0, salePrice: 0, taxType: "含税" };
      return () => h("div", attrs, slots.default?.({ row, $index: 0 }));
    }
  });
  const upload = stubComponent("ElUpload");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");
  const tooltip = stubComponent("ElTooltip");
  const drawer = stubComponent("ElDrawer");
  const buttonGroup = stubComponent("ElButtonGroup");
  const radio = stubComponent("ElRadio");
  const radioGroup = stubComponent("ElRadioGroup");
  const checkbox = stubComponent("ElCheckbox");
  const checkboxGroup = stubComponent("ElCheckboxGroup");
  const divider = stubComponent("ElDivider");
  const inputNumber = stubComponent("ElInputNumber");
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");
  const empty = stubComponent("ElEmpty");
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
    ElUpload: upload,
    ElIcon: base,
    ElTag: tag,
    ElAlert: alert,
    ElTooltip: tooltip,
    ElDrawer: drawer,
    ElButtonGroup: buttonGroup,
    ElRadio: radio,
    ElRadioGroup: radioGroup,
    ElCheckbox: checkbox,
    ElCheckboxGroup: checkboxGroup,
    ElDivider: divider,
    ElSelect: select,
    ElOption: option,
    ElEmpty: empty,
    ElSkeleton: base,
    ElSkeletonItem: base
  };
});

describe("Inquiry detail page", () => {
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = { id: 0, productName: "", quantity: 0, purchasePrice: 0, salePrice: 0, taxType: "含税" };
      return () => h("div", attrs, slots.default?.({ row, $index: 0 }));
    }
  });
  const upload = stubComponent("ElUpload");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");
  const tooltip = stubComponent("ElTooltip");
  const drawer = stubComponent("ElDrawer");
  const buttonGroup = stubComponent("ElButtonGroup");
  const radio = stubComponent("ElRadio");
  const radioGroup = stubComponent("ElRadioGroup");
  const checkbox = stubComponent("ElCheckbox");
  const checkboxGroup = stubComponent("ElCheckboxGroup");
  const divider = stubComponent("ElDivider");
  const inputNumber = stubComponent("ElInputNumber");
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");
  const empty = stubComponent("ElEmpty");

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
        ElUpload: upload,
        ElIcon: base,
        ElTag: tag,
        ElAlert: alert,
        ElTooltip: tooltip,
        ElDrawer: drawer,
        ElButtonGroup: buttonGroup,
        ElRadio: radio,
        ElRadioGroup: radioGroup,
        ElCheckbox: checkbox,
        ElCheckboxGroup: checkboxGroup,
        ElDivider: divider,
        ElSelect: select,
        ElOption: option,
        ElEmpty: empty,
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

  it("loads inquiry detail and normalizes items", async () => {
    const wrapper = mount(InquiryDetail, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      inquiry: { name: string; items: Array<any> } | null;
      purchaseTotal: number;
      saleTotal: number;
    };

    expect(vm.inquiry?.name).toBe("询价单X");
    expect(vm.purchaseTotal).toBeGreaterThan(0);
    expect(vm.saleTotal).toBeGreaterThan(0);
  });

  it("navigates back to list", async () => {
    const wrapper = mount(InquiryDetail, mountOptions);
    await flushPromises();
    const vm = wrapper.vm as unknown as { handleBack: () => void };
    vm.handleBack();
    expect(routerPush).toHaveBeenCalledWith("/inquiry/index");
  });
});
