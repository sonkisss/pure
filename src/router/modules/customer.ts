const Layout = () => import("@/layout/index.vue");

export default {
  path: "/customer",
  name: "Customer",
  component: Layout,
  redirect: "/customer/index",
  meta: {
    icon: "ep/user",
    title: "客户管理",
    rank: 2,
    roles: ["admin", "common"]
  },
  children: [
    {
      path: "/customer/index",
      name: "CustomerManagement",
      component: () => import("@/views/customer/index.vue"),
      meta: {
        title: "客户管理",
        showLink: true
      }
    },
    {
      path: "/customer/detail/:id",
      name: "CustomerDetail",
      component: () => import("@/views/customer/detail.vue"),
      meta: {
        title: "客户详情",
        showLink: false,
        activeMenu: "/customer/index"
      }
    }
  ]
} satisfies RouteConfigsTable;
