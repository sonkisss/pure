# Excel上传功能修复说明

## 🐛 问题描述

之前的Excel上传功能失败，原因是使用了FormData方式上传文件，但`vite-plugin-fake-server`对FormData的支持存在问题。

## ✅ 修复方案

采用**前端解析Excel + JSON数据传输**的方案：

1. **前端**：使用`xlsx`库直接在浏览器中解析Excel文件
2. **传输**：将解析后的JSON数据发送给后端
3. **后端**：接收JSON数据并保存

这样既解决了FormData的兼容性问题，又实现了真正的Excel解析功能！

---

## 🔧 修改的文件

### 1. `/src/api/supplier.ts`

**修改前：**

```typescript
export const uploadDebtExcel = (debtId: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return http.request("post", `/supplier/debt/${debtId}/excel`, {
    data: formData,
    headers: { "Content-Type": "multipart/form-data" }
  });
};
```

**修改后：**

```typescript
export const uploadDebtExcel = (
  debtId: number,
  items: Array<{
    productName: string;
    productModel: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
    hasTax: boolean;
  }>
) => {
  return http.request("post", `/supplier/debt/${debtId}/excel`, {
    data: { items }
  });
};
```

**变化：**

- 参数从`file: File`改为`items: Array<...>`
- 不再使用FormData
- 直接发送JSON数据

---

### 2. `/mock/supplier.ts`

**修改前：**

```typescript
response: ({ params }) => {
  const debtId = Number(params.debtId);
  // 模拟生成数据，忽略上传的文件
  const items = generateExcelItemsForDebt(debtId, itemCount);
  // ...
};
```

**修改后：**

```typescript
response: ({ params, body }) => {
  const debtId = Number(params.debtId);
  const { items: uploadedItems } = body;

  // 验证数据
  if (
    !uploadedItems ||
    !Array.isArray(uploadedItems) ||
    uploadedItems.length === 0
  ) {
    return { success: false, message: "Excel数据为空或格式不正确" };
  }

  // 转换上传的数据为系统格式
  const items = uploadedItems.map(item => ({
    id: currentExcelItemId++,
    debtId,
    productName: String(item.productName || "")
    // ... 其他字段
  }));
  // ...
};
```

**变化：**

- 从`body`中读取上传的数据
- 添加数据验证逻辑
- 实际保存用户上传的数据，而不是模拟生成

---

### 3. `/src/views/supplier/detail.vue`

**核心修改：**添加了Excel文件解析逻辑

```typescript
const handleExcelUploadSubmit = async () => {
  if (!excelFile.value || !currentUploadDebtId.value) {
    ElMessage.warning("请选择Excel文件");
    return;
  }

  try {
    // 1. 读取Excel文件
    const fileReader = new FileReader();

    fileReader.onload = async e => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });

        // 2. 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 3. 将工作表转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          ElMessage.error("Excel文件为空");
          return;
        }

        // 4. 解析并验证数据（支持中英文字段名）
        const items = jsonData.map((row: any) => {
          const productName = row["产品名称"] || row["productName"] || "";
          const productModel =
            row["产品型号"] || row["规格型号"] || row["productModel"] || "";
          const quantity = Number(row["数量"] || row["quantity"] || 0);
          const unit = row["单位"] || row["unit"] || "";
          const unitPrice = Number(row["单价"] || row["unitPrice"] || 0);
          const amount = Number(row["金额"] || row["amount"] || 0);

          // 处理是否含税字段
          let hasTax = false;
          const taxField =
            row["是否含税"] || row["含税"] || row["hasTax"] || "";
          if (
            taxField === "是" ||
            taxField === true ||
            taxField === "含税" ||
            taxField === 1
          ) {
            hasTax = true;
          }

          return {
            productName,
            productModel,
            quantity,
            unit,
            unitPrice,
            amount,
            hasTax
          };
        });

        // 5. 验证必填字段
        const invalidItems = items.filter(
          item =>
            !item.productName ||
            !item.productModel ||
            item.quantity <= 0 ||
            !item.unit ||
            item.unitPrice < 0
        );

        if (invalidItems.length > 0) {
          ElMessage.error(
            `发现 ${invalidItems.length} 条无效数据，请检查Excel文件格式`
          );
          return;
        }

        // 6. 调用API上传
        const res = await uploadDebtExcel(currentUploadDebtId.value!, items);
        if (res.success) {
          ElMessage.success(res.message);
          uploadExcelDialogVisible.value = false;
          handleRefresh();
        } else {
          ElMessage.error(res.message);
        }
      } catch (error) {
        console.error("Excel解析失败:", error);
        ElMessage.error("Excel文件解析失败，请检查文件格式");
      }
    };

    fileReader.onerror = () => {
      ElMessage.error("文件读取失败");
    };

    fileReader.readAsBinaryString(excelFile.value);
  } catch (error) {
    console.error("上传失败:", error);
    ElMessage.error("上传失败");
  }
};
```

**新增功能：下载Excel模板**

```typescript
const handleDownloadTemplate = () => {
  const templateData = [
    {
      产品名称: "示例产品A",
      产品型号: "MODEL-001",
      数量: 10,
      单位: "个",
      单价: 100.5,
      金额: 1005.0,
      是否含税: "是"
    },
    {
      产品名称: "示例产品B",
      产品型号: "MODEL-002",
      数量: 5,
      单位: "箱",
      单价: 200.0,
      金额: 1000.0,
      是否含税: "否"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "产品明细模板");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  saveAs(blob, "产品明细模板.xlsx");
  ElMessage.success("模板下载成功");
};
```

---

## 🎯 功能特点

### 1. 字段名称灵活匹配

支持**中英文字段名**，以下字段名都可以识别：

| 字段     | 支持的名称                               |
| -------- | ---------------------------------------- |
| 产品名称 | `产品名称` / `productName`               |
| 产品型号 | `产品型号` / `规格型号` / `productModel` |
| 数量     | `数量` / `quantity`                      |
| 单位     | `单位` / `unit`                          |
| 单价     | `单价` / `unitPrice`                     |
| 金额     | `金额` / `amount`                        |
| 是否含税 | `是否含税` / `含税` / `hasTax`           |

### 2. 智能数据验证

- ✅ 自动验证必填字段
- ✅ 数量必须大于0
- ✅ 单价必须大于等于0
- ✅ 自动转换数据类型
- ✅ 智能识别含税字段（"是"/"否"/true/false/1/0）

### 3. 友好的错误提示

- Excel文件为空 → 提示用户
- 数据格式不正确 → 显示无效数据条数
- 解析失败 → 提示检查文件格式
- 上传失败 → 显示具体错误信息

### 4. Excel模板下载

- 🎁 提供标准模板
- 📝 包含示例数据
- 💡 清晰的字段说明

---

## 📝 使用说明

### 步骤1：下载模板

1. 进入供应商详情页
2. 在欠款明细列表中，点击某个欠款的"上传"按钮
3. 在弹出的对话框中，点击"下载Excel模板"
4. 保存模板文件到本地

### 步骤2：填写Excel

在下载的模板中填写产品信息：

```
| 产品名称 | 产品型号 | 数量 | 单位 | 单价   | 金额    | 是否含税 |
|---------|---------|------|------|--------|---------|---------|
| 电脑    | HP-001  | 10   | 台   | 5000   | 50000   | 是      |
| 鼠标    | MS-002  | 50   | 个   | 100    | 5000    | 否      |
| 键盘    | KB-003  | 30   | 个   | 200    | 6000    | 是      |
```

**注意事项：**

- ✅ 产品名称、产品型号、数量、单位、单价为必填
- ✅ 数量必须大于0
- ✅ 单价必须大于等于0
- ✅ "是否含税"填写"是"或"否"
- ✅ 金额可以不填，系统会根据数量×单价计算

### 步骤3：上传Excel

1. 在上传对话框中，拖拽Excel文件到上传区域，或点击选择文件
2. 点击"确定上传"按钮
3. 等待系统解析和上传
4. 上传成功后，会显示成功消息

### 步骤4：查看明细

1. 上传成功后，欠款记录会显示📄图标和产品条数
2. 点击📄图标，进入产品明细页面
3. 查看所有产品的详细信息和统计数据

### 步骤5：批量导出

1. 在欠款明细列表中，勾选多个有Excel数据的欠款
2. 点击"导出明细"按钮
3. 系统自动合并所有产品并生成Excel文件
4. 下载到本地用于对账或存档

---

## 🔍 示例数据

### Excel文件示例（产品明细.xlsx）

```
产品名称    产品型号    数量  单位  单价     金额      是否含税
办公桌      DS-001     20    张   1500     30000     是
办公椅      CH-002     50    把   800      40000     是
电脑主机    PC-003     15    台   5000     75000     是
显示器      MO-004     15    台   2000     30000     否
打印机      PR-005     5     台   3000     15000     否
碎纸机      SH-006     10    台   500      5000      否
```

### 上传后的效果

**欠款明细列表显示：**

```
┌──────────────────────────────────────────┐
│ ☐ ID  金额        描述           Excel明细 │
│ ☐ 101 ¥195,000  办公设备采购     📄 6条   │← 点击图标查看
└──────────────────────────────────────────┘
```

**产品明细页面显示：**

```
┌────────────────────────────────────────────┐
│ 产品种类  含税金额      不含税金额   合计金额 │
│   6      ¥145,000     ¥50,000    ¥195,000 │
└────────────────────────────────────────────┘

产品明细列表：
序号  产品名称  产品型号  数量  单位  单价    金额      是否含税
1     办公桌   DS-001    20    张   1500    30000     [含税]
2     办公椅   CH-002    50    把   800     40000     [含税]
3     电脑主机  PC-003    15    台   5000    75000     [含税]
4     显示器   MO-004    15    台   2000    30000     [不含税]
5     打印机   PR-005    5     台   3000    15000     [不含税]
6     碎纸机   SH-006    10    台   500     5000      [不含税]
```

---

## ⚠️ 常见问题

### Q1: 上传后提示"Excel数据为空或格式不正确"

**原因：**

- Excel文件没有数据行（只有表头）
- Excel工作表为空
- 文件不是有效的Excel格式

**解决方法：**

1. 检查Excel文件是否有数据
2. 确保文件格式为`.xlsx`或`.xls`
3. 尝试下载模板并在模板基础上填写

### Q2: 上传后提示"发现N条无效数据"

**原因：**

- 必填字段为空（产品名称、产品型号、单位）
- 数量小于等于0
- 单价小于0

**解决方法：**

1. 检查所有行的必填字段是否都已填写
2. 确保数量大于0
3. 确保单价大于等于0

### Q3: 字段名称不匹配怎么办？

**答：**系统支持中英文字段名，以下都可以：

- 中文：产品名称、产品型号、数量、单位、单价、金额、是否含税
- 英文：productName、productModel、quantity、unit、unitPrice、amount、hasTax
- 混合：规格型号（也会被识别为产品型号）

### Q4: "是否含税"字段怎么填？

**答：**支持以下任意格式：

- 中文："是" / "否"
- 英文：true / false
- 数字：1 / 0
- 文本："含税" / "不含税"

### Q5: Excel有多个工作表怎么办？

**答：**系统只会读取**第一个工作表**的数据，建议：

1. 将要上传的数据放在第一个工作表
2. 或删除多余的工作表

### Q6: 上传后能否修改产品明细？

**答：**当前版本暂不支持在线修改。如需修改：

1. 在Excel文件中修改数据
2. 重新上传（会覆盖原有数据）

或者使用批量导出功能：

1. 导出现有数据到Excel
2. 在Excel中修改
3. 重新上传

---

## 🚀 技术优势

### 1. 兼容性好

- ✅ 避免FormData兼容性问题
- ✅ 支持所有现代浏览器
- ✅ 无需后端处理文件上传

### 2. 性能优异

- ✅ 客户端解析，减轻服务器负担
- ✅ 即时验证，快速反馈
- ✅ 网络传输数据量小（JSON vs File）

### 3. 用户体验好

- ✅ 实时错误提示
- ✅ 提供标准模板
- ✅ 支持拖拽上传
- ✅ 详细的使用说明

### 4. 可扩展性强

- ✅ 易于添加新的验证规则
- ✅ 支持自定义字段映射
- ✅ 方便集成真实后端API

---

## 📊 测试用例

### 测试1：正常上传

**操作：**上传包含3条有效产品的Excel文件

**预期结果：**

- ✅ 显示"成功上传 3 条产品明细"
- ✅ 欠款记录显示📄图标和"3条"
- ✅ 可以查看产品明细

### 测试2：空文件上传

**操作：**上传空Excel文件（无数据行）

**预期结果：**

- ✅ 提示"Excel文件为空"
- ✅ 不创建产品明细

### 测试3：无效数据上传

**操作：**上传包含缺少必填字段的Excel

**预期结果：**

- ✅ 提示"发现 N 条无效数据，请检查Excel文件格式"
- ✅ 不创建产品明细

### 测试4：字段名称兼容

**操作：**上传英文字段名的Excel文件

**预期结果：**

- ✅ 正常解析并上传
- ✅ 数据显示正确

### 测试5：模板下载

**操作：**点击"下载Excel模板"

**预期结果：**

- ✅ 下载名为"产品明细模板.xlsx"的文件
- ✅ 文件包含示例数据
- ✅ 字段名称为中文

### 测试6：批量导出

**操作：**勾选多个欠款并导出

**预期结果：**

- ✅ 生成包含所有产品的Excel文件
- ✅ 字段名称为中文
- ✅ 数据完整准确

---

## 📝 更新日志

**版本：1.1.0**  
**日期：2025-11-08**

### 修复

- 🐛 修复Excel上传失败的问题（FormData → JSON）
- 🐛 修复Mock层无法接收实际数据的问题

### 新增

- ✨ 新增Excel模板下载功能
- ✨ 新增前端Excel解析和验证
- ✨ 新增中英文字段名兼容
- ✨ 新增详细的错误提示

### 优化

- 💄 优化上传对话框UI，添加下载模板按钮
- 💄 优化字段说明，标注必填和可选
- 📝 完善使用说明文档

---

**修复完成！现在可以正常上传Excel文件了！** 🎉
