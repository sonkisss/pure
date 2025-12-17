// @ts-nocheck
interface PrintOptions {
  styleStr?: string;
  setDomHeightArr?: string[];
  printBeforeFn?: (params: { doc: Document }) => void;
  printDoneCallBack?: () => void;
}

interface PrintInstance {
  conf: Required<PrintOptions>;
  dom: Element;
  init(): void;
  extendOptions<T extends object>(obj: T, obj2: T): T;
  getStyle(): string;
  getHtml(): string;
  writeIframe(content: string): void;
  toPrint(frameWindow: Window | Document): void;
  isDOM(obj: any): boolean;
  setDomHeight(arr: string[]): void;
}

interface PrintFunction {
  new (
    dom: string | Element | { $el: Element },
    options?: PrintOptions
  ): PrintInstance;
  (
    dom: string | Element | { $el: Element },
    options?: PrintOptions
  ): PrintInstance;
}

const Print = function (
  this: PrintInstance | void,
  dom: string | Element | { $el: Element },
  options: PrintOptions = {}
): PrintInstance {
  // 支持直接调用和new调用两种方式
  if (!(this instanceof Print)) {
    return new Print(dom, options);
  }

  // 初始化配置
  this.conf = {
    styleStr: "",
    setDomHeightArr: [],
    printBeforeFn: null,
    printDoneCallBack: null,
    ...options
  };

  // 处理dom参数
  if (typeof dom === "string") {
    const element = document.querySelector(dom);
    if (!element) {
      throw new Error(`Element not found: ${dom}`);
    }
    this.dom = element;
  } else if (this.isDOM(dom)) {
    this.dom = dom as Element;
  } else if (dom && typeof dom === "object" && "$el" in dom) {
    this.dom = (dom as { $el: Element }).$el;
  } else {
    throw new Error("Invalid dom parameter");
  }

  // 设置动态高度
  if (this.conf.setDomHeightArr && this.conf.setDomHeightArr.length) {
    this.setDomHeight(this.conf.setDomHeightArr);
  }

  this.init();
  return this;
} as PrintFunction;

Print.prototype = {
  /**
   * init
   */
  init(this: PrintInstance): void {
    const content = this.getStyle() + this.getHtml();
    this.writeIframe(content);
  },

  /**
   * Configuration property extension
   */
  extendOptions<T extends object>(this: PrintInstance, obj: T, obj2: T): T {
    for (const k in obj2) {
      obj[k] = obj2[k];
    }
    return obj;
  },

  /**
   * Copy all styles of the original page
   */
  getStyle(this: PrintInstance): string {
    let str = "";
    const styles: NodeListOf<Element> = document.querySelectorAll("style,link");
    for (let i = 0; i < styles.length; i++) {
      str += styles[i].outerHTML;
    }
    str += `<style>.no-print{display:none;}${this.conf.styleStr}</style>`;
    return str;
  },

  /**
   * Form assignment
   */
  getHtml(this: PrintInstance): string {
    const inputs = document.querySelectorAll("input");
    const selects = document.querySelectorAll("select");
    const textareas = document.querySelectorAll("textarea");
    const canvass = document.querySelectorAll("canvas");

    // 处理input元素
    for (let k = 0; k < inputs.length; k++) {
      const input = inputs[k] as HTMLInputElement;
      if (input.type === "checkbox" || input.type === "radio") {
        if (input.checked) {
          input.setAttribute("checked", "checked");
        } else {
          input.removeAttribute("checked");
        }
      } else {
        input.setAttribute("value", input.value);
      }
    }

    // 处理textarea元素
    for (let k2 = 0; k2 < textareas.length; k2++) {
      const textarea = textareas[k2] as HTMLTextAreaElement;
      textarea.innerHTML = textarea.value;
    }

    // 处理select元素
    for (let k3 = 0; k3 < selects.length; k3++) {
      const select = selects[k3] as HTMLSelectElement;
      if (select.type === "select-one") {
        const children = select.children;
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLOptionElement;
          if (child.tagName === "OPTION") {
            if (child.selected) {
              child.setAttribute("selected", "selected");
            } else {
              child.removeAttribute("selected");
            }
          }
        }
      }
    }

    // 处理canvas元素
    for (let k4 = 0; k4 < canvass.length; k4++) {
      const canvas = canvass[k4] as HTMLCanvasElement;
      try {
        const imageURL = canvas.toDataURL("image/png");
        const img = document.createElement("img");
        img.src = imageURL;
        img.setAttribute("style", "max-width: 100%;");
        img.className = "isNeedRemove";
        if (canvas.parentNode) {
          canvas.parentNode.insertBefore(img, canvas.nextElementSibling);
        }
      } catch (error) {
        console.warn("Canvas conversion failed:", error);
      }
    }

    return this.dom.outerHTML;
  },

  /**
   * Create iframe
   */
  writeIframe(this: PrintInstance, content: string): void {
    const iframe: HTMLIFrameElement = document.createElement("iframe");
    const f: HTMLIFrameElement = document.body.appendChild(iframe);
    iframe.id = "myIframe";
    iframe.setAttribute(
      "style",
      "position:absolute;width:0;height:0;top:-10px;left:-10px;"
    );

    const w = f.contentWindow || f.contentDocument;
    const doc = f.contentDocument || (f.contentWindow as Window).document;

    if (!doc || !w) {
      throw new Error("Failed to create iframe document");
    }

    doc.open();
    doc.write(content);
    doc.close();

    // 清理临时添加的图片元素
    const removes = document.querySelectorAll(".isNeedRemove");
    for (let k = 0; k < removes.length; k++) {
      const remove = removes[k];
      if (remove.parentNode) {
        remove.parentNode.removeChild(remove);
      }
    }

    const self = this;
    iframe.onload = function (): void {
      // Before printing, callback
      if (self.conf.printBeforeFn) {
        self.conf.printBeforeFn({ doc });
      }
      self.toPrint(w as Window);
      setTimeout(function (): void {
        document.body.removeChild(iframe);
        // After printing, callback
        if (self.conf.printDoneCallBack) {
          self.conf.printDoneCallBack();
        }
      }, 100);
    };
  },

  /**
   * Print
   */
  toPrint(this: PrintInstance, frameWindow: Window): void {
    try {
      setTimeout(function (): void {
        frameWindow.focus();
        try {
          if (!frameWindow.document.execCommand("print", false, null)) {
            frameWindow.print();
          }
        } catch {
          frameWindow.print();
        }
        frameWindow.close();
      }, 10);
    } catch (err) {
      console.error("Print failed:", err);
    }
  },

  /**
   * Check if object is DOM element
   */
  isDOM(this: PrintInstance, obj: any): boolean {
    if (typeof HTMLElement === "object") {
      return obj instanceof HTMLElement;
    }
    return (
      obj &&
      typeof obj === "object" &&
      obj.nodeType === 1 &&
      typeof obj.nodeName === "string"
    );
  },

  /**
   * Set the height of the specified dom elements
   */
  setDomHeight(this: PrintInstance, arr: string[]): void {
    if (arr && arr.length) {
      arr.forEach(name => {
        const domArr = document.querySelectorAll(name);
        domArr.forEach(dom => {
          const element = dom as HTMLElement;
          element.style.height = element.offsetHeight + "px";
        });
      });
    }
  }
} as PrintInstance;

export default Print;
export type { PrintOptions, PrintInstance };
