import type { Request, Response } from "express";

const appPromise = import("../apps/api/src/app.js");

export default async function handler(request: Request, response: Response) {
  const { default: app } = await appPromise;
  return app(request, response);
}
