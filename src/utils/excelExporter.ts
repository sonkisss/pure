import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import dayjs from "dayjs";

/**
 * Excel导出工具类
 * 用于将数据导出为Excel文件
 */
export class ExcelExporter {
  /**
   * 导出费用明细数据到Excel
   * @param expenses 费用数据数组
   * @param fileName 导出文件名（可选）
   * @returns Promise<void>
   */
  static async exportExpensesToExcel(
    expenses: any[],
    fileName?: string
  ): Promise<void> {
    try {
      if (!expenses || expenses.length === 0) {
        throw new Error("没有数据可以导出");
      }

      // 准备导出数据
      const exportData = expenses.map(expense => ({
        费用名称: expense.title || "",
        费用金额: Number(expense.amount || 0).toFixed(2),
        费用日期: expense.expenseDate
          ? dayjs(expense.expenseDate).format("YYYY-MM-DD")
          : "",
        所属年度: expense.year || new Date().getFullYear(),
        费用类别: expense.category || "",
        所属公司: expense.companyName || "",
        关联合同: expense.contractName || "",
        备注: expense.description || "",
        创建时间: expense.createTime
          ? dayjs(expense.createTime).format("YYYY-MM-DD HH:mm:ss")
          : ""
      }));

      // 创建工作簿
      const workbook = XLSX.utils.book_new();

      // 创建工作表
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // 设置列宽
      const colWidths = [
        { wch: 20 }, // 费用名称
        { wch: 15 }, // 费用金额
        { wch: 12 }, // 费用日期
        { wch: 10 }, // 所属年度
        { wch: 15 }, // 费用类别
        { wch: 20 }, // 所属公司
        { wch: 25 }, // 关联合同
        { wch: 30 }, // 备注
        { wch: 20 } // 创建时间
      ];
      worksheet["!cols"] = colWidths;

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, "费用明细");

      // 生成文件名
      const defaultFileName = `费用明细_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`;
      const finalFileName = fileName || defaultFileName;

      // 导出文件
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array"
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      saveAs(blob, finalFileName);
    } catch (error) {
      throw new Error(
        `导出Excel失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 导出任何数据到Excel（通用方法）
   * @param data 要导出的数据数组
   * @param columns 列配置 [{header: '列标题', key: '数据字段', width: 列宽}]
   * @param sheetName 工作表名称
   * @param fileName 文件名
   * @returns Promise<void>
   */
  static async exportToExcel(
    data: any[],
    columns: { header: string; key: string; width?: number }[],
    sheetName: string = "Sheet1",
    fileName?: string
  ): Promise<void> {
    try {
      if (!data || data.length === 0) {
        throw new Error("没有数据可以导出");
      }

      // 准备导出数据
      const exportData = data.map(item => {
        const row: any = {};
        columns.forEach(col => {
          row[col.header] = this.formatCellValue(item[col.key]);
        });
        return row;
      });

      // 创建工作簿
      const workbook = XLSX.utils.book_new();

      // 创建工作表
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // 设置列宽
      const colWidths = columns.map(col => ({ wch: col.width || 15 }));
      worksheet["!cols"] = colWidths;

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // 生成文件名
      const defaultFileName = `${sheetName}_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`;
      const finalFileName = fileName || defaultFileName;

      // 导出文件
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array"
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      saveAs(blob, finalFileName);
    } catch (error) {
      throw new Error(
        `导出Excel失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 格式化单元格值
   * @param value 原始值
   * @returns 格式化后的值
   */
  private static formatCellValue(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (value instanceof Date) {
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    }

    if (typeof value === "number") {
      return value.toString();
    }

    return String(value);
  }

  /**
   * 获取当前时间戳文件名
   * @param prefix 文件名前缀
   * @returns 带时间戳的文件名
   */
  static getTimestampFileName(
    prefix: string,
    extension: string = "xlsx"
  ): string {
    const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    return `${prefix}_${timestamp}.${extension}`;
  }
}
