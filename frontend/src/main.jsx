import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  BellRing,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  FilePlus2,
  Files,
  History,
  LayoutDashboard,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import "./styles.css";

const API_BASE = "/api";
const RolesContext = createContext(null);

const documentTypes = ["Richtlinie", "Arbeitsanweisung", "Prozessbeschreibung", "Anleitung", "Formular", "Sonstiges"];
const statuses = ["Entwurf", "Aktiv", "In Prüfung", "Überarbeitung erforderlich", "Archiviert"];
const intervals = ["Monatlich", "Quartalsweise", "Halbjährlich", "Jährlich", "Benutzerdefiniert"];
const dueStates = ["Alle", "Fällig", "Überfällig", "Nicht fällig"];

function useRole() {
  return useContext(RolesContext);
}

async function api(path, options = {}, role = "Admin") {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-App-Role": role,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new Error(error.error || "Anfrage fehlgeschlagen");
  }
  if (response.status === 204) return null;
  return response.json();
}

function download(path) {
  window.open(`${API_BASE}${path}`, "_blank", "noopener,noreferrer");
}

function App() {
  const [role, setRole] = useState(localStorage.getItem("role") || "Admin");
  const roleValue = useMemo(() => {
    const canManage = role === "Admin";
    const canAudit = role === "Admin" || role === "Auditor";
    return { role, setRole, canManage, canAudit };
  }, [role]);

  useEffect(() => {
    localStorage.setItem("role", role);
  }, [role]);

  return (
    <RolesContext.Provider value={roleValue}>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/new" element={<DocumentForm />} />
            <Route path="/documents/:id" element={<DocumentDetail />} />
            <Route path="/documents/:id/edit" element={<DocumentForm />} />
            <Route path="/due" element={<DueAudits />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/history" element={<AuditHistory />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </RolesContext.Provider>
  );
}

function Shell({ children }) {
  const { role, setRole } = useRole();
  const nav = [
    ["/", LayoutDashboard, "Dashboard"],
    ["/documents", Files, "Dokumente"],
    ["/due", BellRing, "Fällige Audits"],
    ["/departments", Building2, "Abteilungen"],
    ["/history", History, "Audit-Historie"],
    ["/settings", Settings, "Admin"]
  ];
  return (
    <div className="app">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <ShieldCheck />
          <span>DocAudit</span>
        </Link>
        <nav>
          {nav.map(([to, Icon, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Dokumenten-Audits</p>
            <h1>Kontrolle externer Dokumentenlinks</h1>
          </div>
          <label className="role-switch">
            Rolle
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option>Admin</option>
              <option>Auditor</option>
              <option>Viewer</option>
            </select>
          </label>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}

function useApi(path, fallback) {
  const { role } = useRole();
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = async () => {
    try {
      setLoading(true);
      setData(await api(path, {}, role));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, [path, role]);
  return { data, loading, error, refresh, setData };
}

function Dashboard() {
  const stats = useApi("/dashboard/stats", null);
  const due = useApi("/dashboard/due-documents?limit=8", []);
  if (stats.loading) return <Loading />;
  return (
    <div className="stack">
      <div className="stats-grid">
        <StatCard icon={Files} label="Dokumentenlinks" value={stats.data.totalDocuments} />
        <StatCard icon={BellRing} label="Fällige Audits" value={stats.data.dueAudits} tone="warning" />
        <StatCard icon={Archive} label="Überfällige Audits" value={stats.data.overdueAudits} tone="danger" />
        <StatCard icon={CheckCircle2} label="Erledigt im Monat" value={stats.data.auditsThisMonth} tone="success" />
      </div>
      <div className="grid two">
        <Panel title="Dokumente nach Status">
          <MiniBars data={stats.data.byStatus} />
        </Panel>
        <Panel title="Dokumente nach Abteilung">
          <MiniBars data={stats.data.byDepartment} />
        </Panel>
      </div>
      <Panel title="Nächste fällige Dokumenten-Audits" actions={<Link className="button ghost" to="/due">Alle anzeigen</Link>}>
        <DocumentTable rows={due.data} compact />
      </Panel>
    </div>
  );
}

function DocumentsPage() {
  const { canManage } = useRole();
  const [filters, setFilters] = useState({ search: "", department_id: "", document_type: "", status: "", due_state: "Alle", sort: "next_audit_date", direction: "asc" });
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  const docs = useApi(`/documents?${query}`, []);
  const departments = useApi("/departments", []);
  return (
    <div className="stack">
      <div className="page-actions">
        <div>
          <h2>Dokumentenlinks</h2>
          <p>Externe Dokumente verwalten und Prüfzyklen nachhalten.</p>
        </div>
        <div className="actions">
          <button className="button secondary" onClick={() => download("/export/documents")}><Download size={17} /> CSV</button>
          {canManage && <Link className="button" to="/documents/new"><FilePlus2 size={17} /> Dokument anlegen</Link>}
        </div>
      </div>
      <Panel>
        <div className="filters">
          <label className="search-field"><Search size={17} /><input placeholder="Titel oder Beschreibung suchen" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
          <select value={filters.department_id} onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}><option value="">Alle Abteilungen</option>{departments.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select value={filters.document_type} onChange={(e) => setFilters({ ...filters, document_type: e.target.value })}><option value="">Alle Typen</option>{documentTypes.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Alle Status</option>{statuses.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={filters.due_state} onChange={(e) => setFilters({ ...filters, due_state: e.target.value })}>{dueStates.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
            <option value="next_audit_date">Sortierung: Nächstes Audit</option>
            <option value="title">Sortierung: Titel</option>
            <option value="department">Sortierung: Abteilung</option>
            <option value="status">Sortierung: Status</option>
            <option value="last_audit_date">Sortierung: Letztes Audit</option>
          </select>
        </div>
      </Panel>
      <Panel>
        {docs.error ? <Alert text={docs.error} /> : <DocumentTable rows={docs.data} />}
      </Panel>
    </div>
  );
}

function DocumentTable({ rows, compact = false }) {
  if (!rows?.length) return <Empty text="Keine Dokumente gefunden." />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Titel</th>
            {!compact && <th>Typ</th>}
            <th>Abteilung</th>
            <th>Status</th>
            <th>Fälligkeit</th>
            <th>Letztes Audit</th>
            <th>Nächstes Audit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((doc) => (
            <tr key={doc.id} className={doc.due_state === "Überfällig" ? "row-danger" : ""}>
              <td><Link className="table-title" to={`/documents/${doc.id}`}>{doc.title}</Link><small>{doc.responsible_person}</small></td>
              {!compact && <td>{doc.document_type}</td>}
              <td>{doc.department_name}</td>
              <td><StatusBadge value={doc.status} /></td>
              <td><DueBadge value={doc.due_state} /></td>
              <td>{formatDate(doc.last_audit_date)}</td>
              <td>{formatDate(doc.next_audit_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, canManage } = useRole();
  const departments = useApi("/departments", []);
  const isEdit = Boolean(id);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    external_url: "https://",
    document_type: "Richtlinie",
    department_id: "",
    responsible_person: "",
    status: "Entwurf",
    audit_interval_type: "Quartalsweise",
    audit_interval_days: "",
    last_audit_date: "",
    next_audit_date: ""
  });

  useEffect(() => {
    if (!isEdit) return;
    api(`/documents/${id}`, {}, role).then((data) => setForm({ ...data, department_id: String(data.department_id), audit_interval_days: data.audit_interval_days || "" })).catch((err) => setError(err.message));
  }, [id, isEdit, role]);

  if (!canManage) return <Alert text="Nur Admins dürfen Dokumente anlegen oder bearbeiten." />;

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, department_id: Number(form.department_id), audit_interval_days: form.audit_interval_days ? Number(form.audit_interval_days) : null };
      const saved = await api(isEdit ? `/documents/${id}` : "/documents", { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) }, role);
      setMessage("Dokument wurde gespeichert.");
      navigate(`/documents/${saved.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Panel title={isEdit ? "Dokument bearbeiten" : "Dokument anlegen"}>
      <FormMessage message={message} error={error} />
      <form className="form-grid" onSubmit={submit}>
        <Field label="Titel *"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Externer Link *"><input required value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} /></Field>
        <Field label="Beschreibung"><textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Abteilung *"><select required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}><option value="">Bitte wählen</option>{departments.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Dokumenttyp *"><select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>{documentTypes.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Status *"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statuses.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Verantwortliche Person *"><input required value={form.responsible_person} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} /></Field>
        <Field label="Audit-Intervall *"><select value={form.audit_interval_type} onChange={(e) => setForm({ ...form, audit_interval_type: e.target.value })}>{intervals.map((x) => <option key={x}>{x}</option>)}</select></Field>
        {form.audit_interval_type === "Benutzerdefiniert" && <Field label="Intervall in Tagen *"><input type="number" min="1" required value={form.audit_interval_days} onChange={(e) => setForm({ ...form, audit_interval_days: e.target.value })} /></Field>}
        <Field label="Letzte Prüfung"><input type="date" value={form.last_audit_date || ""} onChange={(e) => setForm({ ...form, last_audit_date: e.target.value })} /></Field>
        <Field label="Nächste Prüfung"><input type="date" value={form.next_audit_date || ""} onChange={(e) => setForm({ ...form, next_audit_date: e.target.value })} /></Field>
        <div className="form-actions"><button className="button" type="submit">Speichern</button><Link className="button ghost" to="/documents">Abbrechen</Link></div>
      </form>
    </Panel>
  );
}

function DocumentDetail() {
  const { id } = useParams();
  const { role, canManage, canAudit } = useRole();
  const document = useApi(`/documents/${id}`, null);
  const audits = useApi(`/documents/${id}/audits`, []);
  const [showAudit, setShowAudit] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (document.loading) return <Loading />;
  if (!document.data) return <Alert text={document.error || "Dokument nicht gefunden."} />;
  const doc = document.data;

  const archive = async () => {
    if (!confirm("Dokument archivieren?")) return;
    await api(`/documents/${id}`, { method: "DELETE" }, role);
    navigate("/documents");
  };

  return (
    <div className="stack">
      <div className="page-actions">
        <div>
          <h2>{doc.title}</h2>
          <p>{doc.description}</p>
        </div>
        <div className="actions">
          <a className="button secondary" href={doc.external_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /> Externe Datei</a>
          {canAudit && <button className="button" onClick={() => setShowAudit(true)}><ClipboardCheck size={17} /> Audit durchführen</button>}
          {canManage && <Link className="button ghost" to={`/documents/${id}/edit`}><Pencil size={17} /> Bearbeiten</Link>}
          {canManage && <button className="icon danger" title="Archivieren" onClick={archive}><Trash2 size={17} /></button>}
        </div>
      </div>
      {error && <Alert text={error} />}
      <div className="grid two">
        <Panel title="Stammdaten">
          <dl className="details">
            <dt>Status</dt><dd><StatusBadge value={doc.status} /></dd>
            <dt>Audit-Fälligkeit</dt><dd><DueBadge value={doc.due_state} /></dd>
            <dt>Dokumenttyp</dt><dd>{doc.document_type}</dd>
            <dt>Abteilung</dt><dd>{doc.department_name}</dd>
            <dt>Verantwortlich</dt><dd>{doc.responsible_person}</dd>
            <dt>Audit-Intervall</dt><dd>{doc.audit_interval_type}{doc.audit_interval_days ? ` (${doc.audit_interval_days} Tage)` : ""}</dd>
          </dl>
        </Panel>
        <Panel title="Prüftermine">
          <dl className="details">
            <dt>Letzte Prüfung</dt><dd>{formatDate(doc.last_audit_date)}</dd>
            <dt>Nächste Prüfung</dt><dd>{formatDate(doc.next_audit_date)}</dd>
            <dt>Erstellt</dt><dd>{formatDateTime(doc.created_at)}</dd>
            <dt>Geändert</dt><dd>{formatDateTime(doc.updated_at)}</dd>
          </dl>
        </Panel>
      </div>
      {showAudit && <AuditModal document={doc} onClose={() => setShowAudit(false)} onSaved={() => { setShowAudit(false); document.refresh(); audits.refresh(); }} setError={setError} />}
      <Panel title="Audit-Historie" actions={<button className="button secondary" onClick={() => download(`/export/documents/${id}/audits`)}><Download size={17} /> CSV</button>}>
        <AuditTable rows={audits.data} />
      </Panel>
    </div>
  );
}

function AuditModal({ document, onClose, onSaved, setError }) {
  const { role } = useRole();
  const [form, setForm] = useState({ result: "In Ordnung", comment: "", new_status: "", new_next_audit_date: "", auditor_name: "" });
  const submit = async (event) => {
    event.preventDefault();
    try {
      await api(`/documents/${document.id}/audits`, { method: "POST", body: JSON.stringify(form) }, role);
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h3>Audit durchführen</h3>
          <button className="icon" title="Schließen" onClick={onClose}><X size={17} /></button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Ergebnis *"><select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}><option>In Ordnung</option><option>Anpassung erforderlich</option><option>Nicht mehr relevant</option></select></Field>
          <Field label="Prüfername *"><input required value={form.auditor_name} onChange={(e) => setForm({ ...form, auditor_name: e.target.value })} /></Field>
          <Field label="Optionaler neuer Status"><select value={form.new_status} onChange={(e) => setForm({ ...form, new_status: e.target.value })}><option value="">Status beibehalten</option>{statuses.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Optionales nächstes Prüfdatum"><input type="date" value={form.new_next_audit_date} onChange={(e) => setForm({ ...form, new_next_audit_date: e.target.value })} /></Field>
          <Field label="Kommentar"><textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></Field>
          <p className="hint">Prüfdatum wird automatisch auf heute gesetzt.</p>
          <div className="form-actions"><button className="button" type="submit">Audit abschließen</button><button className="button ghost" type="button" onClick={onClose}>Abbrechen</button></div>
        </form>
      </div>
    </div>
  );
}

function DueAudits() {
  const due = useApi("/dashboard/due-documents", []);
  return (
    <div className="stack">
      <div className="page-actions">
        <div><h2>Fällige Audits</h2><p>Vorbereitete Ansicht für spätere Benachrichtigungen.</p></div>
      </div>
      <Panel>{due.error ? <Alert text={due.error} /> : <DocumentTable rows={due.data} />}</Panel>
    </div>
  );
}

function Departments() {
  const { role, canManage } = useRole();
  const departments = useApi("/departments", []);
  const [form, setForm] = useState({ name: "", description: "", responsible_person: "" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api(editing ? `/departments/${editing}` : "/departments", { method: editing ? "PUT" : "POST", body: JSON.stringify(form) }, role);
      setForm({ name: "", description: "", responsible_person: "" });
      setEditing(null);
      setMessage("Abteilung wurde gespeichert.");
      departments.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    try {
      await api(`/departments/${id}`, { method: "DELETE" }, role);
      departments.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="grid two align-start">
      <Panel title="Abteilungen">
        {departments.data.map((department) => (
          <div className="list-item" key={department.id}>
            <div><strong>{department.name}</strong><p>{department.description}</p><small>{department.responsible_person}</small></div>
            {canManage && <div className="row-actions"><button className="icon" onClick={() => { setEditing(department.id); setForm(department); }}><Pencil size={16} /></button><button className="icon danger" onClick={() => remove(department.id)}><Trash2 size={16} /></button></div>}
          </div>
        ))}
      </Panel>
      <Panel title={editing ? "Abteilung bearbeiten" : "Abteilung anlegen"}>
        <FormMessage message={message} error={error} />
        {!canManage ? <Alert text="Nur Admins dürfen Abteilungen verwalten." /> : (
          <form className="form-grid single" onSubmit={submit}>
            <Field label="Name *"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Beschreibung"><textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Kontaktperson"><input value={form.responsible_person || ""} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} /></Field>
            <div className="form-actions"><button className="button" type="submit">Speichern</button>{editing && <button type="button" className="button ghost" onClick={() => { setEditing(null); setForm({ name: "", description: "", responsible_person: "" }); }}>Neu</button>}</div>
          </form>
        )}
      </Panel>
    </div>
  );
}

function AuditHistory() {
  const audits = useApi("/audits", []);
  return (
    <div className="stack">
      <div className="page-actions">
        <div><h2>Audit-Historie</h2><p>Vollständige Nachverfolgung abgeschlossener Prüfungen.</p></div>
        <button className="button secondary" onClick={() => download("/export/audits")}><Download size={17} /> CSV exportieren</button>
      </div>
      <Panel><AuditTable rows={audits.data} showDocument /></Panel>
    </div>
  );
}

function SettingsPage() {
  const { role } = useRole();
  return (
    <div className="grid two align-start">
      <Panel title="Rollen & Zugriff">
        <p className="plain">Aktive MVP-Rolle: <strong>{role}</strong></p>
        <MiniBars data={{ Admin: role === "Admin" ? 1 : 0, Auditor: role === "Auditor" ? 1 : 0, Viewer: role === "Viewer" ? 1 : 0 }} />
      </Panel>
      <Panel title="Produktive Nutzung vorbereitet">
        <ul className="check-list">
          <li>Umgebungsvariablen für Port, Datenbank und Mailkonfiguration</li>
          <li>Rollenheader als Vorbereitung für echtes Login</li>
          <li>Archivieren statt hartem Löschen von Dokumenten</li>
          <li>CSV-Exports für Dokumente und Audit-Historie</li>
          <li>Service-Platzhalter für spätere Mailbenachrichtigung</li>
        </ul>
      </Panel>
    </div>
  );
}

function AuditTable({ rows, showDocument = false }) {
  if (!rows?.length) return <Empty text="Noch keine Audit-Einträge vorhanden." />;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{showDocument && <th>Dokument</th>}<th>Prüfdatum</th><th>Prüfer</th><th>Ergebnis</th><th>Status</th><th>Nächstes Audit</th><th>Kommentar</th></tr></thead>
        <tbody>
          {rows.map((audit) => (
            <tr key={audit.id}>
              {showDocument && <td><Link className="table-title" to={`/documents/${audit.document_id}`}>{audit.document_title}</Link></td>}
              <td>{formatDate(audit.audit_date)}</td>
              <td>{audit.auditor_name}</td>
              <td><ResultBadge value={audit.result} /></td>
              <td>{audit.old_status || "-"} -> {audit.new_status || "-"}</td>
              <td>{formatDate(audit.old_next_audit_date)} -> {formatDate(audit.new_next_audit_date)}</td>
              <td>{audit.comment || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "" }) {
  return <div className={`stat-card ${tone}`}><Icon size={22} /><span>{label}</span><strong>{value}</strong></div>;
}

function Panel({ title, actions, children }) {
  return <section className="panel">{(title || actions) && <div className="panel-head"><h2>{title}</h2><div>{actions}</div></div>}{children}</section>;
}

function MiniBars({ data }) {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return <div className="bars">{entries.map(([label, value]) => <div key={label} className="bar-row"><span>{label}</span><div><i style={{ width: `${(value / max) * 100}%` }} /></div><b>{value}</b></div>)}</div>;
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function StatusBadge({ value }) {
  return <span className={`badge status-${slug(value)}`}>{value}</span>;
}

function DueBadge({ value }) {
  return <span className={`badge due-${slug(value)}`}>{value}</span>;
}

function ResultBadge({ value }) {
  return <span className={`badge result-${slug(value)}`}>{value}</span>;
}

function FormMessage({ message, error }) {
  return <>{message && <div className="success">{message}</div>}{error && <Alert text={error} />}</>;
}

function Alert({ text }) {
  return <div className="alert">{text}</div>;
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

function Loading() {
  return <div className="empty">Lade Daten...</div>;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("de-AT").format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value.replace(" ", "T")));
}

function slug(value = "") {
  return value.toLowerCase().replaceAll(" ", "-").replaceAll("ü", "ue").replaceAll("ä", "ae").replaceAll("ö", "oe");
}

createRoot(document.getElementById("root")).render(<App />);
