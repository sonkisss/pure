const Layout = () => import("@/layout/index.vue");

export default {
  path: "/expense",
  name: "Expense",
  component: Layout,
  redirect: "/expense/index",
  meta: {
    icon: "ep/money",
    title: "费用管理",
    rank: 6
  },
  children: [
    {
      path: "/expense/index",
      name: "ExpenseManagement",
      component: () => import("@/views/expense/index.vue"),
      meta: {
        title: "费用管理",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
