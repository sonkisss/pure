import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import ContractList from "../index.vue";

const routerPush = vi.fn();
const mockRoute = { query: { company_id: "1", company_name: "公司A" } };

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
    Plus: makeIcon("Plus"),
    ArrowLeft: makeIcon("ArrowLeft"),
    Refresh: makeIcon("Refresh"),
    PictureFilled: makeIcon("PictureFilled"),
    Document: makeIcon("Document"),
    DocumentCopy: makeIcon("DocumentCopy"),
    Loading: makeIcon("Loading"),
    Files: makeIcon("Files"),
    Select: makeIcon("Select"),
    Upload: makeIcon("Upload"),
    Delete: makeIcon("Delete")
  };
});

vi.mock("@/components/ImagePreview", () => ({
  default: defineComponent({
    name: "ImagePreview",
    props: ["modelValue", "images", "initialIndex"],
    emits: ["update:modelValue"],
    setup(_, { slots }) {
      return () => h("div", slots.default?.());
    }
  })
}));

vi.mock("@/api/business", () => ({
  getContractList: vi.fn(() =>
    Promise.resolve({
      data: {
        list: [
          {
            id: 11,
            contract_name: "合同A",
            contract_amount: 5000,
            contract_year: 2024,
            contract_date: "2024-01-01",
            company_id: 1,
            image_count: 0,
            pdf_count: 0,
            other_count: 0,
            attachment_count: 0,
            status: 1,
            created_by: 1,
            created_at: "",
            updated_at: ""
          }
        ],
        total: 1
      }
    })
  ),
  addContract: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  updateContract: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  deleteContract: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  getContractStatistics: vi.fn(() =>
    Promise.resolve({
      data: {
        total_sales: 5000,
        total_profit: 2000,
        total_uncredited_amount: 500,
        contract_count: 3,
        year: 2024
      }
    })
  ),
  getCompanyList: vi.fn(() =>
    Promise.resolve({ data: { list: [{ id: 1, company_name: "公司A" }] } })
  ),
  getAllCompanies: vi.fn(() =>
    Promise.resolve({ data: [{ id: 1, company_name: "公司A" }] })
  ),
  uploadContractFile: vi.fn(),
  getContractAttachments: vi.fn(() =>
    Promise.resolve({ data: { attachments: [] } })
  ),
  uploadContractAttachment: vi.fn()
}));

vi.mock("@/services/storage", () => ({
  getSignedFileUrl: vi.fn(() => Promise.resolve("http://signed-url")),
  extractOssObjectPath: vi.fn(() => "oss/path")
}));

vi.mock("element-plus", () => {
  const ElMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const ElMessageBox = { confirm: vi.fn(() => Promise.resolve()) };
  const baseStub = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        id: 0,
        contract_name: "",
        contract_amount: 0,
        contract_year: 2024,
        contract_date: "",
        image_count: 0,
        pdf_count: 0,
        other_count: 0,
        attachment_count: 0
      };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const datePicker = stubComponent("ElDatePicker");
  const upload = stubComponent("ElUpload");
  return {
    ElMessage,
    ElMessageBox,
    ElCard: baseStub,
    ElButton: baseStub,
    ElTable: table,
    ElTableColumn: column,
    ElPagination: baseStub,
    ElDialog: baseStub,
    ElForm: form,
    ElFormItem: baseStub,
    ElInput: baseStub,
    ElSelect: baseStub,
    ElOption: baseStub,
    ElUpload: upload,
    ElIcon: baseStub,
    ElLink: baseStub,
    ElDivider: baseStub,
    ElDatePicker: datePicker
  };
});

describe("Business contract list page", () => {
  const baseStub = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        id: 0,
        contract_name: "",
        contract_amount: 0,
        contract_year: 2024,
        contract_date: "",
        image_count: 0,
        pdf_count: 0,
        other_count: 0,
        attachment_count: 0
      };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const datePicker = stubComponent("ElDatePicker");
  const upload = stubComponent("ElUpload");

  const mountOptions = {
    global: {
      directives: { loading: () => undefined },
      components: {
        ElCard: baseStub,
        ElButton: baseStub,
        ElTable: table,
        ElTableColumn: column,
        ElPagination: baseStub,
        ElDialog: baseStub,
        ElForm: form,
        ElFormItem: baseStub,
        ElInput: baseStub,
        ElSelect: baseStub,
        ElOption: baseStub,
        ElUpload: upload,
        ElIcon: baseStub,
        ElLink: baseStub,
        ElDivider: baseStub,
        ElDatePicker: datePicker
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

  it("loads contract list and statistics on mount", async () => {
    const wrapper = mount(ContractList, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      contractList: Array<any>;
      statistics: { total_sales: number; contract_count: number };
    };
    expect(vm.contractList.length).toBe(1);
    expect(vm.statistics.total_sales).toBe(5000);
    expect(vm.statistics.contract_count).toBe(3);
  });

  it("navigates to contract detail when clicking view", async () => {
    const wrapper = mount(ContractList, mountOptions);
    await flushPromises();
    const vm = wrapper.vm as unknown as {
      handleViewContract: (c: any) => void;
    };
    vm.handleViewContract({ id: 88 } as any);
    expect(routerPush).toHaveBeenCalledWith({
      name: "ContractDetail",
      params: { id: 88 }
    });
  });

  it("opens add dialog with defaults", async () => {
    const wrapper = mount(ContractList, mountOptions);
    const vm = wrapper.vm as unknown as {
      dialogVisible: boolean;
      isEdit: boolean;
      formData: { contract_name: string; contract_date?: string };
      handleAdd: () => void;
    };
    vm.dialogVisible = false;
    vm.isEdit = true;
    vm.formData.contract_name = "";
    vm.formData.contract_date = undefined;

    vm.handleAdd();
    expect(vm.dialogVisible).toBe(true);
    expect(vm.isEdit).toBe(false);
    expect(vm.formData.contract_name).toContain("公司A");
    expect(vm.formData.contract_date).toBeTruthy();
  });
});
