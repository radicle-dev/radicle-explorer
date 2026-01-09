// Test adapter for configuration in Node.js environment (Playwright tests).
//
// The app uses "virtual:config" (defined in vite.config.ts via
// vite-plugin-virtual), which is populated at build time with
// config.util.toObject() from the "config" npm package. Since Vite's virtual
// module system doesn't work in Node.js, this file provides the same
// configuration data by directly importing and converting the "config" package.
import nodeConfig from "config";

const config = nodeConfig.util.toObject();

export default config;
