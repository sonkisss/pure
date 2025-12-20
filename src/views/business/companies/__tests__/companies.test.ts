import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import CompaniesPage from "../index.vue";

const routerPush = vi.fn();

function createStub(name = "ElStub") {
  return defineComponent({
    name,
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
    OfficeBuilding: makeIcon("OfficeBuilding"),
    ArrowDown: makeIcon("ArrowDown"),
    Edit: makeIcon("Edit"),
    Delete: makeIcon("Delete"),
    Check: makeIcon("Check"),
    Close: makeIcon("Close"),
    Document: makeIcon("Document"),
    User: makeIcon("User"),
    Phone: makeIcon("Phone"),
    Clock: makeIcon("Clock"),
    Money: makeIcon("Money"),
    TrendCharts: makeIcon("TrendCharts")
  };
});

vi.mock("@/components/Auth", () => ({
  Auth: defineComponent({
    name: "Auth",
    setup(_, { slots }) {
      return () => slots.default?.();
    }
  })
}));

vi.mock("@/components/CompanyCardSkeleton.vue", () => ({
  default: defineComponent({
    name: "CompanyCardSkeleton",
    setup() {
      return () => h("div", "skeleton");
    }
  })
}));

vi.mock("@/api/business", () => ({
  getAllCompanies: vi.fn(() =>
    Promise.resolve({
      data: [
        { id: 1, company_name: "公司A", created_at: "2024-01-01" },
        { id: 2, company_name: "公司B", created_at: "2024-02-01" }
      ]
    })
  ),
  getContractStatistics: vi.fn(() =>
    Promise.resolve({
      data: {
        total_sales: 1000,
        total_profit: 300,
        contract_count: 5,
        year: 2024
      }
    })
  ),
  addCompany: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  updateCompany: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteCompany: vi.fn(() => Promise.resolve({ success: true, message: "ok" }))
}));

vi.mock("@/router/utils", () => ({
  hasAuth: () => true
}));

vi.mock("@/utils/unifiedStatisticsCache", () => {
  const cache = new Map<string, any>();
  return {
    unifiedStatisticsCache: {
      get: (id: number, year: number) => cache.get(`${id}-${year}`),
      set: (id: number, year: number, val: any) =>
        cache.set(`${id}-${year}`, val),
      invalidate: (id: number) => {
        [...cache.keys()].forEach(k => {
          if (k.startsWith(`${id}-`)) cache.delete(k);
        });
      }
    }
  };
});

vi.mock("element-plus", () => {
  const ElMessage = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
  const ElMessageBox = { confirm: vi.fn(() => Promise.resolve()) };
  const stub = createStub();
  const formStub = createFormStub();
  const rowStub = createStub("ElRow");
  const colStub = createStub("ElCol");
  const dropdownStub = createStub("ElDropdown");
  const dropdownMenuStub = createStub("ElDropdownMenu");
  const dropdownItemStub = createStub("ElDropdownItem");
  return {
    ElMessage,
    ElMessageBox,
    ElCard: stub,
    ElButton: stub,
    ElDialog: stub,
    ElForm: formStub,
    ElFormItem: stub,
    ElInput: stub,
    ElDropdown: dropdownStub,
    ElDropdownMenu: dropdownMenuStub,
    ElDropdownItem: dropdownItemStub,
    ElIcon: stub,
    ElRow: rowStub,
    ElCol: colStub
  };
});

describe("Business companies page", () => {
  const stub = createStub();
  const formStub = createFormStub();
  const rowStub = createStub("ElRow");
  const colStub = createStub("ElCol");
  const dropdownStub = createStub("ElDropdown");
  const dropdownMenuStub = createStub("ElDropdownMenu");
  const dropdownItemStub = createStub("ElDropdownItem");

  const mountOptions = {
    global: {
      directives: { loading: () => undefined },
      components: {
        ElCard: stub,
        ElButton: stub,
        ElDialog: stub,
        ElForm: formStub,
        ElFormItem: stub,
        ElInput: stub,
        ElDropdown: dropdownStub,
        ElDropdownMenu: dropdownMenuStub,
        ElDropdownItem: dropdownItemStub,
        ElIcon: stub,
        ElRow: rowStub,
        ElCol: colStub
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

  it("loads companies and their statistics", async () => {
    const wrapper = mount(CompaniesPage, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as { companyList: Array<any> };
    expect(vm.companyList.length).toBe(2);
    expect(vm.companyList[0].statistics.total_sales).toBe(1000);
    expect(vm.companyList[0].statistics.total_profit).toBe(300);
  });

  it("navigates to contract list on company click", async () => {
    const wrapper = mount(CompaniesPage, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      handleCompanyClick: (c: any) => void;
    };
    vm.handleCompanyClick({ id: 99, company_name: "测试公司" } as any);
    expect(routerPush).toHaveBeenCalledWith({
      name: "ContractList",
      query: { company_id: 99, company_name: "测试公司" }
    });
  });

  it("opens dialog on add company", async () => {
    const wrapper = mount(CompaniesPage, mountOptions);
    const vm = wrapper.vm as unknown as {
      dialogVisible: boolean;
      isEdit: boolean;
      handleAdd: () => void;
    };
    vm.dialogVisible = false;
    vm.isEdit = true;

    vm.handleAdd();
    expect(vm.dialogVisible).toBe(true);
    expect(vm.isEdit).toBe(false);
  });
});
