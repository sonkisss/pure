const getGlobalObject = (): any => {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof self !== "undefined") return self;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return {};
};

const globalObject = getGlobalObject();

if (typeof globalObject.globalThis === "undefined") {
  Object.defineProperty(globalObject, "globalThis", {
    value: globalObject,
    writable: false,
    enumerable: false,
    configurable: true
  });
}
