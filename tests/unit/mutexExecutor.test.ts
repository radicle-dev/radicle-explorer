/* eslint-disable @typescript-eslint/no-floating-promises */
import * as sinon from "sinon";
import { describe, expect, test } from "vitest";

import * as mutexExecutor from "@app/lib/mutexExecutor";
import { sleep } from "@app/lib/sleep";

describe("executor", () => {
  test("cancels running task", async () => {
    const e = mutexExecutor.create();

    const first = e.run(async () => {
      await sleep(10);
      return "first";
    });
    const second = e.run(async () => {
      return "second";
    });

    expect(await first).toBe(undefined);
    expect(await second).toBe("second");

    const third = e.run(async () => {
      await sleep(10);
      return "third";
    });
    const fourth = e.run(async () => {
      return "fourth";
    });

    expect(await third).toBe(undefined);
    expect(await fourth).toBe("fourth");
  });

  test("cancels multiple tasks", async () => {
    const e = mutexExecutor.create();

    const canceled1 = e.run(async () => {
      await sleep(10);
      return true;
    });
    const canceled2 = e.run(async () => {
      await sleep(10);
      return true;
    });
    const canceled3 = e.run(async () => {
      await sleep(10);
      return true;
    });
    const last = e.run(async () => {
      return true;
    });

    expect(await canceled1).toBe(undefined);
    expect(await canceled2).toBe(undefined);
    expect(await canceled3).toBe(undefined);
    expect(await last).toBe(true);
  });

  test("triggers abort signal event", async () => {
    const e = mutexExecutor.create();
    const abortListener = sinon.spy();

    e.run(async abort => {
      abort.addEventListener("abort", abortListener);
      await sleep(10);
      return "first";
    });
    expect(abortListener.called).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    e.run(async () => {});
    expect(abortListener.called).toBe(true);
  });

  test("don’t throw error on aborted task", async () => {
    const e = mutexExecutor.create();

    const first = e.run(async () => {
      await sleep(10);
      throw new Error();
    });
    const second = e.run(async () => {
      return "second";
    });

    expect(await first).toBe(undefined);
    expect(await second).toBe("second");
  });
});

describe("worker", () => {
  test("sequential work", async () => {
    const w = mutexExecutor.createWorker(async (value: number) => {
      await sleep(10);
      return value;
    });

    const outputs: number[] = [];
    w.output.onValue(value => outputs.push(value));

    await w.submit(1);
    await w.submit(2);
    await w.submit(3);

    expect(outputs).toEqual([1, 2, 3]);
  });

  test("overlapping work cancels", async () => {
    const w = mutexExecutor.createWorker(async (value: number) => {
      await sleep(10);
      return value;
    });

    const nextOutput = w.output.firstToPromise();

    w.submit(1);
    w.submit(2);
    w.submit(3);

    expect(await nextOutput).toEqual(3);
  });
});
