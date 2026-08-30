export function serverOffset(serverTime?: string, clientNow = Date.now()) {
  return serverTime ? new Date(serverTime).getTime() - clientNow : 0;
}

export function millisecondsUntil(timestamp: string, offsetMs = 0, clientNow = Date.now()) {
  return Math.max(0, new Date(timestamp).getTime() - (clientNow + offsetMs));
}

export function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, "0")).join(":");
}

export function formatPrice(price: string, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(price));
}
