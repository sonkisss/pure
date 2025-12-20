#!/usr/bin/env node

/**
 * 数据库迁移工具
 * 将Mock数据迁移到PostgreSQL数据库
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库连接配置
const dbConfig = {
  host: "vue3-admin-db-postgresql.ns-ci7ty6w8.svc",
  port: 5432,
  database: "vue3-admin-db",
  user: "postgres",
  password: "zhfs26fp",
  ssl: false
};

// 创建数据库连接
const client = new Client(dbConfig);

// 日志函数
const log = (message, level = "info") => {
  const timestamp = new Date().toISOString();
  const prefix =
    level === "error"
      ? "❌"
      : level === "warn"
        ? "⚠️"
        : level === "success"
          ? "✅"
          : "ℹ️";
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

// 执行SQL文件
async function executeSqlFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, "utf8");
    log(`执行SQL文件: ${filePath}`);

    await client.query(sql);
    log("SQL文件执行成功", "success");
  } catch (error) {
    log(`SQL文件执行失败: ${error.message}`, "error");
    throw error;
  }
}

// 导入供应商数据
async function migrateSuppliers() {
  try {
    log("开始迁移供应商数据...");

    // 读取Mock数据
    const supplierMockPath = path.join(__dirname, "../mock/supplier.ts");
    fs.readFileSync(supplierMockPath, "utf8");

    // 提取供应商数据（简化处理，实际应该解析TypeScript）
    const suppliers = [];
    for (let i = 1; i <= 30; i++) {
      suppliers.push({
        name: `供应商${i}号`,
        code: `SUP${String(i).padStart(4, "0")}`,
        contact_person: `联系人${i}`,
        phone: `138${String(Math.random()).substr(2, 8)}`,
        email: `supplier${i}@example.com`,
        total_payable: Math.random() * 50000,
        status: "active",
        remark: `供应商${i}的备注信息`
      });
    }

    // 插入数据
    for (const supplier of suppliers) {
      await client.query(
        `
        INSERT INTO suppliers (name, code, contact_person, phone, email, total_payable, status, remark)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (code) DO NOTHING
      `,
        [
          supplier.name,
          supplier.code,
          supplier.contact_person,
          supplier.phone,
          supplier.email,
          supplier.total_payable,
          supplier.status,
          supplier.remark
        ]
      );
    }

    log(`成功迁移 ${suppliers.length} 个供应商`, "success");
  } catch (error) {
    log(`供应商数据迁移失败: ${error.message}`, "error");
    throw error;
  }
}

// 导入客户数据
async function migrateCustomers() {
  try {
    log("开始迁移客户数据...");

    const customers = [];
    for (let i = 1; i <= 50; i++) {
      customers.push({
        name: `客户${i}号`,
        code: `CUS${String(i).padStart(4, "0")}`,
        contact_person: `客户联系人${i}`,
        phone: `139${String(Math.random()).substr(2, 8)}`,
        email: `customer${i}@example.com`,
        total_debt: Math.random() * 100000,
        credit_limit: 50000,
        status: "active",
        remark: `客户${i}的备注信息`
      });
    }

    for (const customer of customers) {
      await client.query(
        `
        INSERT INTO customers (name, code, contact_person, phone, email, total_debt, credit_limit, status, remark)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (code) DO NOTHING
      `,
        [
          customer.name,
          customer.code,
          customer.contact_person,
          customer.phone,
          customer.email,
          customer.total_debt,
          customer.credit_limit,
          customer.status,
          customer.remark
        ]
      );
    }

    log(`成功迁移 ${customers.length} 个客户`, "success");
  } catch (error) {
    log(`客户数据迁移失败: ${error.message}`, "error");
    throw error;
  }
}

// 导入产品数据
async function migrateProducts() {
  try {
    log("开始迁移产品数据...");

    const units = ["个", "箱", "台", "套", "件", "包", "盒", "瓶", "kg", "米"];
    const categories = ["电子产品", "办公用品", "家具", "工具", "材料"];

    const products = [];

    // 基础产品
    for (let i = 1; i <= 30; i++) {
      const purchasePrice = Math.random() * 5000 + 10;
      products.push({
        name: `产品${i}号`,
        code: `PROD${String(i).padStart(4, "0")}`,
        specification: `SPEC-${String(Math.random()).substr(2, 6).toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        unit: units[Math.floor(Math.random() * units.length)],
        purchase_price: purchasePrice,
        selling_price: purchasePrice * 1.2,
        tax_type: ["含税", "普票", "不含"][Math.floor(Math.random() * 3)],
        stock_quantity: Math.floor(Math.random() * 1000),
        status: "active",
        remark: `产品${i}的描述信息`
      });
    }

    // 特定测试产品
    const testProducts = [
      {
        name: "笔记本电脑",
        code: "PROD1001",
        specification: "I5-12450H/16GB/512GB",
        category: "电子产品",
        unit: "台",
        purchase_price: 5999.0,
        selling_price: 6999.0,
        tax_type: "含税",
        stock_quantity: 50,
        status: "active",
        remark: "办公用笔记本"
      },
      {
        name: "台式电脑",
        code: "PROD1002",
        specification: "I7-13700K/32GB/1TB/RTX4070",
        category: "电子产品",
        unit: "台",
        purchase_price: 12999.0,
        selling_price: 14999.0,
        tax_type: "含税",
        stock_quantity: 20,
        status: "active",
        remark: "高端台式机"
      }
    ];

    products.push(...testProducts);

    for (const product of products) {
      await client.query(
        `
        INSERT INTO products (name, code, specification, category, unit, purchase_price, selling_price, tax_type, stock_quantity, status, remark)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (code) DO NOTHING
      `,
        [
          product.name,
          product.code,
          product.specification,
          product.category,
          product.unit,
          product.purchase_price,
          product.selling_price,
          product.tax_type,
          product.stock_quantity,
          product.status,
          product.remark
        ]
      );
    }

    log(`成功迁移 ${products.length} 个产品`, "success");
  } catch (error) {
    log(`产品数据迁移失败: ${error.message}`, "error");
    throw error;
  }
}

// 生成供应商欠款数据
async function generateSupplierDebts() {
  try {
    log("开始生成供应商欠款数据...");

    // 获取供应商列表
    const supplierResult = await client.query(
      "SELECT id FROM suppliers LIMIT 30"
    );
    const suppliers = supplierResult.rows;

    let debtCount = 0;
    for (const supplier of suppliers) {
      const recordCount = Math.floor(Math.random() * 5) + 1;

      for (let i = 0; i < recordCount; i++) {
        const amount = Math.random() * 20000 + 1000;
        const hasExcel = Math.random() > 0.5;

        await client.query(
          `
          INSERT INTO supplier_debts (supplier_id, amount, description, debt_date, due_date, has_excel_data, excel_item_count)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            supplier.id,
            amount,
            `采购费用 ${debtCount + 1}`,
            new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            hasExcel,
            hasExcel ? Math.floor(Math.random() * 10) + 3 : 0
          ]
        );

        debtCount++;
      }
    }

    log(`成功生成 ${debtCount} 条供应商欠款记录`, "success");
  } catch (error) {
    log(`生成供应商欠款数据失败: ${error.message}`, "error");
    throw error;
  }
}

// 生成客户付款记录
async function generateCustomerPayments() {
  try {
    log("开始生成客户付款记录...");

    const customerResult = await client.query(
      "SELECT id FROM customers LIMIT 50"
    );
    const customers = customerResult.rows;

    let paymentCount = 0;
    for (const customer of customers) {
      const recordCount = Math.floor(Math.random() * 8) + 3;

      for (let i = 0; i < recordCount; i++) {
        await client.query(
          `
          INSERT INTO customer_payments (customer_id, amount, payment_time, payment_type, remark)
          VALUES ($1, $2, $3, $4, $5)
        `,
          [
            customer.id,
            Math.random() * 10000 + 100,
            new Date(
              Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
            ["现金", "承兑", "转账"][Math.floor(Math.random() * 3)],
            `客户付款 ${paymentCount + 1}`
          ]
        );

        paymentCount++;
      }
    }

    log(`成功生成 ${paymentCount} 条客户付款记录`, "success");
  } catch (error) {
    log(`生成客户付款记录失败: ${error.message}`, "error");
    throw error;
  }
}

// 主迁移函数
async function migrate() {
  try {
    log("开始数据库迁移...");
    log(`连接数据库: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // 连接数据库
    await client.connect();
    log("数据库连接成功", "success");

    // 执行数据库架构
    log("创建数据库表结构...");
    await executeSqlFile(path.join(__dirname, "schema.sql"));

    // 迁移数据
    await migrateSuppliers();
    await migrateCustomers();
    await migrateProducts();
    await generateSupplierDebts();
    await generateCustomerPayments();

    // 更新供应商统计信息
    log("更新供应商统计信息...");
    await client.query(`
      UPDATE suppliers s
      SET total_payable = sub.current_balance
      FROM supplier_stats sub
      WHERE s.id = sub.id
    `);

    // 更新客户统计信息
    log("更新客户统计信息...");
    await client.query(`
      UPDATE customers c
      SET total_debt = sub.current_debt
      FROM customer_stats sub
      WHERE c.id = sub.id
    `);

    log("数据库迁移完成！", "success");

    // 显示统计信息
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM suppliers) as supplier_count,
        (SELECT COUNT(*) FROM customers) as customer_count,
        (SELECT COUNT(*) FROM products) as product_count,
        (SELECT COUNT(*) FROM supplier_debts) as debt_count,
        (SELECT COUNT(*) FROM customer_payments) as payment_count
    `);

    const {
      supplier_count,
      customer_count,
      product_count,
      debt_count,
      payment_count
    } = stats.rows[0];
    log("数据统计:", "info");
    log(`  供应商数量: ${supplier_count}`, "info");
    log(`  客户数量: ${customer_count}`, "info");
    log(`  产品数量: ${product_count}`, "info");
    log(`  欠款记录数: ${debt_count}`, "info");
    log(`  付款记录数: ${payment_count}`, "info");
  } catch (error) {
    log(`迁移失败: ${error.message}`, "error");
    process.exit(1);
  } finally {
    await client.end();
    log("数据库连接已关闭");
  }
}

// 处理命令行参数
const command = process.argv[2];

switch (command) {
  case "schema":
    log("仅创建数据库表结构...");
    await client.connect();
    await executeSqlFile(path.join(__dirname, "schema.sql"));
    await client.end();
    break;
  case "data":
    log("仅迁移数据...");
    await client.connect();
    await migrateSuppliers();
    await migrateCustomers();
    await migrateProducts();
    await generateSupplierDebts();
    await generateCustomerPayments();
    await client.end();
    break;
  default:
    await migrate();
}
