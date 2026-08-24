import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../supabaseAdmin.js";
import { callGroq, parseRedirect } from "../groq.js";
import { SYSTEM_PROMPT } from "../knowledge/systemPrompt.js";

export const invoicesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// POST /api/invoices  (multipart/form-data: file, sessionId)
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

    // 1. Subir el archivo original a Supabase Storage (privado)
    const path = `${sessionId}/${randomUUID()}-${file.originalname}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("invoices")
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw uploadError;

    // 2. Analizarla con la IA
    let analysis;
    if (isImage) {
      const base64 = file.buffer.toString("base64");
      const dataUrl = `data:${file.mimetype};base64,${base64}`;
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Aquí está la foto de mi factura de luz. Analízala como LuzIA: identifica comercializadora actual, tarifa, CUPS si aparece, potencia contratada, consumo e importe, y compara con la tabla de tarifas de tu base de conocimiento para ver si existe una oportunidad de ahorro. Sigue las reglas de tu system prompt sobre cuándo usar [OPCIONES] o [REDIRECT:luz].",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ];
      analysis = await callGroq(apiMessages, process.env.GROQ_VISION_MODEL);
    } else {
      // Para PDF, el frontend ya extrajo el texto (pdf.js) y lo manda en req.body.pdfText
      const pdfText = (req.body.pdfText || "").slice(0, 12000);
      if (!pdfText.trim()) {
        return res.json({
          content:
            "No logré leer texto de este PDF (puede tratarse de una factura escaneada como imagen dentro del PDF). ¿Puedes enviarla como foto (JPG o PNG) para poder analizarla?",
          redirect: null,
          showOptions: false,
        });
      }
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Aquí está el texto extraído de mi factura de luz en PDF:\n\n${pdfText}\n\nAnalízala como LuzIA: identifica comercializadora actual, tarifa, CUPS si aparece, potencia contratada, consumo e importe, y compara con la tabla de tarifas de tu base de conocimiento para ver si existe una oportunidad de ahorro. Sigue las reglas de tu system prompt sobre cuándo usar [OPCIONES] o [REDIRECT:luz].`,
        },
      ];
      analysis = await callGroq(apiMessages, process.env.GROQ_TEXT_MODEL);
    }

    const { clean, redirect, showOptions } = parseRedirect(analysis);

    // 3. Guardar el registro de la factura (visible luego para el admin)
    await supabaseAdmin.from("invoices").insert({
      session_id: sessionId,
      file_path: path,
      file_name: file.originalname,
      analysis: clean,
    });

    res.json({ content: clean, redirect, showOptions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error interno." });
  }
});
