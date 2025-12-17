import { supabase } from "@/services/supabase";

export interface CompanyProfitStats {
  companyId: number;
  companyName: string;
  totalSales: number; // 总销售额
  grossProfit: number; // 总毛利润 (kept for compatibility)
  totalPurchase: number; // 总进货成本
  totalExpense: number; // 总费用 (projectExpense + operationExpense)
  projectExpense: number; // 总项目费用
  operationExpense: number; // 总公司运营费用
  totalTax: number; // 总税费
  netProfit: number; // 净利润
  contractCount: number;
}

export const getCompanyProfitStatistics = async (
  year: number
): Promise<{
  success: boolean;
  data: CompanyProfitStats[];
  message?: string;
}> => {
  try {
    console.log(`📊 开始查询公司年度利润统计，年度: ${year}`);

    // 1. 获取所有公司
    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("id, company_name")
      .eq("status", 1);

    if (companyError) {
      throw new Error(`获取公司列表失败: ${companyError.message}`);
    }

    if (!companies || companies.length === 0) {
      return { success: true, data: [] };
    }

    // 2. 获取合同数据 (含销售额、进货成本和项目费用)
    const { data: contracts, error: contractError } = await supabase
      .from("contracts")
      .select(
        `
        company_id,
        contract_amount,
        contract_details (
          purchase_amount,
          includes_tax
        ),
        expenses (
          amount
        )
      `
      )
      .eq("status", 1) // 有效合同
      .eq("contract_year", year.toString());

    if (contractError) {
      throw new Error(`获取合同数据失败: ${contractError.message}`);
    }

    // 3. 获取费用管理模块新增的费用 (直接查 expenses 表)
    const { data: generalExpenses, error: expenseError } = await supabase
      .from("expenses")
      .select("company_id, amount")
      .eq("year", year)
      .is("contract_id", null); // 只查询未关联合同的费用

    if (expenseError) {
      throw new Error(`获取费用数据失败: ${expenseError.message}`);
    }

    // 4. 聚合数据
    const statsMap = new Map<number, CompanyProfitStats>();

    // 初始化
    companies.forEach((company: any) => {
      statsMap.set(company.id, {
        companyId: company.id,
        companyName: company.company_name,
        totalSales: 0,
        grossProfit: 0,
        totalPurchase: 0,
        totalExpense: 0,
        projectExpense: 0,
        operationExpense: 0,
        totalTax: 0,
        netProfit: 0,
        contractCount: 0
      });
    });

    // 处理合同数据
    (contracts || []).forEach((contract: any) => {
      const stats = statsMap.get(contract.company_id);
      if (stats) {
        const sales = Number(contract.contract_amount || 0);

        let purchase = 0;
        let taxablePurchase = 0;

        if (
          contract.contract_details &&
          Array.isArray(contract.contract_details)
        ) {
          contract.contract_details.forEach((detail: any) => {
            const amount = Number(detail.purchase_amount || 0);
            purchase += amount;
            if (detail.includes_tax === 1) {
              taxablePurchase += amount;
            }
          });
        }

        let projectExpense = 0;
        if (contract.expenses && Array.isArray(contract.expenses)) {
          contract.expenses.forEach((expense: any) => {
            projectExpense += Number(expense.amount || 0);
          });
        }

        // 计算预估税
        const taxableAmount = Math.max(0, sales - taxablePurchase);
        const vat = (taxableAmount / 1.13) * 0.13;
        const urbanConstructionTax = (vat * 0.07) / 2;
        const educationFee = (vat * 0.03) / 2;
        const localEducationFee = (vat * 0.02) / 2;
        const stampTax = (sales * 0.0003) / 2;
        const waterConstructionFund = (vat * 0.01) / 2;
        const totalTax =
          vat +
          urbanConstructionTax +
          educationFee +
          localEducationFee +
          stampTax +
          waterConstructionFund;

        stats.totalSales += sales;
        stats.totalPurchase += purchase;
        stats.projectExpense += projectExpense;
        stats.totalTax += totalTax;
        stats.contractCount += 1;
      }
    });

    // 处理公司运营费用
    (generalExpenses || []).forEach((expense: any) => {
      if (expense.company_id && statsMap.has(expense.company_id)) {
        const stats = statsMap.get(expense.company_id)!;
        stats.operationExpense += Number(expense.amount || 0);
      }
    });

    // 最终计算
    const result = Array.from(statsMap.values()).map(stats => {
      stats.totalExpense = stats.projectExpense + stats.operationExpense;
      stats.netProfit =
        stats.totalSales -
        stats.totalPurchase -
        stats.totalExpense -
        stats.totalTax;
      stats.grossProfit = stats.totalSales - stats.totalPurchase; // 仅做参考
      return stats;
    });

    // 按净利润排序
    result.sort((a, b) => b.netProfit - a.netProfit);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error("❌ 获取公司利润统计失败:", error);
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
};
