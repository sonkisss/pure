# 真实Excel文件解析实现指南

## 📋 概述

本文档详细介绍如何将当前的mock Excel解析功能升级为真实的Excel文件解析功能。

## 🔧 实现方式

### 方式1: 前端解析 + 后端验证（推荐）

```typescript
// 前端上传处理
const handleImportExcelUpload = async () => {
  if (!importExcelFile.value) {
    ElMessage.warning("请选择Excel文件");
    return;
  }

  try {
    loading.value = true;

    // 1. 前端文件验证
    const validation = ExcelParser.validateExcelFile(importExcelFile.value);
    if (!validation.valid) {
      ElMessage.error(validation.message);
      return;
    }

    // 2. 前端解析Excel
    const parsedData = await ExcelParser.parseExcelFile(importExcelFile.value);

    if (parsedData.length === 0) {
      ElMessage.warning("Excel文件中没有找到有效数据");
      return;
    }

    // 3. 显示解析结果预览
    showDataPreview(parsedData);
  } catch (error) {
    ElMessage.error(`Excel解析失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 确认导入
const handleConfirmImport = async () => {
  try {
    const res = await uploadInquiryExcel({
      items: parsedData,
      inquiryId: inquiry.value?.id
    });

    if (res.success) {
      ElMessage.success("数据导入成功");
      // 刷新页面数据
      await fetchDetail();
    }
  } catch (error) {
    ElMessage.error("导入失败");
  }
};
```

### 方式2: 纯后端解析

```typescript
// 后端API实现（Node.js + Express）
const multer = require("multer");
const XLSX = require("xlsx");

const upload = multer({ dest: "uploads/" });

app.post(
  "/api/inquiry/upload-excel",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "未上传文件" });
      }

      // 读取Excel文件
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 转换为JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // 字段映射和验证
      const processedData = jsonData.map(row => ({
        name: row["产品名称"] || row["name"] || "",
        specification: row["规格型号"] || row["specification"] || "",
        unit: row["单位"] || row["unit"] || "个",
        quantity: parseFloat(row["数量"] || row["quantity"] || 1),
        purchasePrice: parseFloat(row["进价"] || row["purchasePrice"] || 0),
        supplier: row["供应商"] || row["supplier"] || "",
        taxType: row["含税类型"] || row["taxType"] || "含税",
        remark: row["备注"] || row["remark"] || "",
        // 计算金额
        amount:
          parseFloat(row["数量"] || row["quantity"] || 1) *
          parseFloat(row["进价"] || row["purchasePrice"] || 0),
        matchStatus: "unmatched",
        productId: null
      }));

      // 删除临时文件
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        data: {
          items: processedData
        }
      });
    } catch (error) {
      console.error("Excel解析错误:", error);
      res.status(500).json({
        success: false,
        message: "Excel解析失败"
      });
    }
  }
);
```

## 🛠️ 字段映射配置

### 支持的字段名称

| 字段     | 中文名称 | 英文名称      | 其他可能名称       |
| -------- | -------- | ------------- | ------------------ |
| 产品名称 | 产品名称 | name          | 商品名称、物品名称 |
| 规格型号 | 规格型号 | specification | 规格、型号、spec   |
| 单位     | 单位     | unit          | 计量单位           |
| 数量     | 数量     | quantity      | qty、数量          |
| 进价     | 进价     | purchasePrice | 价格、单价、成本价 |
| 供应商   | 供应商   | supplier      | 供货商、厂商、品牌 |
| 含税类型 | 含税类型 | taxType       | 税率、含税、tax    |
| 备注     | 备注     | remark        | 说明、描述、desc   |

### 必填字段验证

```typescript
const REQUIRED_FIELDS = ["name", "specification", "unit", "quantity"];

// 字段验证逻辑
const validateFields = (data: any[]) => {
  const errors: string[] = [];

  data.forEach((row, index) => {
    REQUIRED_FIELDS.forEach(field => {
      if (!row[field] || row[field] === "") {
        errors.push(`第${index + 1}行缺少必填字段: ${field}`);
      }
    });
  });

  return errors;
};
```

## 🔒 文件安全处理

### 文件类型验证

```typescript
const ALLOWED_TYPES = [
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // .xlsx
];

const validateFileType = (file: File) => {
  return (
    ALLOWED_TYPES.includes(file.type) ||
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.name.toLowerCase().endsWith(".xls")
  );
};
```

### 文件大小限制

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFileSize = (file: File) => {
  return file.size <= MAX_FILE_SIZE;
};
```

### 病毒扫描（生产环境）

```typescript
// 使用clamav进行病毒扫描
const clamav = require("clamav.js");

const scanFile = async (filePath: string) => {
  return new Promise((resolve, reject) => {
    clamav.scanFile(filePath, (err, object, viruses) => {
      if (err) {
        reject(err);
      } else if (viruses && viruses.length > 0) {
        reject(new Error("文件包含病毒"));
      } else {
        resolve(true);
      }
    });
  });
};
```

## 📊 性能优化

### 大文件处理

```typescript
// 流式处理大文件
const processLargeExcel = async (filePath: string) => {
  const workbook = XLSX.readFile(filePath, {
    cellStyles: false, // 忽略样式
    cellHTML: false, // 忽略HTML
    dense: true // 使用密集模式
  });

  // 只处理第一个工作表
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];

  // 使用range限制处理范围
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const limitedRange = `${range.s.r}:${Math.min(range.e.r, 1000)}`; // 最多1000行

  return XLSX.utils.sheet_to_json(worksheet, {
    range: limitedRange,
    header: 1,
    defval: ""
  });
};
```

### 缓存机制

```typescript
// Redis缓存解析结果
const cacheKey = `excel:${fileHash}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// 解析并缓存
const result = await parseExcelFile(filePath);
await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 缓存1小时
```

## 🧪 测试策略

### 单元测试

```typescript
import { ExcelParser } from "@/utils/excelParser";

describe("ExcelParser", () => {
  test("应该正确解析标准Excel文件", async () => {
    const mockFile = new File(["test"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const result = await ExcelParser.parseExcelFile(mockFile);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("specification");
  });

  test("应该验证必填字段", () => {
    const invalidData = [{ name: "", specification: "" }];

    expect(() => {
      ExcelParser.processExcelData([["产品名称", "规格型号"], ...invalidData]);
    }).toThrow("缺少必填字段");
  });
});
```

### 集成测试

```typescript
describe("Excel导入集成测试", () => {
  test("完整导入流程", async () => {
    // 1. 上传Excel文件
    const response = await request(app)
      .post("/api/inquiry/upload-excel")
      .attach("file", "test-files/sample.xlsx")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(3);

    // 2. 验证数据格式
    const items = response.body.data.items;
    items.forEach(item => {
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("quantity");
      expect(item).toHaveProperty("amount");
      expect(item.matchStatus).toBe("unmatched");
    });
  });
});
```

## 📈 监控和日志

### 解析监控

```typescript
// 监控解析性能
const monitorParsePerformance = (
  fileName: string,
  startTime: number,
  dataCount: number
) => {
  const duration = Date.now() - startTime;
  const performance = {
    fileName,
    duration,
    dataCount,
    throughput: dataCount / (duration / 1000), // 每秒处理数量
    timestamp: new Date().toISOString()
  };

  logger.info("Excel解析性能", performance);

  // 发送到监控系统
  metrics.gauge("excel.parse.duration", duration);
  metrics.gauge("excel.parse.count", dataCount);
};
```

### 错误日志

```typescript
const logParseError = (fileName: string, error: Error) => {
  logger.error("Excel解析失败", {
    fileName,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // 告警通知
  if (error.message.includes("必填字段")) {
    alertService.send("Excel导入字段验证失败", `文件: ${fileName}`);
  }
};
```

## 🚀 部署注意事项

### 内存管理

```typescript
// 设置Node.js内存限制
process.env.NODE_OPTIONS = "--max-old-space-size=4096";

// 及时清理临时文件
const cleanupTempFiles = () => {
  const tempDir = os.tmpdir();
  fs.readdir(tempDir, (err, files) => {
    if (err) return;

    files.forEach(file => {
      if (file.endsWith(".xlsx") || file.endsWith(".xls")) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);

        // 删除超过1小时的临时文件
        if (Date.now() - stats.mtime.getTime() > 3600000) {
          fs.unlinkSync(filePath);
        }
      }
    });
  });
};
```

### 负载均衡

```typescript
// 使用队列处理Excel解析任务
const excelQueue = new Queue("excel-parse", {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000
    }
  }
});

// 处理队列任务
excelQueue.process(async job => {
  const { filePath, options } = job.data;
  return await processExcelFile(filePath, options);
});
```

## 🔍 故障排除

### 常见问题

1. **文件格式错误**
   - 检查文件是否为真正的Excel格式
   - 验证文件头部字节

2. **字段映射失败**
   - 检查Excel标题行格式
   - 验证字段名称是否在映射表中

3. **内存溢出**
   - 限制文件大小
   - 使用流式处理
   - 及时清理临时文件

4. **编码问题**
   - 统一使用UTF-8编码
   - 处理特殊字符转换

### 调试工具

```typescript
// Excel文件调试工具
const debugExcelFile = async (filePath: string) => {
  const workbook = XLSX.readFile(filePath);

  console.log("工作表:", workbook.SheetNames);
  console.log("属性:", workbook.Props);

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`工作表 ${sheetName}:`);
    console.log("- 行数:", jsonData.length);
    console.log("- 列数:", Object.keys(jsonData[0] || {}).length);
    console.log("- 列名:", Object.keys(jsonData[0] || {}));
    console.log("- 前3行数据:", jsonData.slice(0, 3));
  });
};
```

## 📝 总结

实现真实的Excel解析功能需要考虑：

1. **安全性**: 文件类型验证、大小限制、病毒扫描
2. **性能**: 大文件处理、内存管理、缓存机制
3. **可靠性**: 错误处理、数据验证、重试机制
4. **可维护性**: 模块化设计、详细日志、监控告警
5. **用户体验**: 进度提示、错误反馈、预览功能

通过以上实现，可以构建一个完整的、生产就绪的Excel文件导入功能。
