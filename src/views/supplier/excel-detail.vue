<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { getDebtExcelItems, type ExcelProductItem } from "@/api/supplier";
import { ArrowLeft, Refresh } from "@element-plus/icons-vue";
import { formatMoney } from "@/utils/format";

defineOptions({
  name: "SupplierDebtExcel"
});

const route = useRoute();
const router = useRouter();
const debtId = Number(route.params.debtId);

const loading = ref(false);
const excelItems = ref<ExcelProductItem[]>([]);

const loadExcelItems = async () => {
  loading.value = true;
  try {
    const res = await getDebtExcelItems(debtId);
    if (res.success) {
      excelItems.value = res.data;
    }
  } catch (error) {
    ElMessage.error("加载失败");
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.back();
};

// 计算总金额
const totalAmount = computed(() => {
  return excelItems.value.reduce((sum, item) => sum + item.amount, 0);
});

onMounted(() => {
  loadExcelItems();
});
</script>

<template>
  <div class="excel-detail-container">
    <div class="top-header mb-4">
      <el-button link :icon="ArrowLeft" @click="goBack">返回</el-button>
      <h2 class="page-title">欠款单明细</h2>
      <el-button :icon="Refresh" @click="loadExcelItems">刷新</el-button>
    </div>

    <!-- 统计卡片 -->
    <el-card shadow="never" class="mb-4">
      <div class="statistics-container">
        <div class="stat-item">
          <div class="stat-label">产品种类</div>
          <div class="stat-value">{{ excelItems.length }}</div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">合计金额</div>
          <div class="stat-value text-red-500">
            ¥{{ formatMoney(totalAmount) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 欠款单明细列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">欠款单明细列表</span>
        </div>
      </template>

      <el-table v-loading="loading" :data="excelItems" border stripe>
        <el-table-column prop="id" label="序号" width="80" align="center" />
        <el-table-column
          prop="productName"
          label="产品名称"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="productModel"
          label="产品型号"
          width="120"
          align="center"
        />
        <el-table-column prop="quantity" label="数量" width="100" align="right">
          <template #default="{ row }">
            <span class="font-bold">{{ row.quantity }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" align="center" />
        <el-table-column label="单价" width="120" align="right">
          <template #default="{ row }">
            ¥{{ formatMoney(row.unitPrice) }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="130" align="right">
          <template #default="{ row }">
            <span class="font-bold text-red-500">
              ¥{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="是否含税" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.hasTax ? 'success' : 'info'">
              {{ row.hasTax ? "含税" : "不含税" }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.excel-detail-container {
  padding: 8px;
}

.top-header {
  display: flex;
  gap: 16px;
  align-items: center;

  .page-title {
    flex: 1;
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
}

.statistics-container {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 12px 0;

  .stat-item {
    flex: 1;
    text-align: center;

    .stat-label {
      margin-bottom: 8px;
      font-size: 14px;
      color: #909399;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
    }
  }

  .stat-divider {
    width: 1px;
    height: 40px;
    background-color: #dcdfe6;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .card-title {
    font-size: 16px;
    font-weight: 600;
  }
}
</style>
