import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatRouter } from "./src/routes/chat.js";
import { invoicesRouter } from "./src/routes/invoices.js";
import { adminRouter } from "./src/routes/admin.js";
import { historyRouter } from "./src/routes/history.js";

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origen no permitido por CORS.")
      );
    },
    credentials: false,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/chat", chatRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/history", historyRouter);

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`LuzIA backend escuchando en http://localhost:${port}`);
});
