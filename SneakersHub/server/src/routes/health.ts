import { Router } from "express";

export const health = Router();

health.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sneakershub-api", time: new Date().toISOString() });
});