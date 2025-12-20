import { afterEach, vi } from "vitest";
import { config } from "@vue/test-utils";

// 简单的全局 stub，避免 Transition/Teleport 影响测试渲染
config.global.stubs = {
  transition: false,
  teleport: false
};

// 一些环境可能没有 structuredClone
if (typeof globalThis.structuredClone !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).structuredClone = (val: any) =>
    JSON.parse(JSON.stringify(val));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllTimers();
});
