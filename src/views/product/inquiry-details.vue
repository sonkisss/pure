<template>
  <div class="product-container">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true">
        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="产品名称/规格型号/供应商"
            clearable
            style="width: 240px"
            @input="handleSearchKeywordChange"
            @keyup.enter="handleSearch"
          >
            <template #suffix>
              <el-icon v-if="loading" class="is-loading">
                <Loading />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleResetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card shadow="never">
      <!-- 操作栏 -->
      <div class="mb-4 flex justify-between">
        <div>
          <el-button
            type="primary"
            :icon="Download"
            :loading="exportLoading"
            @click="handleExport"
          >
            导出数据
          </el-button>
        </div>
        <el-button :icon="Refresh" :loading="loading" @click="handleRefresh"
          >刷新</el-button
        >
      </div>

      <el-table
        v-loading="loading"
        :data="currentData"
        stripe
        border
        height="650"
        :row-style="{ height: '36px' }"
        :cell-style="{ padding: '4px 0' }"
      >
        <el-table-column type="index" label="序号" width="80" align="center" />
        <el-table-column
          prop="product_name"
          label="产品名称"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="spec_model"
          label="规格型号"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column prop="unit" label="单位" width="80" align="center" />
        <el-table-column
          prop="quantity"
          label="数量"
          width="100"
          align="right"
        />
        <el-table-column
          prop="purchase_price"
          label="进价"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span class="text-green-600"
              >¥{{ formatPrice(row.purchase_price) }}</span
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="sale_price"
          label="卖价"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span class="text-red-600">¥{{ formatPrice(row.sale_price) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="supplier"
          label="供应商"
          width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="tax_type"
          label="含税类型"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="
                row.tax_type === '含税'
                  ? 'success'
                  : row.tax_type === '普票'
                    ? 'warning'
                    : 'info'
              "
              size="small"
            >
              {{ row.tax_type || "不含税" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="remark"
          label="备注"
          width="120"
          show-overflow-tooltip
        />
        <el-table-column
          prop="company_name"
          label="公司名称"
          width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="inquiry_name"
          label="询价单名称"
          width="180"
          show-overflow-tooltip
        />
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100, 200]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import { Download, Refresh, Loading } from "@element-plus/icons-vue";
import { getAllInquiryDetails } from "@/api/inquiry";
import type { AllInquiryDetailsItem } from "@/repositories/inquirySupabase";
import { formatPrice, formatDate } from "@/utils/format";
import * as XLSX from "xlsx";

defineOptions({
  name: "ProductInquiryDetails"
});

// 响应式数据
const loading = ref(false);
const exportLoading = ref(false);
const tableData = ref<AllInquiryDetailsItem[]>([]);

// 搜索关键词
const searchKeyword = ref("");

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0
});

// 去重函数：产品名称+规格型号+供应商相同，保留进价最低的记录
const deduplicateData = (data: any[]) => {
  const dataMap = new Map();

  data.forEach(item => {
    const key = `${item.product_name || ""}|${item.spec_model || ""}|${item.supplier || ""}`;

    if (!dataMap.has(key)) {
      dataMap.set(key, item);
    } else {
      const existingItem = dataMap.get(key);
      const existingPrice = Number(existingItem.purchase_price || 0);
      const currentPrice = Number(item.purchase_price || 0);

      // 如果当前记录的进价更低，则替换
      if (currentPrice < existingPrice) {
        dataMap.set(key, item);
      }
    }
  });

  return Array.from(dataMap.values());
};

// 加载数据
const loadData = async (forceRefresh = false) => {
  try {
    loading.value = true;
    const result = await getAllInquiryDetails(forceRefresh);

    if (result.success && result.data) {
      // 应用去重逻辑
      const deduplicatedData = deduplicateData(result.data);
      tableData.value = deduplicatedData;
      pagination.total = deduplicatedData.length;

      // 在控制台输出去重信息和缓存状态
      const originalCount = result.data.length;
      const deduplicatedCount = deduplicatedData.length;
      if (originalCount > deduplicatedCount) {
        console.log(
          `🔍 询价明细数据去重：${originalCount} 条 → ${deduplicatedCount} 条，去重 ${originalCount - deduplicatedCount} 条`
        );
      }

      if (result.fromCache) {
        console.log("📦 询价明细数据来自缓存");
      } else {
        console.log("🔄 询价明细数据来自实时查询");
      }
    } else {
      ElMessage.error((result as any).message || "获取数据失败");
    }
  } catch (error) {
    console.error("获取询价明细数据失败:", error);
    ElMessage.error("获取数据失败");
  } finally {
    loading.value = false;
  }
};

// 过滤后的数据
const filteredData = computed(() => {
  let data = [...tableData.value]; // tableData已经是去重后的数据

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    data = data.filter(
      item =>
        item.product_name?.toLowerCase().includes(keyword) ||
        item.spec_model?.toLowerCase().includes(keyword) ||
        item.supplier?.toLowerCase().includes(keyword)
    );
  }

  return data;
});

// 当前页显示的数据
const currentData = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize;
  const end = start + pagination.pageSize;
  return filteredData.value.slice(start, end);
});

// 实时搜索（防抖）
const handleRealtimeSearch = () => {
  pagination.page = 1;
  pagination.total = filteredData.value.length;
};

// 立即搜索
const handleSearch = () => {
  pagination.page = 1;
  pagination.total = filteredData.value.length;
};

// 重置搜索
const handleResetSearch = () => {
  searchKeyword.value = "";
  pagination.page = 1;
  pagination.total = filteredData.value.length;
};

// 搜索关键词变化监听
const handleSearchKeywordChange = () => {
  if (searchKeyword.value.trim() === "") {
    handleResetSearch();
  } else {
    handleRealtimeSearch();
  }
};

// 刷新
const handleRefresh = () => {
  loadData();
};

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.page = 1;
};

const handleCurrentChange = (page: number) => {
  pagination.page = page;
};

// 导出Excel
const handleExport = async () => {
  try {
    exportLoading.value = true;

    const exportData = filteredData.value.map(item => ({
      产品名称: item.product_name || "",
      规格型号: item.spec_model || "",
      单位: item.unit || "",
      数量: item.quantity || 0,
      进价: item.purchase_price || 0,
      卖价: item.sale_price || 0,
      供应商: item.supplier || "",
      含税类型: item.tax_type || "不含税",
      备注: item.remark || "",
      公司名称: item.company_name || "",
      询价单名称: item.inquiry_name || ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "询价明细表");

    XLSX.writeFile(wb, `询价明细表_${formatDate(new Date())}.xlsx`);
    ElMessage.success("导出成功");
  } catch (error) {
    console.error("导出失败:", error);
    ElMessage.error("导出失败");
  } finally {
    exportLoading.value = false;
  }
};

// 初始化
onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.product-container {
  padding: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.text-green-600 {
  color: #16a34a;
}

.text-blue-600 {
  color: #2563eb;
}

// 缩小表格行高以显示更多数据
:deep(.el-table) {
  .el-table__row {
    height: 36px !important; // 默认行高是 50px 左右，缩小到 36px

    td {
      padding: 8px 0 !important; // 减少单元格内边距
      line-height: 1.2 !important; // 减少行间距
    }
  }

  .el-table__header {
    th {
      height: 40px !important; // 表头也相应缩小
      padding: 8px 0 !important; // 减少表头内边距
      line-height: 1.2 !important;
    }
  }

  .el-table__cell {
    padding: 8px 0 !important;
  }
}

// 优化小标签显示
:deep(.el-tag--small) {
  height: 20px;
  padding: 0 6px;
  font-size: 12px;
  line-height: 18px;
}
</style>
