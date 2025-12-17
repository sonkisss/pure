/**
 * 数字格式化工具函数
 */

/**
 * 格式化金额显示
 * @param value 数值
 * @returns 格式化后的字符串，整数不显示小数位，小数有几位显示几位
 */
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "0";

  // 检查是否为整数
  if (Number.isInteger(num)) {
    return num.toLocaleString("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  } else {
    // 对于小数，最多保留2位小数，去除末尾的0
    return num.toLocaleString("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }
}

/**
 * 格式化数字显示（不带千分位分隔符）
 * @param value 数值
 * @returns 格式化后的字符串，整数不显示小数位，小数有几位显示几位
 */
export function formatNumber(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined || value === "") return "0";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "0";

  // 检查是否为整数
  if (Number.isInteger(num)) {
    return num.toString();
  } else {
    // 对于小数，最多保留2位小数，去除末尾的0
    let result = num.toFixed(2);
    // 去除末尾的0
    result = result.replace(/\.?0+$/, "");
    return result;
  }
}

/**
 * 格式化价格显示（formatMoney的别名）
 * @param value 数值
 * @returns 格式化后的字符串
 */
export function formatPrice(value: number | string | null | undefined): string {
  return formatMoney(value);
}

/**
 * 格式化日期显示
 * @param date 日期字符串或Date对象
 * @returns 格式化后的日期字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return "";

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const seconds = String(dateObj.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return "";
  }
}
