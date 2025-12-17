const Layout = () => import("@/layout/index.vue");

export default {
  path: "/supplier",
  name: "Supplier",
  component: Layout,
  redirect: "/supplier/index",
  meta: {
    icon: "ep/box",
    title: "供应商管理",
    rank: 3,
    roles: ["admin", "common"]
  },
  children: [
    {
      path: "/supplier/index",
      name: "SupplierList",
      component: () => import("@/views/supplier/index.vue"),
      meta: {
        title: "供应商管理",
        showLink: true
      }
    },
    {
      path: "/supplier/detail/:id",
      name: "SupplierDetail",
      component: () => import("@/views/supplier/detail.vue"),
      meta: {
        title: "供应商详情",
        showLink: false,
        activeMenu: "/supplier/index"
      }
    },
    {
      path: "/supplier/debt/:debtId/excel",
      name: "SupplierDebtExcel",
      component: () => import("@/views/supplier/excel-detail.vue"),
      meta: {
        title: "产品明细",
        showLink: false,
        activeMenu: "/supplier/index"
      }
    }
  ]
} satisfies RouteConfigsTable;
