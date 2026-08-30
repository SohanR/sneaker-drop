import { Router } from "express";
import { z } from "zod";
import { requireBuyer } from "../middleware/buyer-auth.js";
import { settleReservation } from "../services/settlement-service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { parse } from "../utils/validation.js";

const settlementSchema = z.object({
  reservationId: z.uuid(),
  idempotencyKey: z.uuid()
});

export const settlementRoutes = Router({ mergeParams: true });

settlementRoutes.post("/complete", requireBuyer, asyncHandler(async (req, res) => {
  const input = parse(settlementSchema, {
    reservationId: req.params.reservationId,
    idempotencyKey: req.header("idempotency-key")
  });
  const result = await settleReservation(input.reservationId, res.locals.buyerSession.id, input.idempotencyKey);
  res.status(result.idempotentReplay ? 200 : 201).json({ data: result });
}));
