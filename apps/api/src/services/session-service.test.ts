import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn() }));

vi.mock("../database/models.js", () => ({
  getModels: () => ({ BuyerSession: { update: mocks.update } })
}));

import { endBuyerSession } from "./session-service";

describe("buyer logout", () => {
  it("expires the session while retaining reservation-linked history", async () => {
    mocks.update.mockResolvedValueOnce([1]);
    await endBuyerSession("25dcad12-72bf-47e2-bac2-4aa16430c633");
    expect(mocks.update).toHaveBeenCalledWith(
      { expiresAt: expect.any(Date) },
      { where: { id: "25dcad12-72bf-47e2-bac2-4aa16430c633" } }
    );
  });
});
