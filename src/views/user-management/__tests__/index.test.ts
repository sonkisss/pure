import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import UserManagement from "../index.vue";

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
      const resetFields = vi.fn();
      expose({ clearValidate, validate, resetFields });
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
    Edit: makeIcon("Edit"),
    Refresh: makeIcon("Refresh"),
    Management: makeIcon("Management"),
    Tools: makeIcon("Tools")
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

vi.mock("@/api/user", () => ({
  getUserListApi: vi.fn(() =>
    Promise.resolve({
      success: true,
      list: [
        {
          id: 1,
          username: "admin",
          nickname: "管理员",
          role: "admin",
          is_active: true,
          permissions: []
        },
        {
          id: 2,
          username: "user1",
          nickname: "用户1",
          role: "common",
          is_active: false,
          permissions: ["view"]
        }
      ],
      total: 2
    })
  ),
  addUser: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  createUserApi: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  updateUserApi: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  deleteUserApi: vi.fn(() => Promise.resolve({ success: true, message: "ok" })),
  batchDeleteUsersApi: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
  ),
  toggleUserStatusApi: vi.fn(() =>
    Promise.resolve({ success: true, message: "ok" })
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
      const row = {
        id: 0,
        username: "",
        nickname: "",
        role: "common",
        is_active: true,
        permissions: []
      };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");
  const checkbox = stubComponent("ElCheckbox");
  const checkboxGroup = stubComponent("ElCheckboxGroup");
  const row = stubComponent("ElRow");
  const col = stubComponent("ElCol");
  const divider = stubComponent("ElDivider");
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
    ElSelect: select,
    ElOption: option,
    ElTag: tag,
    ElAlert: alert,
    ElRow: row,
    ElCol: col,
    ElDivider: divider,
    ElCheckbox: checkbox,
    ElCheckboxGroup: checkboxGroup,
    ElIcon: base
  };
});

describe("User management page", () => {
  const base = stubComponent();
  const form = formStub();
  const table = stubComponent("ElTable");
  const column = defineComponent({
    name: "ElTableColumnStub",
    setup(_, { slots, attrs }) {
      const row = {
        id: 0,
        username: "",
        nickname: "",
        role: "common",
        is_active: true,
        permissions: []
      };
      return () => h("div", attrs, slots.default?.({ row }));
    }
  });
  const select = stubComponent("ElSelect");
  const option = stubComponent("ElOption");
  const tag = stubComponent("ElTag");
  const alert = stubComponent("ElAlert");
  const checkbox = stubComponent("ElCheckbox");
  const checkboxGroup = stubComponent("ElCheckboxGroup");
  const row = stubComponent("ElRow");
  const col = stubComponent("ElCol");
  const divider = stubComponent("ElDivider");

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
        ElSelect: select,
        ElOption: option,
        ElTag: tag,
        ElAlert: alert,
        ElRow: row,
        ElCol: col,
        ElDivider: divider,
        ElCheckbox: checkbox,
        ElCheckboxGroup: checkboxGroup,
        ElIcon: base
      }
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads user list and computes selections", async () => {
    const wrapper = mount(UserManagement, mountOptions);
    await flushPromises();
    await vi.runAllTimersAsync();
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      userList: Array<any>;
      hasSelectedAdmin: boolean;
    };

    expect(vm.userList.length).toBe(2);
    // 初始未选择管理员
    expect(vm.hasSelectedAdmin).toBe(false);
  });

  it("opens add dialog", async () => {
    const wrapper = mount(UserManagement, mountOptions);
    const vm = wrapper.vm as unknown as {
      dialogVisible: boolean;
      dialogType: string;
      handleAdd: () => void;
    };
    vm.dialogVisible = false;
    vm.dialogType = "";
    vm.handleAdd();
    expect(vm.dialogVisible).toBe(true);
    expect(vm.dialogType).toBe("add");
  });
});
