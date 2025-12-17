export default {
  path: "/user-management",
  name: "UserManagement",
  component: () => import("@/layout/index.vue"),
  redirect: "/user-management/list",
  meta: {
    icon: "ep/user",
    title: "用户管理",
    rank: 30,
    roles: ["admin"]
  },
  children: [
    {
      path: "/user-management/list",
      name: "UserManagementList",
      component: () => import("@/views/user-management/index.vue"),
      meta: {
        title: "用户列表",
        showLink: true,
        activeMenu: "/user-management",
        roles: ["admin"], // 仅管理员可见
        auths: ["user:add", "user:edit", "user:delete", "user:status"] // 按钮级别权限
      }
    }
  ]
} satisfies RouteConfigsTable;
