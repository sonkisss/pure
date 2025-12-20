import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import ProductPage from "../index.vue";

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
    Download: makeIcon("Download"),
    Upload: makeIcon("Upload"),
    Loading: makeIcon("Loading")
  };
});

vi.mock("@/components/TableSkeleton.vue", () => ({
  default: defineComponent({
    name: "TableSkeleton",
    setup() {
      return () => h("div", "table-skeleton");
    }
  })
}));

vi.mock("@/api/product", () => ({
  getProductList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        list: [
          { id: 1, name: "产品1", specification: "S1", unit: "个", price: 100, supplier: "供应商A", taxType: "含税", remark: "http://example.com" },
          { id: 2, name: "产品2", specification: "S2", unit: "箱", price: 50, supplier: "供应商B", taxType: "普票", remark: "" }
        ],
        total: 2
      }
    })
  ),
  addProduct: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteProduct: vi.fn(() => Promise.resolve({ success: true, message: "deleted" })),
  batchDeleteProduct: vi.fn(() => Promise.resolve({ success: true, message: "batch" })),
  batchAddProducts: vi.fn(() => Promise.resolve({ success: true, message: "batch add", data: { failed: [] } }))
}));

vi.mock("@/utils/productCache", () => ({
  productDataCache: {
    get: vi.fn(() => null),
    set: vi.fn(),
    preloadNextPage: vi.fn()
  }
}));

vi.mock("@/utils/debounce", () => ({
  createDebounce: (fn: () => void) => fn
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
      const row = { id: 0, name: "", specification: "", unit: "", price: 0, supplier: "", taxType: "", remark: "" };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const upload = stubComponent("ElUpload");
  const datePicker = stubComponent("ElDatePicker");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");
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
    ElIcon: base,
    ElSelect: base,
    ElOption: base,
    ElTag: tag,
    ElAlert: alert,
    ElSkeletonItem: base,
    ElSkeleton: base
  };
});

describe("Product management page", () => {
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = { id: 0, name: "", specification: "", unit: "", price: 0, supplier: "", taxType: "", remark: "" };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const upload = stubComponent("ElUpload");
  const datePicker = stubComponent("ElDatePicker");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");

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
        ElIcon: base,
        ElSelect: base,
        ElOption: base,
        ElTag: tag,
        ElAlert: alert,
        ElSkeletonItem: base,
        ElSkeleton: base
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

  it("loads product list and computes totals", async () => {
    const wrapper = mount(ProductPage, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      tableData: Array<any>;
      total: number;
      initialLoading: boolean;
    };
    expect(vm.tableData.length).toBe(2);
    expect(vm.total).toBe(2);
    expect(vm.initialLoading).toBe(false);
  });

  it("opens dialog when adding product", async () => {
    const wrapper = mount(ProductPage, mountOptions);
    const vm = wrapper.vm as unknown as { dialogVisible: boolean; dialogTitle: string; handleAdd: () => void };
    vm.dialogVisible = false;
    vm.dialogTitle = "";
    vm.handleAdd();
    expect(vm.dialogVisible).toBe(true);
    expect(vm.dialogTitle).toBe("添加产品");
  });
});
