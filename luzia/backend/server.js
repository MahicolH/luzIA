import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatRouter } from "./src/routes/chat.js";
import { invoicesRouter } from "./src/routes/invoices.js";
import { adminRouter } from "./src/routes/admin.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "*",
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/chat", chatRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/admin", adminRouter);

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`LuzIA backend escuchando en http://localhost:${port}`);
});
