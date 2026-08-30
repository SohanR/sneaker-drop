import { z } from "zod";

export const GMT_OFFSETS = [
  "GMT-12:00", "GMT-11:00", "GMT-10:00", "GMT-09:30", "GMT-09:00", "GMT-08:00", "GMT-07:00",
  "GMT-06:00", "GMT-05:00", "GMT-04:00", "GMT-03:30", "GMT-03:00", "GMT-02:00", "GMT-01:00",
  "GMT+00:00", "GMT+01:00", "GMT+02:00", "GMT+03:00", "GMT+03:30", "GMT+04:00", "GMT+04:30",
  "GMT+05:00", "GMT+05:30", "GMT+05:45", "GMT+06:00", "GMT+06:30", "GMT+07:00", "GMT+08:00",
  "GMT+08:45", "GMT+09:00", "GMT+09:30", "GMT+10:00", "GMT+10:30", "GMT+11:00", "GMT+12:00",
  "GMT+12:45", "GMT+13:00", "GMT+14:00"
] as const;

const localDateTime = z.string().trim().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/,
  "Use local date and time in YYYY-MM-DDTHH:mm format"
);

export const createDropSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(5000).optional(),
  imageUrl: z.union([z.url(), z.literal("")]).optional().transform((value) => value || undefined),
  price: z.coerce.number().finite().nonnegative().multipleOf(0.01),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("USD"),
  totalStock: z.coerce.number().int().nonnegative(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  startsAtLocal: localDateTime.optional(),
  utcOffset: z.enum(GMT_OFFSETS).optional()
}).superRefine((input, context) => {
  const hasIso = Boolean(input.startsAt);
  const hasLocalPair = Boolean(input.startsAtLocal && input.utcOffset);
  if (hasIso === hasLocalPair) {
    context.addIssue({ code: "custom", message: "Provide either startsAt, or startsAtLocal together with utcOffset" });
  }
  if (Boolean(input.startsAtLocal) !== Boolean(input.utcOffset)) {
    context.addIssue({ code: "custom", message: "startsAtLocal and utcOffset must be provided together" });
  }
  if (hasLocalPair) {
    const timestamp = `${input.startsAtLocal}${input.utcOffset!.slice(3)}`;
    if (Number.isNaN(new Date(timestamp).getTime())) {
      context.addIssue({ code: "custom", message: "Drop start date and time is invalid" });
    }
  }
}).transform(({ startsAt, startsAtLocal, utcOffset, ...input }) => {
  const timestamp = startsAt || `${startsAtLocal}${utcOffset!.slice(3)}`;
  return { ...input, startsAt: new Date(timestamp) };
});
