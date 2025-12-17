import * as XLSX from "xlsx";

/**
 * Excel解析工具类
 * 用于解析用户上传的Excel文件并转换为标准格式
 */
export class ExcelParser {
  /**
   * 字段映射配置
   * 支持中英文字段名称的灵活映射
   */
  private static readonly FIELD_MAPPING = {
    name: ["产品名称", "name", "产品", "商品名称", "物品名称"],
    specification: ["规格型号", "specification", "规格", "型号", "spec"],
    unit: ["单位", "unit", "计量单位"],
    quantity: ["数量", "quantity", "qty", "数量"],
    purchasePrice: ["进价", "purchasePrice", "price", "价格", "单价", "成本价"],
    purchaseAmount: ["金额", "amount", "totalPrice", "total", "进货金额"],
    salePrice: ["卖价", "salePrice", "sale_price", "售价", "销售价"],
    saleAmount: ["销售金额", "卖价金额", "saleAmount", "sale_amount"],
    supplier: ["供应商", "supplier", "供货商", "厂商", "品牌"],
    taxType: ["含税类型", "taxType", "税率", "含税", "tax"],
    remark: ["备注", "remark", "说明", "描述", "desc"]
  };

  /**
   * 必填字段
   */
  private static readonly REQUIRED_FIELDS = [
    "name",
    "specification",
    "unit",
    "quantity"
  ];

  /**
   * 解析Excel文件
   * @param file Excel文件对象
   * @returns 解析后的数据数组
   */
  static async parseExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // 获取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // 转换为JSON格式
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1
          }) as any[][];

          // 处理数据
          const result = this.processExcelData(jsonData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Excel解析失败: ${error}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("文件读取失败"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 解析产品导入的 Excel 文件（不强制数量为必填）
   */
  static async parseProductExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1
          }) as any[][];
          const required = [
            "name",
            "specification",
            "unit",
            "purchasePrice",
            "supplier"
          ];
          const result = this.processExcelDataWithRequired(jsonData, required);
          resolve(result);
        } catch (error) {
          reject(new Error(`Excel解析失败: ${error}`));
        }
      };
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 处理Excel数据
   * @param jsonData 原始Excel数据
   * @returns 处理后的标准格式数据
   */
  private static processExcelData(jsonData: any[][]): any[] {
    if (!jsonData || jsonData.length === 0) {
      throw new Error("Excel文件格式错误：缺少数据");
    }

    // 寻找第一个非空行作为标题行
    const headerRowIndex = jsonData.findIndex(
      row =>
        Array.isArray(row) &&
        row.some(
          cell =>
            cell !== undefined && cell !== null && String(cell).trim() !== ""
        )
    );
    if (headerRowIndex === -1) {
      throw new Error("Excel文件格式错误：未找到标题行");
    }
    const headers = jsonData[headerRowIndex];
    const dataRows = jsonData.slice(headerRowIndex + 1);

    // 创建字段映射
    const fieldMap = this.createFieldMapping(headers);

    // 验证必填字段
    const missingFields = this.REQUIRED_FIELDS.filter(
      field => fieldMap[field] === undefined
    );
    if (missingFields.length > 0) {
      throw new Error(`缺少必填字段: ${missingFields.join(", ")}`);
    }

    // 处理数据行
    const items = dataRows
      .filter(row =>
        row.some(cell => cell !== undefined && cell !== null && cell !== "")
      )
      .map((row, _index) => {
        const item: any = {
          matchStatus: "unmatched",
          productId: null
        };

        // 映射字段
        Object.keys(fieldMap).forEach(field => {
          const columnIndex = fieldMap[field];
          const rawValue = row[columnIndex];
          item[field] = this.parseValue(field, rawValue);
        });

        // 计算金额
        const computedPurchaseAmount = parseFloat(
          (item.quantity * item.purchasePrice).toFixed(2)
        );
        item.purchaseAmount =
          typeof item.purchaseAmount === "number" && item.purchaseAmount > 0
            ? item.purchaseAmount
            : computedPurchaseAmount;
        item.salePrice = Number(item.salePrice ?? 0);
        if (
          (!item.salePrice || item.salePrice === 0) &&
          Number(item.saleAmount ?? 0) > 0 &&
          item.quantity
        ) {
          item.salePrice = parseFloat(
            (Number(item.saleAmount) / item.quantity).toFixed(2)
          );
        }
        const computedSaleAmount = parseFloat(
          (item.quantity * item.salePrice).toFixed(2)
        );
        item.saleAmount =
          typeof item.saleAmount === "number" && item.saleAmount > 0
            ? item.saleAmount
            : computedSaleAmount;
        item.amount = item.purchaseAmount;

        return item;
      });

    return items;
  }

  /** 使用指定必填字段处理 Excel 数据 */
  private static processExcelDataWithRequired(
    jsonData: any[][],
    requiredFields: string[]
  ): any[] {
    if (jsonData.length < 2) {
      throw new Error("Excel文件格式错误：至少需要标题行和数据行");
    }
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    const fieldMap = this.createFieldMapping(headers);
    const missingFields = requiredFields.filter(
      field => fieldMap[field] === undefined
    );
    if (missingFields.length > 0) {
      throw new Error(`缺少必填字段: ${missingFields.join(", ")}`);
    }
    const items = dataRows
      .filter(row =>
        row.some(cell => cell !== undefined && cell !== null && cell !== "")
      )
      .map(row => {
        const item: any = { matchStatus: "unmatched", productId: null };
        Object.keys(fieldMap).forEach(field => {
          const columnIndex = fieldMap[field];
          const rawValue = row[columnIndex];
          item[field] = this.parseValue(field, rawValue);
        });
        item.quantity = item.quantity ?? 1;
        const computedPurchaseAmount = parseFloat(
          (item.quantity * item.purchasePrice).toFixed(2)
        );
        item.purchaseAmount =
          typeof item.purchaseAmount === "number" && item.purchaseAmount > 0
            ? item.purchaseAmount
            : computedPurchaseAmount;
        item.salePrice = Number(item.salePrice ?? 0);
        if (
          (!item.salePrice || item.salePrice === 0) &&
          Number(item.saleAmount ?? 0) > 0 &&
          item.quantity
        ) {
          item.salePrice = parseFloat(
            (Number(item.saleAmount) / item.quantity).toFixed(2)
          );
        }
        const computedSaleAmount = parseFloat(
          (item.quantity * item.salePrice).toFixed(2)
        );
        item.saleAmount =
          typeof item.saleAmount === "number" && item.saleAmount > 0
            ? item.saleAmount
            : computedSaleAmount;
        item.amount = item.purchaseAmount;
        return item;
      });
    return items;
  }

  /**
   * 创建字段映射
   * @param headers Excel标题行
   * @returns 字段名到列索引的映射
   */
  private static createFieldMapping(headers: any[]): Record<string, number> {
    const fieldMap: Record<string, number> = {};

    const normalize = (val: any) =>
      String(val)
        .replace(/[\s\u3000]/g, "")
        .toLowerCase();
    const normalizedHeaders = headers.map(h => normalize(h));

    Object.keys(this.FIELD_MAPPING).forEach(field => {
      const possibleNames =
        this.FIELD_MAPPING[field as keyof typeof this.FIELD_MAPPING];
      for (const name of possibleNames) {
        const idx = normalizedHeaders.findIndex(h => h === normalize(name));
        if (idx !== -1) {
          fieldMap[field] = idx;
          break;
        }
      }
    });

    // 兜底：若仍未识别name/specification，尝试前两列
    if (fieldMap["name"] === undefined && normalizedHeaders.length)
      fieldMap["name"] = 0;
    if (fieldMap["specification"] === undefined && normalizedHeaders.length > 1)
      fieldMap["specification"] = 1;

    return fieldMap;
  }

  /**
   * 解析单个字段值
   * @param field 字段名
   * @param rawValue 原始值
   * @returns 解析后的值
   */
  private static parseValue(field: string, rawValue: any): any {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return this.getDefaultValue(field);
    }

    switch (field) {
      case "quantity":
      case "purchasePrice":
      case "salePrice":
      case "purchaseAmount":
      case "saleAmount":
        const numValue = parseFloat(String(rawValue).replace(/[,，]/g, ""));
        return isNaN(numValue) ? this.getDefaultValue(field) : numValue;

      case "taxType":
        const taxValue = String(rawValue).trim();
        if (taxValue.includes("含") || taxValue.toLowerCase().includes("tax")) {
          return "含税";
        } else if (taxValue.includes("普票") || taxValue.includes("普通")) {
          return "普票";
        } else if (taxValue.includes("不含") || taxValue.includes("无")) {
          return "不含";
        }
        return "含税"; // 默认值

      default:
        return String(rawValue).trim();
    }
  }

  /**
   * 获取字段默认值
   * @param field 字段名
   * @returns 默认值
   */
  private static getDefaultValue(field: string): any {
    switch (field) {
      case "quantity":
        return 1;
      case "purchasePrice":
      case "salePrice":
      case "purchaseAmount":
      case "saleAmount":
        return 0;
      case "taxType":
        return "含税";
      case "unit":
        return "个";
      default:
        return "";
    }
  }

  /**
   * 验证Excel文件格式
   * @param file 文件对象
   * @returns 验证结果
   */
  static validateExcelFile(file: File): { valid: boolean; message: string } {
    // 检查文件类型
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream"
    ];

    if (!allowedTypes.includes(file.type)) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
        return {
          valid: false,
          message: "不支持的文件格式，请上传 .xlsx 或 .xls 文件"
        };
      }
    }

    // 检查文件大小 (限制10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        message: "文件大小不能超过10MB"
      };
    }

    return {
      valid: true,
      message: "文件格式验证通过"
    };
  }
}
