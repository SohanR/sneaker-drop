import { Router } from "express";
import { z } from "zod";
import { requireBuyer } from "../middleware/buyer-auth.js";
import { reserveDrop } from "../services/reservation-service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { parse } from "../utils/validation.js";

const requestSchema = z.object({
  dropId: z.uuid(),
  idempotencyKey: z.uuid()
});

export const reservationRoutes = Router({ mergeParams: true });

reservationRoutes.post("/", requireBuyer, asyncHandler(async (req, res) => {
  const input = parse(requestSchema, {
    dropId: req.params.dropId,
    idempotencyKey: req.header("idempotency-key")
  });
  const buyer = res.locals.buyerSession;
  const result = await reserveDrop(input.dropId, buyer.id, buyer.displayUsername, input.idempotencyKey);
  res.status(result.replayed ? 200 : 201).json({
    data: {
      id: result.id,
      dropId: result.dropId,
      status: result.status,
      expiresAt: result.expiresAt,
      availableStock: result.availableStock,
      stockVersion: result.stockVersion,
      serverTime: result.serverTime,
      idempotentReplay: result.replayed
    }
  });
}));
