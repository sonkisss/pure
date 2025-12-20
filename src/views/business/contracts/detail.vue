<template>
  <div class="main">
    <!-- 页面标题区域 -->
    <div class="page-header mb-4">
      <div class="flex items-center gap-4">
        <el-button @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1 class="text-2xl font-bold">{{ contract.contract_name }}</h1>
      </div>
    </div>

    <!-- 利润统计区域 -->
    <el-card shadow="never" class="mb-4 card-compact">
      <template #header>
        <div class="card-header">
          <span class="card-header__title">利润统计</span>
        </div>
      </template>

      <div class="statistics-container">
        <div class="stat-item">
          <div class="stat-label">合同金额</div>
          <div class="stat-value">
            ¥{{ formatPrice(profit.contract_amount) }}
          </div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">进货金额</div>
          <div class="stat-value text-red-600">
            ¥{{ formatPrice(profit.total_purchase_amount) }}
          </div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">预估缴税</div>
          <div
            class="stat-value text-orange-500 cursor-pointer hover:text-orange-400 transition-colors"
          >
            <el-tooltip
              effect="light"
              placement="top"
              :show-after="200"
              popper-class="tax-tooltip"
            >
              <template #content>
                <div
                  class="tax-calculation"
                  v-html="formatTaxBreakdown(estimatedTax.breakdown)"
                />
              </template>
              <span>¥{{ formatPrice(estimatedTax.totalTax) }}</span>
            </el-tooltip>
          </div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">费用金额</div>
          <div class="stat-value text-red-600">
            ¥{{ formatPrice(profit.total_expense_amount) }}
          </div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">净利润</div>
          <div
            class="stat-value"
            :class="
              profit.total_profit >= 0
                ? 'text-green-600 font-bold'
                : 'text-red-600 font-bold'
            "
          >
            ¥{{ formatPrice(profit.total_profit) }}
          </div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">已挂账</div>
          <div class="stat-value text-green-600">
            ¥{{ formatPrice(creditStats.credited || 0) }}
          </div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">未挂账</div>
          <div class="stat-value text-red-500">
            ¥{{ formatPrice(creditStats.uncredited || 0) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 第一部分：合同明细 -->
    <el-card class="mb-4 card-compact">
      <template #header>
        <div class="card-header">
          <span class="card-header__title">合同明细</span>
          <div class="card-header__actions">
            <el-button
              v-if="selectedDetails.length > 0"
              type="danger"
              size="small"
              :loading="batchDeleteLoading"
              @click="handleBatchDelete"
            >
              <el-icon><Delete /></el-icon>
              批量删除 ({{ selectedDetails.length }})
            </el-button>
            <el-button
              v-if="selectedDetails.length > 0"
              type="warning"
              size="small"
              :loading="batchCreditLoading"
              @click="handleBatchCredit"
            >
              <el-icon><Select /></el-icon>
              批量挂账
            </el-button>
            <el-button type="primary" size="small" @click="handleAddDetail">
              <el-icon><Plus /></el-icon>
              添加明细
            </el-button>
            <el-button type="success" size="small" @click="handleExcelImport">
              <el-icon><Upload /></el-icon>
              Excel导入
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="displayedContractDetails"
        border
        stripe
        show-summary
        :summary-method="calcDetailsSummary"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ row, $index }">
            {{ row.__originalIndex ?? $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column
          prop="product_name"
          label="产品名称"
          min-width="150"
          show-overflow-tooltip
          align="left"
        />
        <el-table-column
          prop="spec_model"
          label="规格型号"
          min-width="120"
          show-overflow-tooltip
          align="left"
        />
        <el-table-column prop="unit" label="单位" width="60" align="center" />
        <el-table-column prop="quantity" label="数量" width="70" align="right">
          <template #default="{ row }">
            <span class="font-medium">{{ row.quantity }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="purchase_price"
          label="进价"
          width="80"
          align="right"
        >
          <template #default="{ row }">
            <span class="text-green-600 font-semibold">
              {{ formatPrice(row.purchase_price) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="purchase_amount"
          label="进货金额"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span class="text-red-500 font-semibold">
              {{ formatPrice(row.purchase_amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="sale_price"
          label="卖价"
          width="80"
          align="right"
        >
          <template #default="{ row }">
            <span class="text-blue-600 font-semibold">
              {{ formatPrice(row.sale_price) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="sale_amount"
          label="销售金额"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span class="text-green-600 font-semibold">
              {{ formatPrice(row.sale_amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="is_credited"
          label="挂账"
          width="70"
          align="center"
        >
          <template #default="{ row }">
            <span
              class="credit-dot"
              :class="row.is_credited ? 'credit-dot--yes' : 'credit-dot--no'"
              :title="row.is_credited ? '已挂账' : '未挂账'"
            />
          </template>
        </el-table-column>
        <el-table-column
          prop="supplier"
          label="供应商"
          min-width="100"
          show-overflow-tooltip
          align="left"
        />
        <el-table-column
          prop="includes_tax"
          label="含税"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="
                row.includes_tax === 1
                  ? 'success'
                  : row.includes_tax === 2
                    ? 'warning'
                    : 'info'
              "
              size="small"
            >
              {{
                row.includes_tax === 1
                  ? "含税"
                  : row.includes_tax === 2
                    ? "普票"
                    : "不含税"
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="remark"
          label="备注"
          min-width="100"
          show-overflow-tooltip
          align="left"
        />
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEditDetail(row)">
              修改
            </el-button>
            <el-button link type="danger" @click="handleDeleteDetail(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 第二部分：费用展示 -->
    <el-card class="mb-4 card-compact">
      <template #header>
        <div class="card-header">
          <span class="card-header__title">费用明细</span>
          <div class="card-header__actions">
            <el-button type="primary" size="small" @click="handleAddExpense">
              <el-icon><Plus /></el-icon>
              添加费用
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="expenses" border stripe>
        <el-table-column type="index" label="序号" width="80" align="center" />
        <el-table-column
          prop="title"
          label="费用名称"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="category"
          label="费用类别"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="primary" size="small" effect="light">
              {{ row.category || "未分类" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120" align="right">
          <template #default="{ row }">
            <span class="text-red-500 font-semibold">
              ¥{{ formatPrice(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="payer_name"
          label="支付人"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            {{ row.payer_name || "-" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="expense_date"
          label="支付日期"
          width="120"
          align="center"
        />
        <el-table-column
          prop="description"
          label="备注"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEditExpense(row)">
              修改
            </el-button>
            <el-button link type="danger" @click="handleDeleteExpense(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑合同明细弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="detailDialogTitle"
      width="600px"
      :close-on-click-modal="false"
      @close="handleDetailDialogClose"
    >
      <el-form
        ref="detailFormRef"
        :model="detailFormData"
        :rules="detailFormRules"
        label-width="100px"
      >
        <el-form-item label="产品名称" prop="product_name">
          <el-input
            v-model="detailFormData.product_name"
            placeholder="请输入产品名称"
            clearable
          />
        </el-form-item>

        <el-form-item label="规格型号" prop="spec_model">
          <el-input
            v-model="detailFormData.spec_model"
            placeholder="请输入规格型号"
            clearable
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-input
                v-model="detailFormData.unit"
                placeholder="如：个、箱、台、套等"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数量" prop="quantity">
              <el-input-number
                v-model="detailFormData.quantity"
                :min="0.001"
                :step="1"
                style="width: 100%"
                @change="calculateDetailAmount"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="进价" prop="purchase_price">
              <el-input-number
                v-model="detailFormData.purchase_price"
                :min="0"
                :step="1"
                style="width: 100%"
                @change="calculateDetailAmount"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="卖价" prop="sale_price">
              <el-input-number
                v-model="detailFormData.sale_price"
                :min="0"
                :step="1"
                style="width: 100%"
                @change="calculateDetailAmount"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="进货金额">
              <el-input
                v-model="detailPurchaseAmount"
                readonly
                placeholder="自动计算"
                style="background: #f5f7fa"
              >
                <template #prepend>¥</template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="销售金额">
              <el-input
                v-model="detailSaleAmount"
                readonly
                placeholder="自动计算"
                style="background: #f5f7fa"
              >
                <template #prepend>¥</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="挂账状态">
          <el-switch
            v-model="detailFormData.is_credited"
            active-text="已挂账"
            inactive-text="未挂账"
          />
        </el-form-item>

        <el-form-item label="供应商" prop="supplier">
          <el-input
            v-model="detailFormData.supplier"
            placeholder="请输入供应商名称"
            clearable
          />
        </el-form-item>

        <el-form-item label="含税类型" prop="includes_tax">
          <el-select
            v-model="detailFormData.includes_tax"
            placeholder="请选择含税类型"
            style="width: 100%"
          >
            <el-option label="含税" :value="1" />
            <el-option label="不含税" :value="0" />
            <el-option label="普票" :value="2" />
          </el-select>
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="detailFormData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="detailDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="handleDetailSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑费用弹窗 -->
    <el-dialog
      v-model="expenseDialogVisible"
      :title="expenseDialogTitle"
      width="600px"
      @close="handleExpenseDialogClose"
    >
      <el-form
        ref="expenseFormRef"
        :model="expenseFormData"
        :rules="expenseFormRules"
        label-width="100px"
      >
        <el-form-item label="费用名称" prop="title">
          <el-input
            v-model="expenseFormData.title"
            placeholder="请输入费用名称"
          />
        </el-form-item>

        <el-form-item label="费用金额" prop="amount">
          <el-input-number
            v-model="expenseFormData.amount"
            :min="0"
            placeholder="请输入费用金额"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="费用类别" prop="category">
          <el-tag
            v-for="category in categories"
            :key="category.id"
            :type="expenseFormData.category === category.name ? 'primary' : ''"
            :effect="
              expenseFormData.category === category.name ? 'dark' : 'plain'
            "
            size="small"
            style="
              margin-right: 8px;
              margin-bottom: 6px;
              vertical-align: middle;
              cursor: pointer;
            "
            @click="selectCategory(category.name)"
          >
            {{ category.name }}
          </el-tag>
          <el-tag
            type="success"
            effect="plain"
            size="small"
            style="
              margin-right: 8px;
              margin-bottom: 6px;
              vertical-align: middle;
              cursor: pointer;
            "
            @click="handleAddCategory"
          >
            + 新建类别
          </el-tag>
        </el-form-item>

        <el-form-item label="支付人" prop="payer_id">
          <el-select
            v-model="expenseFormData.payer_id"
            placeholder="请选择支付人"
            style="width: 100%"
            filterable
            @change="handlePayerChange"
          >
            <el-option
              v-for="payer in payers"
              :key="payer.id"
              :label="payer.nickname"
              :value="payer.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="支付日期" prop="expense_date">
          <el-date-picker
            v-model="expenseFormData.expense_date"
            type="date"
            placeholder="选择支付日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="备注" prop="description">
          <el-input
            v-model="expenseFormData.description"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="expenseDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="submitLoading"
            @click="handleExpenseSubmit"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Excel导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="Excel批量导入合同明细"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-alert
        title="导入说明"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      >
        <p>1. 请先下载 Excel 模板，严格按照模板格式填写数据</p>
        <p>2. 含税类型必须为"含税"、"普票"或"不含"</p>
        <p>3. 数量必须大于0，进价和卖价必须大于等于0</p>
        <p>4. 必填字段：产品名称、规格型号、单位、供应商、进价、卖价</p>
      </el-alert>

      <div class="mb-4">
        <el-button
          type="primary"
          :icon="Download"
          @click="handleDownloadTemplate"
        >
          下载Excel模板
        </el-button>
      </div>

      <el-upload
        :file-list="uploadFileList"
        :on-change="handleFileChange"
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        drag
        class="w-full"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">支持 .xlsx、.xls 格式文件</div>
        </template>
      </el-upload>

      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploadLoading"
          :disabled="uploadFileList.length === 0"
          @click="handleImport"
        >
          开始导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑费用类别弹窗 -->
    <el-dialog
      v-model="categoryDialogVisible"
      title="费用类别管理"
      width="500px"
      :close-on-click-modal="false"
      @close="handleCategoryDialogClose"
    >
      <el-form
        ref="categoryFormRef"
        :model="categoryFormData"
        :rules="categoryFormRules"
        label-width="80px"
      >
        <el-form-item label="类别名称" prop="name">
          <el-input
            v-model="categoryFormData.name"
            placeholder="请输入类别名称"
            clearable
          />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="categoryFormData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入类别描述（可选）"
          />
        </el-form-item>

        <el-form-item label="排序序号" prop="sort_order">
          <el-input-number
            v-model="categoryFormData.sort_order"
            :min="0"
            :step="1"
            placeholder="数字越小排序越靠前"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="categoryFormData.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="categoryDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="submitLoading"
            @click="handleCategorySubmit"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
  type SummaryMethodProps,
  type UploadFile
} from "element-plus";
import {
  ArrowLeft,
  Plus,
  Upload,
  Download,
  Delete,
  Select
} from "@element-plus/icons-vue";
import * as XLSX from "xlsx";
import {
  getContractDetail,
  addContractDetail,
  updateContractDetail,
  deleteContractDetail,
  addExpense,
  updateExpense,
  deleteExpense,
  updateContract,
  getExpenseCategories,
  addExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  type Contract,
  type ContractDetail,
  type Expense,
  type ExpenseCategory
} from "@/api/business";
import { getPayerList } from "@/api/expense";

type ContractDetailWithIndex = ContractDetail & { __originalIndex?: number };

const route = useRoute();
const router = useRouter();

// 响应式数据
const loading = ref(false);
const submitLoading = ref(false);
const batchDeleteLoading = ref(false);
const batchCreditLoading = ref(false);
const detailDialogVisible = ref(false);
const expenseDialogVisible = ref(false);
const categoryDialogVisible = ref(false);
const categoryFormRef = ref<FormInstance>();

// 批量选择相关
const selectedDetails = ref<ContractDetailWithIndex[]>([]);

const contract = ref<Contract>({} as Contract);
const contractDetails = ref<ContractDetailWithIndex[]>([]);
// 展示层：已挂账在前，未挂账在后，保持各自原有顺序
const displayedContractDetails = computed(() => {
  const credited: ContractDetailWithIndex[] = [];
  const uncredited: ContractDetailWithIndex[] = [];
  contractDetails.value.forEach(detail => {
    (detail.is_credited ? credited : uncredited).push(detail);
  });
  return [...credited, ...uncredited];
});
const expenses = ref<Expense[]>([]);
const categories = ref<ExpenseCategory[]>([]);
const payers = ref<any[]>([]);

// 🔧 缓存架构优化：移除组件层业务数据缓存，统一使用utils层缓存
// 组件层只负责UI状态管理，业务数据缓存由utils层统一处理

const profit = computed(() => {
  // 合同金额 = 所有明细的销售金额总和
  const contractAmount = contractDetails.value.reduce(
    (sum, item) => sum + (item.sale_amount || 0),
    0
  );
  const totalPurchaseAmount = contractDetails.value.reduce(
    (sum, item) => sum + (item.purchase_amount || 0),
    0
  );
  const totalExpenseAmount = expenses.value.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  // 计算预估缴税总额
  const estimatedTaxAmount = estimatedTax.value.totalTax || 0;

  // 净利润 = 合同金额 - 进货金额 - 费用金额 - 预估缴税
  const totalProfit =
    contractAmount -
    totalPurchaseAmount -
    totalExpenseAmount -
    estimatedTaxAmount;

  return {
    contract_amount: contractAmount,
    total_purchase_amount: totalPurchaseAmount,
    total_expense_amount: totalExpenseAmount,
    total_profit: totalProfit
  };
});

// 挂账统计：区分已挂账与未挂账的销售金额
const creditStats = computed(() => {
  let credited = 0;
  let uncredited = 0;
  contractDetails.value.forEach(item => {
    const amount = item.sale_amount || 0;
    if (item.is_credited) {
      credited += amount;
    } else {
      uncredited += amount;
    }
  });
  return { credited, uncredited };
});

// 计算预估缴税
const estimatedTax = computed(() => {
  if (!contract.value || !contractDetails.value) {
    return {
      vat: 0,
      urbanConstructionTax: 0,
      educationFee: 0,
      localEducationFee: 0,
      stampTax: 0,
      waterConstructionFund: 0,
      totalTax: 0,
      breakdown: ""
    };
  }

  // 1. 计算销售额
  // 注意：这里不能直接用 profit.value.contract_amount，因为 profit 计算依赖 estimatedTax，会导致循环引用
  // 所以需要重新计算合同金额
  const salesAmount = contractDetails.value.reduce(
    (sum, item) => sum + (item.sale_amount || 0),
    0
  );

  // 2. 计算含税进货总额（只统计 includes_tax === 1 的明细）
  const taxablePurchaseAmount = contractDetails.value
    .filter(item => item.includes_tax === 1)
    .reduce((sum, item) => sum + (item.purchase_amount || 0), 0);

  // 3. 计算应纳税额（销项 - 进项）
  // 注意：这里简化处理，假设所有进货都是含税的，实际应根据票据类型判断
  // 按照需求：先将合同的销售额减去含税类型为含税的进货总额后计算出增值税
  const taxableAmount = Math.max(0, salesAmount - taxablePurchaseAmount);

  // 4. 增值税（13%）
  // 公式调整：÷ (1 + 13%) × 13%
  const vat = (taxableAmount / 1.13) * 0.13;

  // 5. 附加税费
  const urbanConstructionTax = (vat * 0.07) / 2; // 城建税 7%减半征收
  const educationFee = (vat * 0.03) / 2; // 教育费附加 3%减半征收
  const localEducationFee = (vat * 0.02) / 2; // 地方教育附加 2%减半征收

  // 6. 印花税（按销售收入的万分之三计算，减半征收）
  const stampTax = (salesAmount * 0.0003) / 2;

  // 7. 水利建设基金（按增值税的1%计算，减半征收）
  const waterConstructionFund = (vat * 0.01) / 2;

  // 8. 总税额
  const totalTax =
    vat +
    urbanConstructionTax +
    educationFee +
    localEducationFee +
    stampTax +
    waterConstructionFund;

  return {
    vat: Math.round(vat * 100) / 100,
    urbanConstructionTax: Math.round(urbanConstructionTax * 100) / 100,
    educationFee: Math.round(educationFee * 100) / 100,
    localEducationFee: Math.round(localEducationFee * 100) / 100,
    stampTax: Math.round(stampTax * 100) / 100,
    waterConstructionFund: Math.round(waterConstructionFund * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    breakdown: `增值税: ${taxableAmount.toFixed(2)} ÷ 1.13 × 13% = ${vat.toFixed(2)}
城建税: ${vat.toFixed(2)} × 7% ÷ 2 = ${urbanConstructionTax.toFixed(2)}
教育费: ${vat.toFixed(2)} × 3% ÷ 2 = ${educationFee.toFixed(2)}
地方教育: ${vat.toFixed(2)} × 2% ÷ 2 = ${localEducationFee.toFixed(2)}
印花税: ${salesAmount.toFixed(2)} × 0.3‰ ÷ 2 = ${stampTax.toFixed(2)}
水利基金: ${vat.toFixed(2)} × 1% ÷ 2 = ${waterConstructionFund.toFixed(2)}
合计税额: ${totalTax.toFixed(2)}`
  };
});

// 格式化税额计算明细，将合计税额标红
const formatTaxBreakdown = (breakdown: string) => {
  if (!breakdown) return "";

  // 将换行符转换为<br>标签
  const lines = breakdown.split("\n");
  const lastLineIndex = lines.findIndex(line => line.includes("合计税额:"));

  if (lastLineIndex !== -1) {
    const lastLine = lines[lastLineIndex];
    const redLastLine = `<span style="color: #ff4757; font-weight: bold;">${lastLine}</span>`;
    lines[lastLineIndex] = redLastLine;
  }

  return lines.join("<br>");
};

const detailDialogTitle = computed(() =>
  isEditDetail.value ? "编辑合同明细" : "添加合同明细"
);
const expenseDialogTitle = computed(() =>
  isEditExpense.value ? "编辑费用" : "添加费用"
);
const isEditDetail = ref(false);
const isEditExpense = ref(false);

// Excel导入相关
const importDialogVisible = ref(false);
const uploadFileList = ref<UploadFile[]>([]);
const uploadLoading = ref(false);

const detailFormData = reactive({
  id: 0,
  contract_id: 0,
  product_name: "",
  spec_model: "",
  unit: "",
  quantity: 1,
  purchase_price: 0,
  sale_price: 0,
  is_credited: false,
  supplier: "",
  includes_tax: 1 as 0 | 1 | 2,
  remark: ""
});

// 获取当前日期函数
const getCurrentDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const expenseFormData = reactive({
  id: 0,
  contract_id: 0,
  title: "", // 匹配数据库字段 title
  amount: 0,
  expense_date: getCurrentDate(), // 匹配数据库字段 expense_date
  year: new Date().getFullYear(), // 添加年份字段
  category: "",
  payer_id: undefined as number | undefined,
  payer_name: "",
  company_id: 0, // 添加公司ID字段
  company_name: "", // 添加公司名称字段
  description: "" // 匹配数据库字段 description
});

const categoryFormData = reactive({
  id: 0,
  name: "",
  description: "",
  sort_order: 0,
  status: 1 as 1 | 0
});

const detailFormRules: FormRules = {
  product_name: [
    { required: true, message: "请输入产品名称", trigger: "blur" }
  ],
  spec_model: [{ required: true, message: "请输入规格型号", trigger: "blur" }],
  unit: [{ required: true, message: "请输入单位", trigger: "blur" }],
  quantity: [
    { required: true, message: "请输入数量", trigger: "blur" },
    { type: "number", min: 0.001, message: "数量必须大于0", trigger: "blur" }
  ],
  purchase_price: [
    { required: true, message: "请输入进价", trigger: "blur" },
    { type: "number", min: 0, message: "进价必须大于等于0", trigger: "blur" }
  ],
  sale_price: [
    { required: true, message: "请输入卖价", trigger: "blur" },
    { type: "number", min: 0, message: "卖价必须大于等于0", trigger: "blur" }
  ],
  supplier: [{ required: true, message: "请输入供应商", trigger: "blur" }],
  includes_tax: [
    { required: true, message: "请选择含税类型", trigger: "change" }
  ]
};

const expenseFormRules: FormRules = {
  title: [{ required: true, message: "请输入费用名称", trigger: "blur" }],
  amount: [
    { required: true, message: "请输入费用金额", trigger: "blur" },
    {
      type: "number",
      min: 0,
      message: "费用金额必须大于等于0",
      trigger: "blur"
    }
  ],
  category: [{ required: true, message: "请选择费用类别", trigger: "change" }],
  payer_id: [{ required: true, message: "请选择支付人", trigger: "change" }],
  expense_date: [
    { required: true, message: "请选择支付日期", trigger: "change" }
  ]
};

const categoryFormRules: FormRules = {
  name: [
    { required: true, message: "请输入类别名称", trigger: "blur" },
    { min: 1, max: 50, message: "类别名称长度为1-50个字符", trigger: "blur" }
  ],
  sort_order: [
    { required: true, message: "请输入排序序号", trigger: "blur" },
    {
      type: "number",
      min: 0,
      message: "排序序号必须大于等于0",
      trigger: "blur"
    }
  ]
};

const detailFormRef = ref<FormInstance>();
const expenseFormRef = ref<FormInstance>();

const detailPurchaseAmount = computed(() => {
  return (detailFormData.quantity * detailFormData.purchase_price).toFixed(2);
});

const detailSaleAmount = computed(() => {
  return (detailFormData.quantity * detailFormData.sale_price).toFixed(2);
});

// 🔧 缓存架构优化：移除组件层缓存清理逻辑
// utils层的contractDetailsCache已包含自动过期清理机制

// 方法
const loadContractDetail = async () => {
  try {
    loading.value = true;
    const contractId = Number(route.params.id);

    // 🔧 缓存架构优化：移除组件层缓存检查
    // 合同数据缓存统一由utils层contractDetailsCache管理
    // 性能监控保留
    const startTime = performance.now();

    const response = await getContractDetail(contractId);

    const endTime = performance.now();
    const loadTime = Math.round((endTime - startTime) * 100) / 100;
    console.log(`合同详情加载完成，耗时: ${loadTime}ms`);

    // 🚀 性能优化5: 使用 Object.assign 避免响应式性能损耗
    const responseData = (response as any).data || response;
    Object.assign(contract.value, responseData.contract);
    contractDetails.value = (responseData.details || []).map(
      (item: any, index: number) => ({
        ...item,
        is_credited: Boolean(item.is_credited),
        __originalIndex: index + 1
      })
    );
    expenses.value = responseData.expenses;

    // 设置费用表单的默认公司信息
    if (responseData.contract?.company_id) {
      expenseFormData.company_id = responseData.contract.company_id;
      expenseFormData.company_name = responseData.contract.company_name || "";
    }

    // 🔧 缓存架构优化：移除组件层缓存设置
    // 合同数据缓存统一由API层的getContractDetail处理

    // 设置表单的合同ID
    detailFormData.contract_id = contractId;
    expenseFormData.contract_id = contractId;
  } catch (error) {
    console.error("加载合同详情失败:", error);
    ElMessage.error("加载合同详情失败");
    router.back();
  } finally {
    loading.value = false;
  }
};

// 加载费用类别数据
const loadCategories = async () => {
  try {
    console.log("📞 调用 getExpenseCategories API...");
    const res = await getExpenseCategories();
    console.log("📤 getExpenseCategories 响应:", JSON.stringify(res, null, 2));
    if (res.success) {
      categories.value = res.data || [];
    } else {
      console.error("获取费用类别失败:", res.message);
    }
  } catch (error) {
    console.error("获取费用类别异常:", error);
    categories.value = [];
  }
};

// 加载支付人列表数据
const loadPayers = async () => {
  try {
    console.log("📞 调用 getPayerList API...");
    const res = await getPayerList();
    console.log("📤 getPayerList 响应:", JSON.stringify(res, null, 2));
    if (res.success) {
      payers.value = res.data || [];
    } else {
      console.error("获取支付人列表失败:", res.message);
    }
  } catch (error) {
    console.error("获取支付人列表异常:", error);
    payers.value = [];
  }
};

// 选择费用类别
const selectCategory = (categoryName: string) => {
  expenseFormData.category = categoryName;
};

// 处理支付人选择变化
const handlePayerChange = (payer_id: number) => {
  const selectedPayer = payers.value.find(payer => payer.id === payer_id);
  if (selectedPayer) {
    expenseFormData.payer_name = selectedPayer.nickname;
  } else {
    expenseFormData.payer_name = "";
  }
};

// 更新合同金额（根据明细的销售金额总和）
const updateContractAmount = async () => {
  try {
    const contractId = Number(route.params.id);
    // 计算所有明细的销售金额总和
    const totalSaleAmount = contractDetails.value.reduce(
      (sum, item) => sum + (item.sale_amount || 0),
      0
    );

    // 更新合同金额
    const updateData: Contract = {
      ...contract.value,
      contract_amount: totalSaleAmount,
      updated_at: new Date().toISOString()
    };

    const result = await updateContract(updateData);
    if (result.success) {
      // 更新本地合同数据
      contract.value.contract_amount = totalSaleAmount;
      console.log("合同金额已更新为:", totalSaleAmount);
    } else {
      console.warn("更新合同金额失败:", result.message);
    }
  } catch (error) {
    console.error("更新合同金额失败:", error);
  }
};

// 返回合同列表
const handleBack = () => {
  // 返回时传递合同的年度信息，以便列表页的年度选择器跟随
  router.push({
    name: "ContractList",
    query: {
      company_id: contract.value.company_id,
      company_name: contract.value.company_name,
      contract_year: contract.value.contract_year
    }
  });
};

const calculateDetailAmount = () => {
  // 金额会自动通过计算属性计算
};

const handleExcelImport = () => {
  uploadFileList.value = [];
  importDialogVisible.value = true;
};

// Excel导入相关函数
const handleFileChange = (file: UploadFile) => {
  uploadFileList.value = [file];
};

const handleDownloadTemplate = () => {
  try {
    const headers = [
      "产品名称",
      "规格型号",
      "单位",
      "数量",
      "进价",
      "卖价",
      "供应商",
      "含税类型",
      "备注"
    ];
    const rows = [
      [
        "示例产品",
        "ABC-001",
        "个",
        1,
        100,
        150,
        "示例供应商",
        "含税",
        "这是一个示例"
      ]
    ];
    const sheet = [headers, ...rows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, "模板");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "合同明细导入模板.xlsx";
    link.click();
    URL.revokeObjectURL(url);

    ElMessage.success("模板下载成功");
  } catch (error) {
    ElMessage.error("模板下载失败");
  }
};

const handleImport = async () => {
  if (uploadFileList.value.length === 0) {
    ElMessage.warning("请选择要上传的文件");
    return;
  }

  uploadLoading.value = true;
  try {
    // 获取文件对象，支持不同的文件结构
    const uploadFile = uploadFileList.value[0];
    const file = uploadFile.raw || uploadFile;
    if (!file) {
      ElMessage.error("文件获取失败，请重新选择文件");
      return;
    }

    const data = await (file as any).arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1
    }) as any[][];

    if (jsonData.length < 2) {
      ElMessage.error("文件内容为空或格式不正确");
      return;
    }

    // 解析数据并验证
    const headers = jsonData[0];
    const rows = jsonData.slice(1);
    const details: any[] = [];
    const errors: any[] = [];

    // 验证表头
    const requiredHeaders = [
      "产品名称",
      "规格型号",
      "单位",
      "数量",
      "进价",
      "卖价",
      "供应商",
      "含税类型"
    ];

    const headerValid = requiredHeaders.every(header =>
      headers.some((h: any) => String(h).includes(header))
    );

    if (!headerValid) {
      ElMessage.error("表头格式不正确，请下载模板文件");
      return;
    }

    // 处理每一行数据
    rows.forEach((row: any[], index: number) => {
      const rowNum = index + 2; // Excel行号从2开始
      const detail: any = {
        rowNum: rowNum, // 添加行号用于错误追踪
        contract_id: Number(route.params.id),
        product_name: row[0],
        spec_model: row[1],
        unit: row[2],
        quantity: Number(row[3]) || 1,
        purchase_price: Number(row[4]),
        sale_price: Number(row[5]),
        supplier: row[6],
        includes_tax:
          row[7] === "含税"
            ? 1
            : row[7] === "普票"
              ? 2
              : row[7] === "不含"
                ? 0
                : 1,
        remark: row[8] || "",
        status: 1,
        created_by: 1
      };

      // 计算金额
      detail.purchase_amount = detail.quantity * detail.purchase_price;
      detail.sale_amount = detail.quantity * detail.sale_price;

      // 验证必填字段
      const errorsList: string[] = [];
      if (!detail.product_name) errorsList.push("产品名称不能为空");
      if (!detail.spec_model) errorsList.push("规格型号不能为空");
      if (!detail.unit) errorsList.push("单位不能为空");
      if (!detail.supplier) errorsList.push("供应商不能为空");
      if (isNaN(detail.quantity) || detail.quantity <= 0)
        errorsList.push("数量必须大于0");
      if (
        isNaN(detail.purchase_price) ||
        detail.purchase_price === undefined ||
        detail.purchase_price === null
      )
        errorsList.push("进价不能为空");
      if (isNaN(detail.purchase_price) || detail.purchase_price < 0)
        errorsList.push("进价不能小于0");
      if (
        isNaN(detail.sale_price) ||
        detail.sale_price === undefined ||
        detail.sale_price === null
      )
        errorsList.push("卖价不能为空");
      if (isNaN(detail.sale_price) || detail.sale_price < 0)
        errorsList.push("卖价不能小于0");

      if (errorsList.length > 0) {
        errors.push({
          行号: rowNum,
          产品名称: detail.product_name || "未填写",
          失败原因: errorsList.join("；")
        });
      } else {
        details.push(detail);
      }
    });

    // 批量添加明细
    let successCount = 0;
    if (details.length > 0) {
      for (const detail of details) {
        try {
          await addContractDetail(detail);
          successCount++;
        } catch (error) {
          console.error("添加明细失败:", error);
          errors.push({
            行号: detail.rowNum || "未知",
            产品名称: detail.product_name || "未填写",
            失败原因: "保存到数据库失败"
          });
        }
      }
    }

    // 显示导入结果
    if (successCount > 0) {
      if (errors.length > 0) {
        ElMessageBox.confirm(
          `成功导入 ${successCount} 条，${errors.length} 条失败。是否下载失败明细？`,
          "导入完成",
          {
            confirmButtonText: "下载失败明细",
            cancelButtonText: "关闭",
            type: "warning"
          }
        )
          .then(() => {
            downloadFailedRecords(errors);
          })
          .catch(() => {
            // 用户点击关闭
          });
      } else {
        ElMessage.success(`成功导入 ${successCount} 条合同明细`);
      }
    } else {
      ElMessage.error("导入失败，没有数据被成功导入");
    }

    // 如果有成功的导入，关闭对话框并刷新数据
    if (successCount > 0) {
      importDialogVisible.value = false;
      uploadFileList.value = [];

      // 清除缓存确保数据一致性
      const contractId = Number(route.params.id);
      // 🔧 缓存架构优化：移除组件层缓存清理

      await loadContractDetail();
      // 更新合同金额
      await updateContractAmount();
    }
  } catch (error) {
    console.error("导入失败:", error);
    ElMessage.error("导入失败，请检查文件格式");
  } finally {
    uploadLoading.value = false;
  }
};

const downloadFailedRecords = (failedRecords: any[]) => {
  try {
    // 创建Excel内容
    const headers = [
      "行号",
      "产品名称",
      "规格型号",
      "单位",
      "数量",
      "进价",
      "卖价",
      "供应商",
      "含税类型",
      "备注",
      "失败原因"
    ];

    // 准备数据行
    const rows = failedRecords.map(row => [
      row.行号 || "",
      row.产品名称 || "",
      row.规格型号 || "",
      row.单位 || "",
      row.数量 !== undefined ? row.数量 : "",
      row.进价 !== undefined ? row.进价 : "",
      row.卖价 !== undefined ? row.卖价 : "",
      row.供应商 || "",
      row.含税类型 || "",
      row.备注 || "",
      row.失败原因 || ""
    ]);

    // 创建工作表
    const sheet = [headers, ...rows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheet);

    // 设置列宽
    const colWidths = [
      { wch: 8 }, // 行号
      { wch: 20 }, // 产品名称
      { wch: 15 }, // 规格型号
      { wch: 10 }, // 单位
      { wch: 10 }, // 数量
      { wch: 12 }, // 进价
      { wch: 12 }, // 卖价
      { wch: 15 }, // 供应商
      { wch: 10 }, // 含税类型
      { wch: 20 }, // 备注
      { wch: 30 } // 失败原因
    ];
    ws["!cols"] = colWidths;

    // 设置表头样式（加粗）
    const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "失败明细");

    // 生成Excel文件
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `合同明细导入失败明细_${timestamp}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    ElMessage.success("失败明细已下载");
  } catch (error) {
    console.error("下载失败明细出错:", error);
    ElMessage.error("下载失败明细失败");
  }
};

const handleAddDetail = () => {
  isEditDetail.value = false;
  detailDialogVisible.value = true;
  resetDetailForm();
};

const handleEditDetail = (detail: ContractDetail) => {
  isEditDetail.value = true;
  detailDialogVisible.value = true;

  Object.assign(detailFormData, {
    ...detail
  });
};

const handleDeleteDetail = async (detail: ContractDetail) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除产品"${detail.product_name}"的明细吗？`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    const result = await deleteContractDetail(detail.id);
    if (result.success) {
      ElMessage.success(result.message || "删除成功");

      // 🚀 性能优化11: 清除缓存确保数据一致性
      const contractId = Number(route.params.id);
      // 🔧 缓存架构优化：移除组件层缓存清理

      // 同时清除产品模块的合同明细缓存
      import("@/utils/contractDetailsCache").then(
        ({ clearContractDetailsCache }) => {
          clearContractDetailsCache();
          console.log("[业务管理] 合同明细删除，已清除产品模块缓存");
        }
      );

      await loadContractDetail();
      // 更新合同金额
      await updateContractAmount();
    } else {
      throw new Error(result.message || "删除失败");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除合同明细失败:", error);
      ElMessage.error("删除合同明细失败");
    }
  }
};

// 批量选择变化处理
const handleSelectionChange = (selection: ContractDetailWithIndex[]) => {
  selectedDetails.value = selection;
};

// 合同明细表格合计（进货金额/销售金额）
const calcDetailsSummary = ({ columns, data }: SummaryMethodProps) => {
  const totalPurchaseAmount = data.reduce(
    (sum, item) => sum + (item.purchase_amount || 0),
    0
  );
  const totalSaleAmount = data.reduce(
    (sum, item) => sum + (item.sale_amount || 0),
    0
  );

  return columns.map((column, index) => {
    if (index === 0) return "合计";
    if (column.property === "purchase_amount") {
      return formatPrice(totalPurchaseAmount);
    }
    if (column.property === "sale_amount") {
      return formatPrice(totalSaleAmount);
    }
    return "";
  });
};

// 批量删除处理
const handleBatchDelete = async () => {
  if (selectedDetails.value.length === 0) {
    ElMessage.warning("请选择要删除的明细");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedDetails.value.length} 条明细吗？此操作不可恢复！`,
      "批量删除确认",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning",
        draggable: true
      }
    );

    batchDeleteLoading.value = true;
    const deletePromises = selectedDetails.value.map(detail =>
      deleteContractDetail(detail.id)
    );

    const results = await Promise.allSettled(deletePromises);

    // 统计成功和失败的数量
    const successCount = results.filter(
      result => result.status === "fulfilled"
    ).length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      // 从本地数据中移除成功删除的项
      const successIds = results
        .filter(
          (result, index) =>
            result.status === "fulfilled" && selectedDetails.value[index]
        )
        .map((_, index) => selectedDetails.value[index].id);

      contractDetails.value = contractDetails.value.filter(
        detail => !successIds.includes(detail.id)
      );

      // 清空选择
      selectedDetails.value = [];

      // 同时清除产品模块的合同明细缓存
      import("@/utils/contractDetailsCache").then(
        ({ clearContractDetailsCache }) => {
          clearContractDetailsCache();
          console.log("[业务管理] 合同明细批量删除，已清除产品模块缓存");
        }
      );

      // 更新合同金额
      await updateContractAmount();

      ElMessage.success(
        `批量删除完成：成功 ${successCount} 条${failCount > 0 ? `，失败 ${failCount} 条` : ""}`
      );
    } else {
      ElMessage.error("批量删除失败，请稍后重试");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("批量删除合同明细失败:", error);
      ElMessage.error("批量删除失败");
    }
  } finally {
    batchDeleteLoading.value = false;
  }
};

// 批量挂账
const handleBatchCredit = async () => {
  if (selectedDetails.value.length === 0) {
    ElMessage.warning("请选择要挂账的明细");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认将选中的 ${selectedDetails.value.length} 条明细标记为已挂账？`,
      "批量挂账确认",
      {
        confirmButtonText: "确认挂账",
        cancelButtonText: "取消",
        type: "warning",
        draggable: true
      }
    );

    batchCreditLoading.value = true;

    const updatePromises = selectedDetails.value.map(detail =>
      updateContractDetail({
        ...detail,
        is_credited: true
      } as any)
    );

    const results = await Promise.allSettled(updatePromises);
    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      await loadContractDetail();
      ElMessage.success(
        `批量挂账完成：成功 ${successCount} 条${
          failCount > 0 ? `，失败 ${failCount} 条` : ""
        }`
      );
    } else {
      ElMessage.error("批量挂账失败，请稍后重试");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("批量挂账失败:", error);
      ElMessage.error("批量挂账失败");
    }
  } finally {
    batchCreditLoading.value = false;
  }
};

const handleDetailSubmit = async () => {
  if (!detailFormRef.value) return;

  try {
    await detailFormRef.value.validate();
    submitLoading.value = true;

    const submitData = {
      ...detailFormData,
      purchase_amount: detailFormData.quantity * detailFormData.purchase_price,
      sale_amount: detailFormData.quantity * detailFormData.sale_price,
      is_credited: detailFormData.is_credited,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let savedDetail = null;
    if (isEditDetail.value) {
      const result = await updateContractDetail(submitData as any);
      if (result.success) {
        ElMessage.success(result.message || "更新成功");
        savedDetail = submitData;
      } else {
        throw new Error(result.message || "更新失败");
      }
    } else {
      const result = await addContractDetail(submitData as any);
      if ((result as any).data?.success || (result as any).success) {
        ElMessage.success(
          (result as any).data?.message || (result as any).message || "添加成功"
        );
        savedDetail =
          (result as any).data?.data || (result as any).data || submitData;
      } else {
        throw new Error(
          (result as any).data?.message || (result as any).message || "添加失败"
        );
      }
    }

    detailDialogVisible.value = false;

    // 🚀 性能优化10: 清除缓存确保数据一致性
    const contractId = Number(route.params.id);
    // 🔧 缓存架构优化：移除组件层缓存清理

    // 同时清除产品模块的合同明细缓存
    import("@/utils/contractDetailsCache").then(
      ({ clearContractDetailsCache }) => {
        clearContractDetailsCache();
        console.log("[业务管理] 合同明细变更，已清除产品模块缓存");
      }
    );

    await loadContractDetail();
    // 更新合同金额
    await updateContractAmount();
  } catch (error: any) {
    console.error("提交失败:", error);
    if (error.message) {
      ElMessage.error(error.message);
    }
  } finally {
    submitLoading.value = false;
  }
};

const handleAddExpense = () => {
  isEditExpense.value = false;
  expenseDialogVisible.value = true;
  resetExpenseForm();
};

const handleEditExpense = (expense: Expense) => {
  isEditExpense.value = true;
  expenseDialogVisible.value = true;

  console.log("编辑费用数据:", expense);

  Object.assign(expenseFormData, {
    ...expense,
    // 确保支付人字段正确映射
    payer_id: expense.payer_id,
    payer_name: expense.payer_name || ""
  });

  console.log("表单数据更新后:", expenseFormData);
};

const handleDeleteExpense = async (expense: Expense) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除费用"${expense.expense_name}"吗？`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );

    const result = await deleteExpense(expense.id);
    if (result.success) {
      ElMessage.success(result.message || "删除成功");

      // 清除缓存确保数据一致性
      const contractId = Number(route.params.id);
      // 🔧 缓存架构优化：移除组件层缓存清理

      loadContractDetail();
    } else {
      throw new Error(result.message || "删除失败");
    }
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("删除费用失败:", error);
      ElMessage.error("删除费用失败");
    }
  }
};

const handleExpenseSubmit = async () => {
  if (!expenseFormRef.value) return;

  try {
    await expenseFormRef.value.validate();
    submitLoading.value = true;

    // 准备提交数据，添加缺失的字段
    const submitData = {
      ...expenseFormData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("提交费用数据:", submitData);

    if (isEditExpense.value) {
      const result = await updateExpense(submitData as any);
      if ((result as any).success) {
        ElMessage.success((result as any).message || "更新成功");
      } else {
        throw new Error((result as any).message || "更新失败");
      }
    } else {
      const result = await addExpense(submitData as any);
      if ((result as any).success) {
        ElMessage.success((result as any).message || "添加成功");
      } else {
        throw new Error((result as any).message || "添加失败");
      }
    }

    expenseDialogVisible.value = false;

    // 清除缓存确保数据一致性
    const contractId = Number(route.params.id);
    // 🔧 缓存架构优化：移除组件层缓存清理

    loadContractDetail();
  } catch (error: any) {
    console.error("提交失败:", error);
    if (error.message) {
      ElMessage.error(error.message);
    }
  } finally {
    submitLoading.value = false;
  }
};

const handleDetailDialogClose = () => {
  resetDetailForm();
};

const handleExpenseDialogClose = () => {
  resetExpenseForm();
};

const resetDetailForm = () => {
  Object.assign(detailFormData, {
    id: 0,
    contract_id: Number(route.params.id),
    product_name: "",
    spec_model: "",
    unit: "",
    quantity: 1,
    purchase_price: 0,
    sale_price: 0,
    is_credited: false,
    supplier: "",
    includes_tax: 1,
    remark: ""
  });

  detailFormRef.value?.clearValidate();
};

const resetExpenseForm = () => {
  Object.assign(expenseFormData, {
    id: 0,
    contract_id: Number(route.params.id),
    title: "",
    amount: 0,
    expense_date: getCurrentDate(),
    year: new Date().getFullYear(), // 添加年份字段
    category: "",
    payer_id: undefined,
    payer_name: "",
    company_id: contract.value.company_id || 0, // 使用当前合同的公司ID
    company_name: contract.value.company_name || "", // 使用当前合同的公司名称
    description: ""
  });

  expenseFormRef.value?.clearValidate();
};

const formatMoney = (value: number) => {
  if (!value) return "0.00";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatPrice = (value: number) => {
  if (!value && value !== 0) return "0";

  // 检查是否为整数
  if (Number.isInteger(value)) {
    // 整数时不显示小数位
    return value.toLocaleString("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  } else {
    // 小数，显示实际的小数位数，最多6位
    const decimalStr = value.toFixed(6); // 先转成6位小数格式
    const trimmed = decimalStr.replace(/\.?0+$/, ""); // 移除尾随的0和小数点

    if (trimmed.includes(".")) {
      const parts = trimmed.split(".");
      const decimalPart = parts[1];
      // 如果小数位数超过6位，只显示6位
      const finalDecimal =
        decimalPart.length > 6 ? decimalPart.substring(0, 6) : decimalPart;
      const finalValue = parseFloat(trimmed).toFixed(finalDecimal.length);
      return parseFloat(finalValue).toLocaleString("zh-CN", {
        minimumFractionDigits: finalDecimal.length,
        maximumFractionDigits: finalDecimal.length
      });
    } else {
      return parseFloat(trimmed).toLocaleString("zh-CN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
  }
};

// 文件大小格式化函数
const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 费用类别管理相关函数
const handleAddCategory = () => {
  categoryFormMode.value = "add";
  resetCategoryForm();
  categoryDialogVisible.value = true;
};

const handleCategorySubmit = async () => {
  if (!categoryFormRef.value) return;

  await categoryFormRef.value.validate(async valid => {
    if (valid) {
      const submitData = {
        name: categoryFormData.name,
        description: categoryFormData.description || "",
        sort_order: categoryFormData.sort_order || 0,
        status: categoryFormData.status
      };

      const result = await addExpenseCategory(submitData);
      if (result.success) {
        ElMessage.success("费用类别添加成功");
        categoryDialogVisible.value = false;
        // 重新加载类别列表
        await loadCategories();
      } else {
        ElMessage.error(result.message || "费用类别添加失败");
      }
    }
  });
};

const handleCategoryDialogClose = () => {
  categoryDialogVisible.value = false;
  resetCategoryForm();
};

const resetCategoryForm = () => {
  if (categoryFormRef.value) {
    categoryFormRef.value.clearValidate();
  }
  categoryFormData.name = "";
  categoryFormData.description = "";
  categoryFormData.sort_order = 0;
  categoryFormData.status = 1;
};

// 生命周期
onMounted(async () => {
  await Promise.all([loadContractDetail(), loadCategories(), loadPayers()]);
});
</script>

<style scoped>
/* 主内容区域样式 */
.main {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.card-compact :deep(.el-card__header) {
  min-height: 36px;
  padding: 8px 16px;
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.card-header__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}

.card-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: 12px;
}

/* 统计卡片样式 */
.statistics-container {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 0;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #909399;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background-color: #dcdfe6;
}

.credit-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.credit-dot--yes {
  background-color: #22c55e;
}

.credit-dot--no {
  background-color: #ef4444;
}
</style>
