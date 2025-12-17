const Layout = () => import("@/layout/index.vue");

export default {
  path: "/inquiry",
  name: "Inquiry",
  component: Layout,
  redirect: "/inquiry/index",
  meta: {
    icon: "ep/document",
    title: "询价管理",
    rank: 5,
    roles: ["admin", "common"]
  },
  children: [
    {
      path: "/inquiry/index",
      name: "InquiryList",
      component: () => import("@/views/inquiry/index.vue"),
      meta: {
        title: "询价管理",
        showLink: true
      }
    },
    {
      path: "/inquiry/detail/:id",
      name: "InquiryDetail",
      component: () => import("@/views/inquiry/detail.vue"),
      meta: {
        title: "询价详情",
        showLink: false,
        activeMenu: "/inquiry/index"
      }
    }
  ]
} satisfies RouteConfigsTable;
