import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../supabaseAdmin.js";
import { analyzeInvoiceTextWithEngine } from "../luziaEngine.js";

export const invoicesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

invoicesRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    const file = req.file;
    if (!sessionId || !file) {
      return res.status(400).json({ error: "Falta sessionId o el archivo." });
    }

    const isImage = file.mimetype.startsWith("image/");
    const isPdf = file.mimetype === "application/pdf";
    if (!isImage && !isPdf) {
      return res.status(400).json({ error: "Solo se aceptan imágenes o PDF." });
    }

    const path = `${sessionId}/${randomUUID()}-${file.originalname}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("invoices")
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw uploadError;

    if (isImage) {
      return res.status(422).json({
        error: "ANALISIS_DE_IMAGEN_NO_DISPONIBLE",
        content: "La factura se guardó correctamente, pero el LuzIA Engine v1.0 todavía no tiene visión para analizar imágenes directamente. Envíala como PDF con texto extraído o añadiremos el módulo de visión del Engine en la siguiente versión.",
        redirect: null,
        showOptions: false,
      });
    }

    const pdfText = (req.body.pdfText || "").slice(0, 16000);
    if (!pdfText.trim()) {
      return res.json({
        content: "No logré leer texto de este PDF (puede tratarse de una factura escaneada como imagen dentro del PDF). Envíala como un PDF con texto seleccionable o como imagen cuando habilitemos el módulo de visión del Engine.",
        redirect: null,
        showOptions: false,
      });
    }

    const analysis = await analyzeInvoiceTextWithEngine({ pdfText, userContext: { sessionId } });
    const content = analysis.content;

    await supabaseAdmin.from("invoices").insert({
      session_id: sessionId,
      file_path: path,
      file_name: file.originalname,
      analysis: content,
    });

    res.json({
      content,
      redirect: analysis.redirect,
      showOptions: analysis.showOptions,
      engine: analysis.engine,
      engineVersion: analysis.engineVersion,
      knowledgeUsed: analysis.knowledgeUsed,
      calculationUsed: analysis.calculationUsed,
      comparisonUsed: analysis.comparisonUsed,
      recommendationUsed: analysis.recommendationUsed,
      sources: analysis.sources,
    });
  } catch (err) {
    console.error("[LuzIA invoice]", err);
    res.status(500).json({ error: err.message || "Error interno." });
  }
});
