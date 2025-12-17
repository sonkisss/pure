/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @param immediate 是否立即执行
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        func.apply(this, args);
      }
    }, delay);

    if (callNow) {
      func.apply(this, args);
    }
  };
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param delay 延迟时间（毫秒）
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

/**
 * 创建可取消的防抖函数
 */
export function createDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate: boolean = false
) {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        func.apply(this, args);
      }
    }, delay);

    if (callNow) {
      func.apply(this, args);
    }
  };

  // 取消函数
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  // 立即执行函数
  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      func();
    }
  };

  return debounced;
}
