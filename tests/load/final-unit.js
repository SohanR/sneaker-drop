import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const winners = new Counter("reservation_winners");
const conflicts = new Counter("reservation_conflicts");

export const options = {
  scenarios: {
    final_unit: {
      executor: "per-vu-iterations",
      vus: 100,
      iterations: 1,
      maxDuration: "30s"
    }
  },
  thresholds: {
    checks: ["rate==1"],
    reservation_winners: ["count==1"],
    reservation_conflicts: ["count==99"]
  }
};

const apiUrl = (__ENV.API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");
const dropId = __ENV.DROP_ID;

function uuidForVu(vu) {
  return `00000000-0000-4000-8000-${String(vu).padStart(12, "0")}`;
}

export default function () {
  if (!dropId) throw new Error("DROP_ID must identify a started drop with exactly one available unit");

  const session = http.post(`${apiUrl}/sessions`, JSON.stringify({ displayUsername: `load_user_${__VU}` }), {
    headers: { "content-type": "application/json" }
  });
  check(session, { "session created": (response) => response.status === 201 });

  const reservation = http.post(`${apiUrl}/drops/${dropId}/reservations`, null, {
    headers: {
      "Idempotency-Key": uuidForVu(__VU)
    }
  });

  if (reservation.status === 201) winners.add(1);
  if (reservation.status === 409) conflicts.add(1);
  check(reservation, { "exactly an accepted outcome": (response) => response.status === 201 || response.status === 409 });
}
