import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import SupplierList from "../index.vue";

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
    Box: makeIcon("Box")
  };
});

vi.mock("@/api/supplier", () => ({
  getSupplierList: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        list: [
          { id: 1, name: "供应商A", totalPayable: 1000 },
          { id: 2, name: "供应商B", totalPayable: 500 }
        ],
        total: 2
      }
    })
  ),
  addSupplier: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteSupplier: vi.fn(() =>
    Promise.resolve({ success: true, message: "deleted" })
  ),
  batchDeleteSupplier: vi.fn(() =>
    Promise.resolve({ success: true, message: "batch deleted" })
  ),
  updateSupplier: vi.fn(() =>
    Promise.resolve({ success: true, message: "updated" })
  )
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
      const row = { id: 0, name: "", totalPayable: 0 };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
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
    ElIcon: base
  };
});

describe("Supplier list page", () => {
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = { id: 0, name: "", totalPayable: 0 };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });

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

  it("loads supplier list and computes stats", async () => {
    const wrapper = mount(SupplierList, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      tableData: Array<any>;
      totalPayable: number;
      payableSupplierCount: number;
    };

    expect(vm.tableData.length).toBe(2);
    expect(vm.totalPayable).toBe(1500);
    expect(vm.payableSupplierCount).toBe(2);
  });

  it("navigates to detail when clicking name", async () => {
    const wrapper = mount(SupplierList, mountOptions);
    await flushPromises();
    const vm = wrapper.vm as unknown as {
      handleViewDetail: (row: any) => void;
    };
    vm.handleViewDetail({ id: 9 } as any);
    expect(routerPush).toHaveBeenCalledWith("/supplier/detail/9");
  });

  it("opens add dialog", async () => {
    const wrapper = mount(SupplierList, mountOptions);
    const vm = wrapper.vm as unknown as {
      dialogVisible: boolean;
      handleAdd: () => void;
      dialogTitle: string;
    };
    vm.dialogVisible = false;
    vm.handleAdd();
    expect(vm.dialogVisible).toBe(true);
    expect(vm.dialogTitle).toBe("添加供应商");
  });
});
