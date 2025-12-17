const Layout = () => import("@/layout/index.vue");

export default {
  path: "/product",
  name: "Product",
  component: Layout,
  redirect: "/product/index",
  meta: {
    icon: "ep/goods",
    title: "产品管理",
    rank: 4,
    roles: ["admin", "common"]
  },
  children: [
    {
      path: "/product/index",
      name: "ProductList",
      component: () => import("@/views/product/index.vue"),
      meta: {
        title: "产品管理",
        showLink: true
      }
    },
    {
      path: "/product/contract-details",
      name: "ProductContractDetails",
      component: () => import("@/views/product/contract-details.vue"),
      meta: {
        title: "合同明细表",
        showLink: true
      }
    },
    {
      path: "/product/inquiry-details",
      name: "ProductInquiryDetails",
      component: () => import("@/views/product/inquiry-details.vue"),
      meta: {
        title: "询价明细表",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
