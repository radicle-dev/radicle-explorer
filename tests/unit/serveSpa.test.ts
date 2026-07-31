// @vitest-environment node
import type { ChildProcess } from "node:child_process";

import * as Http from "node:http";
import { spawn } from "node:child_process";
import { afterAll, beforeAll, expect, test } from "vitest";

const port = 24817;
let server: ChildProcess;

function request(path: string): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const req = Http.get({ host: "localhost", port, path }, response => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    });
    req.on("error", reject);
  });
}

beforeAll(async () => {
  server = spawn("node", ["scripts/serve-spa.mjs", "--port", String(port)]);
  await new Promise<void>((resolve, reject) => {
    server.stdout?.on("data", () => resolve());
    server.on("error", reject);
    server.on("exit", code =>
      reject(new Error(`serve-spa exited with code ${String(code)}`)),
    );
  });
});

afterAll(() => {
  server.kill();
});

test("responds 400 to malformed percent-encoding without crashing", async () => {
  await expect(request("/%zz")).resolves.toBe(400);
  // The server must survive the malformed request and keep serving.
  await expect(request("/%zz")).resolves.toBe(400);
});
