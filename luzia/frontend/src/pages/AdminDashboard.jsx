import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("conversations");
  const [conversations, setConversations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [openConv, setOpenConv] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/admin/login");
      } else {
        setSession(data.session);
      }
      setChecking(false);
    });
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tab]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const token = session.access_token;
      const endpoint = tab === "conversations" ? "conversations" : "invoices";
      const res = await fetch(`${API_BASE}/api/admin/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || `Error ${res.status}`);
      const data = await res.json();
      if (tab === "conversations") setConversations(data);
      else setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  if (checking) return null;

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <div className="admin-title">Panel de LuzIA</div>
        <button className="btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
      </div>

      <div className="admin-body">
        <div className="admin-tabs">
          <button className={`admin-tab ${tab === "conversations" ? "active" : ""}`} onClick={() => setTab("conversations")}>Conversaciones</button>
          <button className={`admin-tab ${tab === "invoices" ? "active" : ""}`} onClick={() => setTab("invoices")}>Facturas</button>
        </div>

        {loading && <p>Cargando...</p>}
        {error && <div className="login-error">{error}</div>}

        {!loading && tab === "conversations" && (
          conversations.length === 0 ? (
            <div className="empty-state">Todavía no hay conversaciones registradas.</div>
          ) : (
            conversations.map((c) => (
              <div className="conv-card" key={c.id}>
                <div className="conv-header" onClick={() => setOpenConv(openConv === c.id ? null : c.id)}>
                  <span className="session">Sesión {c.session_id.slice(0, 8)}…</span>
                  <span className="meta">{new Date(c.updated_at).toLocaleString("es-CO")} · {c.messages.length} mensajes</span>
                </div>
                {openConv === c.id && (
                  <div className="conv-messages">
                    {c.messages.map((m) => (
                      <div key={m.id} className={`conv-msg ${m.role}`}>
                        <strong>{m.role === "user" ? "Cliente" : "LuzIA"}:</strong> {m.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )
        )}

        {!loading && tab === "invoices" && (
          invoices.length === 0 ? (
            <div className="empty-state">Todavía no se ha adjuntado ninguna factura.</div>
          ) : (
            invoices.map((inv) => (
              <div className="invoice-card" key={inv.id}>
                <div className="top-row">
                  <span className="file-name">{inv.file_name}</span>
                  {inv.url && <a href={inv.url} target="_blank" rel="noopener noreferrer">Ver / descargar</a>}
                </div>
                <div className="meta" style={{ marginBottom: 8 }}>Sesión {inv.session_id.slice(0, 8)}… · {new Date(inv.created_at).toLocaleString("es-CO")}</div>
                {inv.analysis && <div className="analysis">{inv.analysis}</div>}
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
