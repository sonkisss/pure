const Layout = () => import("@/layout/index.vue");

export default {
  path: "/business",
  name: "Business",
  component: Layout,
  redirect: "/business/companies",
  meta: {
    icon: "ep/money",
    title: "业务管理",
    rank: 2.5,
    roles: ["admin", "common"]
  },
  children: [
    {
      path: "/business/companies",
      name: "CompanyList",
      component: () => import("@/views/business/companies/index.vue"),
      meta: {
        title: "选择公司",
        showLink: true,
        activeMenu: "/business",
        auths: ["company:add", "company:edit", "company:delete"]
      }
    },
    {
      path: "/business/contracts",
      name: "ContractList",
      component: () => import("@/views/business/contracts/index.vue"),
      meta: {
        title: "合同列表",
        showLink: false,
        activeMenu: "/business",
        auths: [
          "contract:add",
          "contract:edit",
          "contract:delete",
          "contract:view"
        ]
      }
    },
    {
      path: "/business/contracts/:id",
      name: "ContractDetail",
      component: () => import("@/views/business/contracts/detail.vue"),
      meta: {
        title: "合同明细",
        showLink: false,
        activeMenu: "/business",
        auths: [
          "contract:view",
          "contract-detail:add",
          "contract-detail:edit",
          "contract-detail:delete",
          "expense:add",
          "expense:edit",
          "expense:delete"
        ]
      }
    },
    // 兼容旧链接：历史路径为 /business/contracts/detail/:id
    {
      path: "/business/contracts/detail/:id",
      name: "ContractDetailLegacy",
      component: () => import("@/views/business/contracts/detail.vue"),
      meta: {
        title: "合同明细",
        showLink: false,
        activeMenu: "/business"
      }
    }
  ]
} satisfies RouteConfigsTable;
