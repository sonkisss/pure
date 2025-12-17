/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.svg?component" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "*.svg?raw" {
  const src: string;
  export default src;
}

declare module "*.svg?url" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "~icons/*" {
  import type { Component } from "vue";
  const component: Component;
  export default component;
}

declare module "~icons/*?raw" {
  const src: string;
  export default src;
}

declare module "~icons/*?component" {
  import type { Component } from "vue";
  const component: Component;
  export default component;
}

declare module "@/assets/*" {
  const src: string;
  export default src;
}

declare module "jsonwebtoken" {
  const jwt: any;
  export = jwt;
}
