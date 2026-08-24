import { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
import Icon from "../components/Icon.jsx";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const LOGO_SRC = "/logo.png";

const FACTURA_RECIBIDA_MSG =
  "✅ ¡Factura recibida!\n\nGracias por confiar en nosotros. Ya estoy analizando tu información.\n\nEn cuanto finalice el análisis, uno de nuestros asesores revisará el resultado y se pondrá en contacto contigo para resolver tus dudas y ayudarte a valorar la mejor opción para tu caso.\n\n💡 Misión cumplida. Ya hemos puesto un poco más de luz sobre tu energía.\nAhora déjanos hacer el resto. Muy pronto nos pondremos en contacto contigo.";

const WHATSAPP_LINK = "https://wa.link/h65q0y"; // edítalo por el número/enlace real de tu asesor de luz

const FAQS = [
  { q: "¿Cómo contrato el servicio de luz?", a: "Escríbenos por el chat, adjunta tu factura o pulsa \"Contratar ahora\"; un asesor humano continuará la gestión por WhatsApp." },
  { q: "¿Cuánto tarda en activarse el servicio?", a: "Depende del proveedor y la zona. Tu asesor te confirma el tiempo exacto al momento de contratar." },
  { q: "¿Puedo cambiar de tarifa después de contratar?", a: "Sí, puedes solicitar el cambio en cualquier momento hablando directamente con tu asesor por WhatsApp." },
  { q: "¿Qué pasa con mis datos?", a: "Solo se usan para gestionar tu solicitud con el proveedor del servicio de luz." },
];

function getSessionId() {
  let id = localStorage.getItem("luzia_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("luzia_session_id", id);
  }
  return id;
}

// Guardamos, solo en este navegador, la lista de sesiones que ESTE
// visitante ha iniciado, para poder listarlas en "Historial" sin
// exponer las de nadie más. El detalle real de los mensajes siempre
// se pide al backend por sessionId, nunca se guarda aquí.
function getKnownSessions() {
  try {
    return JSON.parse(localStorage.getItem("luzia_known_sessions") || "[]");
  } catch {
    return [];
  }
}

function rememberSession(id, label) {
  const list = getKnownSessions().filter((s) => s.id !== id);
  list.unshift({ id, label: label || "Conversación", date: new Date().toISOString() });
  localStorage.setItem("luzia_known_sessions", JSON.stringify(list.slice(0, 30)));
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return text;
}

export default function Chat() {
  const [view, setView] = useState("inicio");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [historyList, setHistoryList] = useState(getKnownSessions());
  const [historyLoading, setHistoryLoading] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const sessionId = useRef(getSessionId());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  function nowLabel() {
    return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  }

  function newChat() {
    // Si la conversación actual ya tiene mensajes, la dejamos guardada
    // en el historial y empezamos una sesión nueva de verdad. Si está
    // vacía, simplemente seguimos en la misma (no crea historial vacío).
    if (messages.length > 0) {
      const firstUser = messages.find((m) => m.role === "user");
      rememberSession(sessionId.current, firstUser ? firstUser.content.slice(0, 60) : "Conversación");
      sessionId.current = crypto.randomUUID();
      localStorage.setItem("luzia_session_id", sessionId.current);
      setHistoryList(getKnownSessions());
    }
    setMessages([]);
    setInput("");
    setView("inicio");
  }

  async function openHistorySession(entry) {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/history/${entry.id}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const allMessages = data.flatMap((c) => c.messages);
      sessionId.current = entry.id;
      localStorage.setItem("luzia_session_id", entry.id);
      setMessages(
        allMessages.map((m) => ({
          role: m.role,
          content: m.content,
          time: new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        }))
      );
      setView("inicio");
    } catch (err) {
      setMessages([{ role: "assistant", content: `No pude cargar esa conversación (${err.message}).`, time: nowLabel() }]);
      setView("inicio");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text, time: nowLabel() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    if (nextMessages.length === 1) {
      rememberSession(sessionId.current, text.slice(0, 60));
      setHistoryList(getKnownSessions());
    }

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          userMessage: text,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `Error ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content, redirect: data.redirect, showOptions: data.showOptions, time: nowLabel() }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `No pude conectar con LuzIA (${err.message}).`, time: nowLabel() }]);
    } finally {
      setLoading(false);
    }
  }

  function triggerFileSelect() {
    fileInputRef.current && fileInputRef.current.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;

    const time = nowLabel();
    if (messages.length === 0) {
      rememberSession(sessionId.current, `📎 ${file.name}`);
      setHistoryList(getKnownSessions());
    }
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `📎 Factura adjunta: ${file.name}`, time },
      { role: "assistant", content: FACTURA_RECIBIDA_MSG, time },
    ]);

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Por ahora solo puedo leer facturas en imagen (JPG, PNG) o en PDF.", time: nowLabel() }]);
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("sessionId", sessionId.current);
      form.append("file", file);
      if (isPdf) {
        const pdfText = await extractPdfText(file);
        form.append("pdfText", pdfText);
      }
      const res = await fetch(`${API_BASE}/api/invoices`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error || `Error ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content, redirect: data.redirect, showOptions: data.showOptions, time: nowLabel() }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `No pude analizar el archivo (${err.message}). Puedes hablar directo con un asesor.`, redirect: "luz", time: nowLabel() }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="leaf"><img src={LOGO_SRC} alt="LuzIA" /></span>
          <span>LuzIA<span className="brand-tagline">Tu experta en energía</span></span>
        </div>
        <button className="new-chat-btn" onClick={newChat}><Icon name="plus" /> Nuevo chat</button>
        <nav className="nav">
          <div className={`nav-item ${view === "inicio" ? "active" : ""}`} onClick={() => setView("inicio")}>Inicio</div>
          <div className={`nav-item ${view === "historial" ? "active" : ""}`} onClick={() => setView("historial")}><Icon name="clock" /> Historial</div>
          <div className={`nav-item ${view === "soporte" ? "active" : ""}`} onClick={() => setView("soporte")}><Icon name="headset" /> Soporte</div>
        </nav>
        <div className="sidebar-footer">
          <h4>¿Necesitas ayuda?</h4>
          <p>Nuestro asistente está disponible 24/7 para ti.</p>
          <a className="support-btn" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"><Icon name="headset" /> Contactar soporte</a>
        </div>
      </aside>

      <main className="main">
        <div className="topbar"><div className="avatar">TU</div></div>

        {view === "inicio" && (
          <>
            <div className="chat-scroll" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="hero">
                  <div className="leaf-badge"><img src={LOGO_SRC} alt="LuzIA" /></div>
                  <h1>¡Hola! Soy tu asistente LuzIA ⚡</h1>
                  <p>¿Qué tal, encendemos una solución para tu luz hoy? Puedo ayudarte a entender tu factura, resolver tus dudas o comprobar si existe una oportunidad para ahorrar. Cuéntame, ¿en qué puedo ayudarte hoy?</p>
                </div>
              )}
              <div className="messages">
                {messages.map((m, i) => (
                  <div key={i} className={`msg-row ${m.role}`}>
                    {m.role === "assistant" && <div className="msg-avatar"><img src={LOGO_SRC} alt="LuzIA" /></div>}
                    <div>
                      <div className={`bubble ${m.role}`}>
                        {m.content}
                        {m.redirect && (
                          <div><a className="redirect-cta" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">💬 Hablar con un asesor por WhatsApp</a></div>
                        )}
                        {m.showOptions && (
                          <div className="options-cta-row">
                            <button className="redirect-cta" onClick={triggerFileSelect}>📎 Adjuntar mi factura</button>
                            <a className="redirect-cta" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">💬 Hablar con un asesor</a>
                          </div>
                        )}
                      </div>
                      <div className="msg-meta" style={{ textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="msg-row assistant">
                    <div className="msg-avatar"><img src={LOGO_SRC} alt="LuzIA" /></div>
                    <div className="bubble assistant"><div className="typing"><span></span><span></span><span></span></div></div>
                  </div>
                )}
              </div>
            </div>

            <div className="composer-wrap">
              <div className="composer">
                <button className="attach-btn" onClick={triggerFileSelect} title="Adjuntar factura"><Icon name="clip" /></button>
                <input type="file" ref={fileInputRef} accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFileSelected} />
                <textarea rows="1" placeholder="Escribe tu mensaje..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} />
                <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}><Icon name="send" /></button>
              </div>
            </div>

            <div className="products">
              <div className="products-inner">
                <div className="products-head"><h3>Productos a contratar</h3></div>
                <div className="products-grid">
                  <a className="product-card" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                    <div className="product-icon">💡</div>
                    <div><div className="name">Luz</div><div className="cta">Contratar ahora →</div></div>
                  </a>
                </div>
              </div>
            </div>
          </>
        )}

        {view === "historial" && (
          <div className="chat-scroll">
            <div className="panel">
              <h2>Historial de conversaciones</h2>
              <p className="panel-subtitle">Solo puedes ver tus propias conversaciones con LuzIA.</p>
              {historyLoading && <p>Cargando...</p>}
              {!historyLoading && historyList.length === 0 && (
                <div className="empty-state">Aún no tienes conversaciones guardadas. Escríbele a LuzIA y, cuando empieces un "Nuevo chat", esta quedará aquí.</div>
              )}
              {!historyLoading && historyList.length > 0 && (
                <div className="faq-list">
                  {historyList.map((h) => (
                    <div key={h.id} className="faq-item" style={{ cursor: "pointer" }} onClick={() => openHistorySession(h)}>
                      <div className="faq-question">
                        {h.label}
                        <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>
                          {new Date(h.date).toLocaleDateString("es-CO")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "soporte" && (
          <div className="chat-scroll">
            <div className="panel">
              <h2>Soporte</h2>
              <p className="panel-subtitle">Resuelve tus dudas más comunes o escríbenos directo por WhatsApp.</p>
              <div className="faq-list">
                {FAQS.map((f, i) => (
                  <div className="faq-item" key={i}>
                    <div className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>{f.q} <span>{openFaq === i ? "–" : "+"}</span></div>
                    {openFaq === i && <div className="faq-answer">{f.a}</div>}
                  </div>
                ))}
              </div>
              <a className="redirect-cta" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">💬 Escribir a soporte por WhatsApp</a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
