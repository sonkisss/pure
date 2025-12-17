const Layout = () => import("@/layout/index.vue");

export default {
  path: "/invoice",
  name: "Invoice",
  component: Layout,
  redirect: "/invoice/index",
  meta: {
    icon: "ep/document",
    title: "发票管理",
    rank: 15,
    roles: ["admin", "common"]
  },
  children: [
    {
      path: "/invoice/index",
      name: "InvoiceManagement",
      component: () => import("@/views/invoice/index.vue"),
      meta: {
        title: "发票管理",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
