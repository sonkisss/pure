import type { Plugin } from "vite";

export function apiRoutesPlugin(): Plugin {
  return {
    name: "api-routes",
    configureServer(server) {
      server.middlewares.use("/api/get-async-routes", (req, res, next) => {
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS"
          );
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
          );

          // 使用静态路由模式，API返回空数据避免重复
          const routesData = {
            success: true,
            data: []
          };

          res.end(JSON.stringify(routesData));
        } else {
          next();
        }
      });
    }
  };
}

// 动态路由配置
export const dynamicRoutes = [
  {
    path: "/inquiry",
    name: "Inquiry",
    component: "inquiry/index",
    meta: {
      icon: "ep:document",
      title: "询价管理",
      rank: 5,
      roles: ["admin", "common"]
    }
  },
  {
    path: "/customer",
    name: "Customer",
    component: "customer/index",
    meta: {
      icon: "ep:user",
      title: "客户管理",
      rank: 1,
      roles: ["admin", "common"]
    }
  },
  {
    path: "/supplier",
    name: "Supplier",
    component: "supplier/index",
    meta: {
      icon: "ep:shop",
      title: "供应商管理",
      rank: 2,
      roles: ["admin", "common"]
    }
  },
  {
    path: "/business",
    name: "Business",
    component: "Layout",
    redirect: "/business/companies",
    meta: {
      icon: "ep:money",
      title: "业务管理",
      rank: 2.5,
      roles: ["admin", "common"]
    },
    children: [
      {
        path: "/business/companies",
        name: "CompanyList",
        component: "business/companies/index",
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
        component: "business/contracts/index",
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
        component: "business/contracts/detail",
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
      }
    ]
  },
  {
    path: "/product",
    name: "Product",
    component: "Layout",
    redirect: "/product/index",
    meta: {
      icon: "ep:goods",
      title: "产品管理",
      rank: 4,
      roles: ["admin", "common"]
    },
    children: [
      {
        path: "/product/index",
        name: "ProductList",
        component: "product/index",
        meta: {
          title: "产品管理",
          showLink: true
        }
      },
      {
        path: "/product/contract-details",
        name: "ProductContractDetails",
        component: "product/contract-details",
        meta: {
          title: "合同明细表",
          showLink: true
        }
      },
      {
        path: "/product/inquiry-details",
        name: "ProductInquiryDetails",
        component: "product/inquiry-details",
        meta: {
          title: "询价明细表",
          showLink: true
        }
      }
    ]
  },
  {
    path: "/user-management",
    name: "UserManagement",
    component: "Layout",
    redirect: "/user-management/list",
    meta: {
      icon: "ep:user",
      title: "用户管理",
      rank: 30,
      roles: ["admin"]
    },
    children: [
      {
        path: "/user-management/list",
        name: "UserManagementList",
        component: "user-management/index",
        meta: {
          title: "用户列表",
          roles: ["admin"],
          auths: ["user:add", "user:edit", "user:delete", "user:status"]
        }
      }
    ]
  }
];
