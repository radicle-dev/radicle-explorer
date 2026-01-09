import type { Config } from "./module.d.ts";

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/naming-convention
  var __CONFIG__: Config;
  // eslint-disable-next-line no-var, @typescript-eslint/naming-convention
  var __PLAYWRIGHT__: boolean;
}

export {};
