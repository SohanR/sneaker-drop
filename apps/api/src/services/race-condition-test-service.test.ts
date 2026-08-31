import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors/app-error.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  reserveDrop: vi.fn()
}));

vi.mock("../config/database.js", () => ({
  getDatabase: () => ({ query: mocks.query, transaction: mocks.transaction })
}));

vi.mock("./reservation-service.js", () => ({ reserveDrop: mocks.reserveDrop }));

import { runLastItemRaceTest } from "./race-condition-test-service.js";

describe("last-item race-condition diagnostic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (transaction: object) => unknown) => callback({}));
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO buyer_sessions")) {
        return Array.from({ length: 100 }, (_, index) => ({
          id: "00000000-0000-4000-8000-" + String(index + 1).padStart(12, "0"),
          displayUsername: "race_user_" + (index + 1)
        }));
      }
      if (sql.includes("SELECT d.available_stock")) {
        return [{ availableStock: 0, reservationCount: "1" }];
      }
      return [];
    });

    let attempt = 0;
    mocks.reserveDrop.mockImplementation(async () => {
      attempt += 1;
      if (attempt === 1) return { id: "winning-reservation" };
      throw new AppError(409, "SOLD_OUT", "Drop is sold out");
    });
  });

  it("proves exactly one of 100 concurrent attempts can claim the final unit", async () => {
    const result = await runLastItemRaceTest(100, "10000000-0000-4000-8000-000000000001");

    expect(mocks.reserveDrop).toHaveBeenCalledTimes(100);
    expect(result).toMatchObject({
      attemptedReservations: 100,
      successfulReservations: 1,
      soldOutConflicts: 99,
      unexpectedFailures: 0,
      finalAvailableStock: 0,
      persistedReservations: 1,
      invariantPassed: true,
      cleanedUp: true
    });
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes("DELETE FROM reservations"))).toBe(true);
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes("DELETE FROM buyer_sessions"))).toBe(true);
  });
});
