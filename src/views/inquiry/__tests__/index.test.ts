import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import InquiryPage from "../index.vue";

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
    Refresh: makeIcon("Refresh"),
    Search: makeIcon("Search"),
    Download: makeIcon("Download"),
    UploadFilled: makeIcon("UploadFilled")
  };
});

vi.mock("@/api/inquiry", () => ({
  getInquiryList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        list: [
          { id: 1, name: "询价单1", company: "公司A", date: "2024-01-01", items: [] },
          { id: 2, name: "询价单2", company: "公司B", date: "2024-02-01", items: [] }
        ],
        total: 2
      }
    })
  ),
  addInquiry: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteInquiry: vi.fn(() => Promise.resolve({ success: true, message: "deleted" })),
  saveExcelInquiry: vi.fn(() => Promise.resolve({ success: true, message: "saved" }))
}));

vi.mock("xlsx", () => ({}));

vi.mock("element-plus", () => {
  const ElMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const ElMessageBox = { confirm: vi.fn(() => Promise.resolve()) };
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = { id: 0, name: "", company: "", date: "" };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const upload = stubComponent("ElUpload");
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
    ElDatePicker: base,
    ElUpload: upload,
    ElIcon: base
  };
});

describe("Inquiry management page", () => {
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = { id: 0, name: "", company: "", date: "" };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const upload = stubComponent("ElUpload");

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
        ElDatePicker: base,
        ElUpload: upload,
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

  it("loads inquiry list", async () => {
    const wrapper = mount(InquiryPage, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as { tableData: Array<any>; total: number };
    expect(vm.tableData.length).toBe(2);
    expect(vm.total).toBe(2);
  });

  it("opens add dialog", async () => {
    const wrapper = mount(InquiryPage, mountOptions);
    const vm = wrapper.vm as unknown as { addDialogVisible: boolean; handleAdd: () => void };
    vm.addDialogVisible = false;
    vm.handleAdd();
    expect(vm.addDialogVisible).toBe(true);
  });
});
