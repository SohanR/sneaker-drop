import { describe, expect, it } from "vitest";
import { formatCountdown, formatPrice, millisecondsUntil, serverOffset } from "./clock";

describe("server-aligned countdowns", () => {
  it("uses server time as the source of truth", () => {
    const clientNow = Date.parse("2026-01-01T00:00:00.000Z");
    const offset = serverOffset("2026-01-01T00:00:05.000Z", clientNow);
    expect(offset).toBe(5_000);
    expect(millisecondsUntil("2026-01-01T00:01:05.000Z", offset, clientNow)).toBe(60_000);
  });

  it("clamps expired timestamps and formats countdowns", () => {
    expect(millisecondsUntil("2020-01-01T00:00:00.000Z", 0, Date.parse("2021-01-01T00:00:00.000Z"))).toBe(0);
    expect(formatCountdown(60_000)).toBe("00:01:00");
    expect(formatCountdown(1)).toBe("00:00:01");
    expect(formatCountdown(356 * 60_000 + 45_000)).toBe("05:56:45");
  });

  it("formats prices with the supplied ISO currency", () => {
    expect(formatPrice("199.99", "USD")).toMatch(/199\.99/);
  });
});
