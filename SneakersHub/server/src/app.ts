import express, { type RequestHandler } from "express";
import cors from "cors";
import { createRequire } from "node:module";
import { health } from "./routes/health.js";
import { payments } from "./routes/payments.js";
import { admin } from "./routes/admin.js";
import { referrals } from "./routes/referrals.js";
import { account } from "./routes/account.js";
import { webhooks } from "./routes/webhooks.js";

const require = createRequire(import.meta.url);
const helmet = require("helmet") as (options?: Record<string, unknown>) => RequestHandler;

export const app = express();

app.use(helmet());
app.use(cors());

// Capture the raw body so the Paystack webhook can HMAC the exact bytes.
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json", limit: "1mb" }),
  (req, _res, next) => {
    (req as any).rawBody = (req.body as Buffer).toString("utf8");
    next();
  }
);

app.use("/api/webhooks", express.json());
app.use("/api/webhooks", webhooks);

app.use(express.json({ limit: "1mb" }));

app.use(health);
app.use("/api", payments);
app.use("/api/admin", admin);
app.use("/api/referrals", referrals);
app.use("/api/account", account);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  if (err?.name === "ZodError") {
    res.status(400).json({ error: "Invalid request", details: err.issues });
    return;
  }
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;