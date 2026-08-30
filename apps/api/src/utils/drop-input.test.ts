import { describe, expect, it } from "vitest";
import { createDropSchema } from "./drop-input";

const baseDrop = { name: "Three-Tier Runner", price: 199.99, currency: "USD", totalStock: 100 };

describe("drop start input", () => {
  it("converts Dhaka local time and GMT offset to the correct instant", () => {
    const result = createDropSchema.parse({
      ...baseDrop,
      startsAtLocal: "2026-09-01T18:30",
      utcOffset: "GMT+06:00"
    });
    expect(result.startsAt.toISOString()).toBe("2026-09-01T12:30:00.000Z");
  });

  it("continues accepting an ISO timestamp for existing clients", () => {
    const result = createDropSchema.parse({ ...baseDrop, startsAt: "2026-09-01T12:30:00.000Z" });
    expect(result.startsAt.toISOString()).toBe("2026-09-01T12:30:00.000Z");
  });

  it("requires exactly one complete time input style", () => {
    expect(createDropSchema.safeParse(baseDrop).success).toBe(false);
    expect(createDropSchema.safeParse({ ...baseDrop, startsAtLocal: "2026-09-01T18:30" }).success).toBe(false);
  });
});
