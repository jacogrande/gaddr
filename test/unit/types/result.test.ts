import { describe, expect, test } from "bun:test";
import type { Result } from "../../../src/domain/types/result";
import {
  ok,
  err,
  isOk,
  isErr,
  map,
  flatMap,
  mapError,
  mapFn,
  flatMapFn,
  mapErrorFn,
  pipe,
} from "../../../src/domain/types/result";

describe("ok / err constructors", () => {
  test("ok wraps a value", () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  test("err wraps an error", () => {
    const result = err("boom");
    expect(result).toEqual({ ok: false, error: "boom" });
  });
});

describe("isOk / isErr guards", () => {
  test("isOk returns true for Ok", () => {
    expect(isOk(ok(1))).toBe(true);
  });

  test("isOk returns false for Err", () => {
    expect(isOk(err("x"))).toBe(false);
  });

  test("isErr returns true for Err", () => {
    expect(isErr(err("x"))).toBe(true);
  });

  test("isErr returns false for Ok", () => {
    expect(isErr(ok(1))).toBe(false);
  });
});

describe("map", () => {
  test("transforms Ok value", () => {
    const result = map(ok(2), (n) => n * 3);
    expect(result).toEqual(ok(6));
  });

  test("passes Err through unchanged", () => {
    const result = map(err("fail"), (n: number) => n * 3);
    expect(result).toEqual(err("fail"));
  });
});

describe("flatMap", () => {
  test("chains Ok -> Ok", () => {
    const result = flatMap(ok(5), (n) => ok(n + 1));
    expect(result).toEqual(ok(6));
  });

  test("chains Ok -> Err", () => {
    const result = flatMap(ok(5), () => err("nope"));
    expect(result).toEqual(err("nope"));
  });

  test("short-circuits on Err", () => {
    let called = false;
    const result = flatMap(err("early"), () => {
      called = true;
      return ok(99);
    });
    expect(result).toEqual(err("early"));
    expect(called).toBe(false);
  });
});

describe("mapError", () => {
  test("transforms Err error", () => {
    const result = mapError(err("bad"), (e) => `wrapped: ${e}`);
    expect(result).toEqual(err("wrapped: bad"));
  });

  test("passes Ok through unchanged", () => {
    const result = mapError(ok(42), (e: string) => `wrapped: ${e}`);
    expect(result).toEqual(ok(42));
  });
});

describe("curried combinators", () => {
  test("mapFn transforms Ok, passes Err through", () => {
    const double = mapFn((n: number) => n * 2);
    expect(double(ok(5))).toEqual(ok(10));
    expect(double(err("nope"))).toEqual(err("nope"));
  });

  test("flatMapFn chains or short-circuits", () => {
    const safeDivide = flatMapFn((n: number): Result<number, string> =>
      n === 0 ? err("div by zero") : ok(100 / n),
    );
    expect(safeDivide(ok(5))).toEqual(ok(20));
    expect(safeDivide(ok(0))).toEqual(err("div by zero"));
    expect(safeDivide(err("prior"))).toEqual(err("prior"));
  });

  test("mapErrorFn transforms Err, passes Ok through", () => {
    const wrapError = mapErrorFn((e: string) => ({ code: e }));
    expect(wrapError(err("bad"))).toEqual(err({ code: "bad" }));
    expect(wrapError(ok(42))).toEqual(ok(42));
  });
});

describe("pipe", () => {
  test("composes single transformation", () => {
    const result = pipe(ok(10), mapFn((n: number) => n + 5));
    expect(result).toEqual(ok(15));
  });

  test("composes multiple transformations", () => {
    const validate = (n: number) =>
      n > 10 ? ok(n) : err("too small" as const);
    const result = pipe(
      ok(2) as Result<number, "too small">,
      mapFn((n: number) => n * 10),
      flatMapFn(validate),
      mapFn((n: number) => `value: ${String(n)}`),
    );
    expect(result).toEqual(ok("value: 20"));
  });

  test("short-circuits on error in pipeline", () => {
    const result = pipe(
      ok(3),
      flatMapFn((n: number) => err(`stopped at ${String(n)}` as const)),
      mapFn(() => "unreachable"),
    );
    expect(result).toEqual(err("stopped at 3"));
  });

  test("mapErrorFn transforms error in pipe", () => {
    const result = pipe(
      err("original"),
      mapErrorFn((e: string) => ({ wrapped: e })),
    );
    expect(result).toEqual(err({ wrapped: "original" }));
  });
});
