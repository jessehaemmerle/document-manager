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
  LogOut,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  X
} from "lucide-react";
import "./styles.css";

const API_BASE = "/api";
const AuthContext = createContext(null);

const documentTypes = ["Richtlinie", "Arbeitsanweisung", "Prozessbeschreibung", "Anleitung", "Formular", "Sonstiges"];
const statuses = ["Entwurf", "Aktiv", "In Prüfung", "Überarbeitung erforderlich", "Archiviert"];
const intervals = ["Monatlich", "Quartalsweise", "Halbjährlich", "Jährlich", "Benutzerdefiniert"];
const dueStates = ["Alle", "Fällig", "Überfällig", "Nicht fällig"];
const userRoles = ["Admin", "Führungskraft", "Mitarbeiter"];

function useRole() {
  return useContext(AuthContext);
}

async function api(path, options = {}) {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

async function download(path) {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Export fehlgeschlagen" }));
    alert(error.error || "Export fehlgeschlagen");
    return;
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = match?.[1] || "export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("authToken") || "");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      return;
    }
    api("/auth/me")
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("authToken");
        setToken("");
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, [token]);

  const authValue = useMemo(() => {
    const role = user?.app_role || "";
    return {
      user,
      token,
      role,
      canManage: role === "Admin",
      canEditDocuments: role === "Admin" || role === "Führungskraft",
      canAudit: Boolean(user),
      login: ({ token: nextToken, user: nextUser }) => {
        localStorage.setItem("authToken", nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      logout: () => {
        localStorage.removeItem("authToken");
        setToken("");
        setUser(null);
      }
    };
  }, [token, user]);

  if (authLoading) return <Loading />;
  if (!user) return <AuthContext.Provider value={authValue}><LoginPage /></AuthContext.Provider>;

  return (
    <AuthContext.Provider value={authValue}>
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
            <Route path="/users" element={<UsersPage />} />
            <Route path="/history" element={<AuditHistory />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

function Shell({ children }) {
  const { user, logout, canManage } = useRole();
  const nav = [
    ["/", LayoutDashboard, "Dashboard"],
    ["/documents", Files, "Dokumente"],
    ["/due", BellRing, "Fällige Audits"],
    ["/departments", Building2, "Abteilungen"],
    ...(canManage ? [["/users", Users, "Benutzer"]] : []),
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
            Angemeldet
            <div className="user-chip">
              <span>{user.full_name}</span>
              <RoleBadge value={user.app_role} />
              <button className="icon" title="Abmelden" onClick={logout}><LogOut size={17} /></button>
            </div>
          </label>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}

function LoginPage() {
  const { login } = useRole();
  const [form, setForm] = useState({ email: "miriam.keller@example.com", password: "demo123" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = await api("/auth/login", { method: "POST", body: JSON.stringify(form) });
      login(result);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-screen">
      <section className="login-panel">
        <div className="brand login-brand"><ShieldCheck /><span>DocAudit</span></div>
        <h1>Anmelden</h1>
        <p>Demo-Passwort für Seed-Benutzer: <strong>demo123</strong></p>
        <FormMessage error={error} />
        <form className="form-grid single" onSubmit={submit}>
          <Field label="E-Mail"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Passwort"><input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <div className="login-hints">
            <button type="button" onClick={() => setForm({ email: "miriam.keller@example.com", password: "demo123" })}>Admin</button>
            <button type="button" onClick={() => setForm({ email: "anna.leitner@example.com", password: "demo123" })}>Führungskraft</button>
            <button type="button" onClick={() => setForm({ email: "sophie.audit@example.com", password: "demo123" })}>Mitarbeiter</button>
          </div>
          <button className="button" type="submit">Einloggen</button>
        </form>
      </section>
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
        <StatCard icon={Users} label="Aktive Benutzer" value={stats.data.activeUsers} />
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
  const { canEditDocuments } = useRole();
  const [filters, setFilters] = useState({ search: "", department_id: "", audit_department_id: "", document_type: "", status: "", due_state: "Alle", sort: "next_audit_date", direction: "asc" });
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
          {canEditDocuments && <Link className="button" to="/documents/new"><FilePlus2 size={17} /> Dokument anlegen</Link>}
        </div>
      </div>
      <Panel>
        <div className="filters">
          <label className="search-field"><Search size={17} /><input placeholder="Titel oder Beschreibung suchen" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
          <select value={filters.department_id} onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}><option value="">Alle Abteilungen</option>{departments.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select value={filters.audit_department_id} onChange={(e) => setFilters({ ...filters, audit_department_id: e.target.value })}><option value="">Alle Audit-Abteilungen</option>{departments.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
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
            {!compact && <th>Audit</th>}
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
              {!compact && <td>{doc.audit_department_name || doc.department_name}<small>{doc.assigned_user_name || "Nicht persönlich zugewiesen"}</small></td>}
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
  const { role, user, canManage, canEditDocuments } = useRole();
  const departments = useApi("/departments", []);
  const users = useApi(canManage ? "/users" : "/auth/me", []);
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
    audit_department_id: "",
    assigned_user_id: "",
    last_audit_date: "",
    next_audit_date: ""
  });

  useEffect(() => {
    if (!isEdit) return;
    api(`/documents/${id}`, {}, role).then((data) => setForm({
      ...data,
      department_id: String(data.department_id),
      audit_department_id: data.audit_department_id ? String(data.audit_department_id) : "",
      assigned_user_id: data.assigned_user_id ? String(data.assigned_user_id) : "",
      audit_interval_days: data.audit_interval_days || ""
    })).catch((err) => setError(err.message));
  }, [id, isEdit, role]);

  if (!canEditDocuments) return <Alert text="Nur Admins und Führungskräfte dürfen Dokumente anlegen oder bearbeiten." />;

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        department_id: canManage ? Number(form.department_id) : Number(user.department_id),
        audit_department_id: canManage ? (form.audit_department_id ? Number(form.audit_department_id) : null) : Number(user.department_id),
        assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null,
        audit_interval_days: form.audit_interval_days ? Number(form.audit_interval_days) : null
      };
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
        <Field label="Abteilung *"><select required disabled={!canManage} value={canManage ? form.department_id : user.department_id || ""} onChange={(e) => setForm({ ...form, department_id: e.target.value })}><option value="">Bitte wählen</option>{departments.data.filter((d) => canManage || Number(d.id) === Number(user.department_id)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Audit-Abteilung"><select disabled={!canManage} value={canManage ? (form.audit_department_id || "") : user.department_id || ""} onChange={(e) => setForm({ ...form, audit_department_id: e.target.value })}><option value="">Wie Dokumentabteilung</option>{departments.data.filter((d) => canManage || Number(d.id) === Number(user.department_id)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Persönlich zugewiesen"><select value={form.assigned_user_id || ""} onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })}><option value="">Keine persönliche Zuweisung</option>{users.data.filter((listedUser) => listedUser.is_active && (canManage || Number(listedUser.department_id) === Number(user.department_id))).map((listedUser) => <option key={listedUser.id} value={listedUser.id}>{listedUser.full_name} · {listedUser.department_name || "ohne Abteilung"}</option>)}</select></Field>
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
  const { role, canManage, canEditDocuments, canAudit } = useRole();
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
          {canEditDocuments && <Link className="button ghost" to={`/documents/${id}/edit`}><Pencil size={17} /> Bearbeiten</Link>}
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
            <dt>Audit-Abteilung</dt><dd>{doc.audit_department_name || doc.department_name}</dd>
            <dt>Zugewiesen an</dt><dd>{doc.assigned_user_name || "Nicht persönlich zugewiesen"}</dd>
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
  const { role, user } = useRole();
  const [form, setForm] = useState({ result: "In Ordnung", comment: "", new_status: "", new_next_audit_date: "", auditor_name: user?.full_name || "" });
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
  const users = useApi(canManage ? "/users" : "/auth/me", []);
  const [form, setForm] = useState({ name: "", description: "", responsible_person: "", supervisor_user_id: "" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api(editing ? `/departments/${editing}` : "/departments", { method: editing ? "PUT" : "POST", body: JSON.stringify(form) }, role);
      setForm({ name: "", description: "", responsible_person: "", supervisor_user_id: "" });
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
            <div>
              <strong>{department.name}</strong>
              <p>{department.description}</p>
              <small>{department.member_count || 0} Benutzer · Vorgesetzter: {department.supervisor_name || department.responsible_person || "-"}</small>
            </div>
            {canManage && <div className="row-actions"><button className="icon" onClick={() => { setEditing(department.id); setForm({ ...department, supervisor_user_id: department.supervisor_user_id || "" }); }}><Pencil size={16} /></button><button className="icon danger" onClick={() => remove(department.id)}><Trash2 size={16} /></button></div>}
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
            <Field label="Vorgesetzter">
              <select value={form.supervisor_user_id || ""} onChange={(e) => setForm({ ...form, supervisor_user_id: e.target.value })}>
                <option value="">Nicht zugewiesen</option>
                {users.data.filter((user) => user.is_active).map((user) => <option key={user.id} value={user.id}>{user.full_name} · {user.department_name || "ohne Abteilung"}</option>)}
              </select>
            </Field>
            <div className="form-actions"><button className="button" type="submit">Speichern</button>{editing && <button type="button" className="button ghost" onClick={() => { setEditing(null); setForm({ name: "", description: "", responsible_person: "", supervisor_user_id: "" }); }}>Neu</button>}</div>
          </form>
        )}
      </Panel>
    </div>
  );
}

function UsersPage() {
  const { role, canManage } = useRole();
  const departments = useApi("/departments", []);
  const [filters, setFilters] = useState({ search: "", department_id: "", app_role: "" });
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  const users = useApi(`/users?${query}`, []);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyUserForm());
  const [reassignment, setReassignment] = useState(null);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyUserForm());
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        department_id: form.department_id ? Number(form.department_id) : null,
        manager_id: form.manager_id ? Number(form.manager_id) : null,
        is_active: Boolean(form.is_active)
      };
      await api(editing ? `/users/${editing}` : "/users", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) }, role);
      setMessage("Benutzer wurde gespeichert.");
      resetForm();
      users.refresh();
      departments.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const deactivate = async (id) => {
    try {
      const target = users.data.find((user) => user.id === id) || { id, full_name: "Benutzer" };
      const assignedDocuments = await api(`/users/${id}/assigned-documents`);
      if (assignedDocuments.length) {
        setReassignment({ user: target, documents: assignedDocuments, replacement_user_id: "" });
        return;
      }
      if (!confirm("Benutzer deaktivieren?")) return;
      await api(`/users/${id}`, { method: "DELETE" }, role);
      setMessage("Benutzer wurde deaktiviert.");
      await users.refresh();
      await departments.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmReassignment = async () => {
    try {
      if (!reassignment?.replacement_user_id) {
        alert("Bitte einen Ersatzbenutzer auswählen.");
        return;
      }
      await api(`/users/${reassignment.user.id}`, {
        method: "DELETE",
        body: JSON.stringify({ replacement_user_id: Number(reassignment.replacement_user_id) })
      }, role);
      setMessage("Zugewiesene Dokumente wurden übertragen und der Benutzer wurde deaktiviert.");
      setReassignment(null);
      await users.refresh();
      await departments.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const selectUser = (user) => {
    setEditing(user.id);
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      app_role: user.app_role,
      job_title: user.job_title || "",
      department_id: user.department_id || "",
      manager_id: user.manager_id || "",
      password: "",
      is_active: Boolean(user.is_active)
    });
  };

  const activeUsers = users.data.filter((user) => user.is_active && user.id !== editing);

  return (
    <div className="stack">
      <div className="page-actions">
        <div>
          <h2>Benutzerverwaltung</h2>
          <p>Benutzer, Rollen, Abteilungszuordnung und Vorgesetzte verwalten.</p>
        </div>
        <button className="button secondary" onClick={() => download("/export/users")}><Download size={17} /> CSV</button>
      </div>

      <Panel>
        <div className="filters user-filters">
          <label className="search-field"><Search size={17} /><input placeholder="Name oder E-Mail suchen" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
          <select value={filters.department_id} onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}><option value="">Alle Abteilungen</option>{departments.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select value={filters.app_role} onChange={(e) => setFilters({ ...filters, app_role: e.target.value })}><option value="">Alle Rollen</option>{userRoles.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
      </Panel>

      <div className="grid two align-start users-layout">
        <Panel title="Benutzer">
          {users.error ? <Alert text={users.error} /> : <UsersTable rows={users.data} canManage={canManage} onEdit={selectUser} onDeactivate={deactivate} />}
        </Panel>

        <Panel title={editing ? "Benutzer bearbeiten" : "Benutzer anlegen"}>
          <FormMessage message={message} error={error} />
          {!canManage ? <Alert text="Nur Admins dürfen Benutzer verwalten." /> : (
            <form className="form-grid single" onSubmit={submit}>
              <div className="grid two">
                <Field label="Vorname *"><input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
                <Field label="Nachname *"><input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
              </div>
              <Field label="E-Mail *"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label={editing ? "Neues Passwort" : "Passwort *"}><input type="password" required={!editing} value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
              <div className="grid two">
                <Field label="Rolle *"><select value={form.app_role} onChange={(e) => setForm({ ...form, app_role: e.target.value })}>{userRoles.map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Funktion"><input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></Field>
              </div>
              <Field label="Abteilung"><select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}><option value="">Nicht zugewiesen</option>{departments.data.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field>
              <Field label="Vorgesetzter"><select value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}><option value="">Kein Vorgesetzter</option>{activeUsers.map((user) => <option key={user.id} value={user.id}>{user.full_name} · {user.department_name || "ohne Abteilung"}</option>)}</select></Field>
              <label className="toggle"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktiv</label>
              <div className="form-actions"><button className="button" type="submit">Speichern</button><button className="button ghost" type="button" onClick={resetForm}>Neu</button></div>
            </form>
          )}
        </Panel>
      </div>
      {reassignment && (
        <ReassignmentModal
          reassignment={reassignment}
          users={users.data}
          onChange={setReassignment}
          onCancel={() => setReassignment(null)}
          onConfirm={confirmReassignment}
        />
      )}
    </div>
  );
}

function ReassignmentModal({ reassignment, users, onChange, onCancel, onConfirm }) {
  const replacementUsers = users.filter((user) => user.is_active && user.id !== reassignment.user.id);
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h3>Dokumente neu zuweisen</h3>
          <button className="icon" title="Schließen" onClick={onCancel}><X size={17} /></button>
        </div>
        <p className="hint">
          {reassignment.user.full_name} hat noch {reassignment.documents.length} Dokumentenzuweisung(en). Wähle einen Ersatzbenutzer, bevor der Benutzer deaktiviert wird.
        </p>
        <Field label="Ersatzbenutzer *">
          <select value={reassignment.replacement_user_id} onChange={(event) => onChange({ ...reassignment, replacement_user_id: event.target.value })}>
            <option value="">Bitte auswählen</option>
            {replacementUsers.map((user) => <option key={user.id} value={user.id}>{user.full_name} · {user.department_name || "ohne Abteilung"}</option>)}
          </select>
        </Field>
        <div className="reassignment-list">
          {reassignment.documents.map((document) => (
            <div className="list-item" key={document.id}>
              <div>
                <strong>{document.title}</strong>
                <p>{document.audit_department_name || document.department_name}</p>
                <small>Nächstes Audit: {formatDate(document.next_audit_date)}</small>
              </div>
              <StatusBadge value={document.status} />
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button className="button ghost" type="button" onClick={onCancel}>Abbrechen</button>
          <button className="button" type="button" onClick={onConfirm}>Übertragen und deaktivieren</button>
        </div>
      </div>
    </div>
  );
}

function UsersTable({ rows, canManage, onEdit, onDeactivate }) {
  if (!rows?.length) return <Empty text="Keine Benutzer gefunden." />;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Rolle</th><th>Abteilung</th><th>Vorgesetzter</th><th>Status</th>{canManage && <th></th>}</tr></thead>
        <tbody>
          {rows.map((user) => (
            <tr key={user.id} className={!user.is_active ? "muted-row" : ""}>
              <td><strong>{user.full_name}</strong><small>{user.email}{user.job_title ? ` · ${user.job_title}` : ""}</small></td>
              <td><RoleBadge value={user.app_role} /></td>
              <td>{user.department_name || "-"}</td>
              <td>{user.manager_name || "-"}</td>
              <td>{user.is_active ? <span className="badge result-in-ordnung">Aktiv</span> : <span className="badge status-archiviert">Inaktiv</span>}</td>
              {canManage && <td><div className="row-actions"><button className="icon" title="Bearbeiten" onClick={() => onEdit(user)}><Pencil size={16} /></button><button className="icon danger" title="Deaktivieren" onClick={() => onDeactivate(user.id)}><Trash2 size={16} /></button></div></td>}
            </tr>
          ))}
        </tbody>
      </table>
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
  const { role, canManage } = useRole();
  const events = useApi(canManage ? "/notifications/events" : "/auth/me", []);
  const [notificationResult, setNotificationResult] = useState("");
  const runNotifications = async () => {
    try {
      const result = await api("/notifications/run", { method: "POST", body: JSON.stringify({}) });
      setNotificationResult(`${result.processedDocuments} Dokument(e) geprüft, ${result.results.filter((item) => item.sent).length} Mailereignis(se) erzeugt.`);
      events.refresh();
    } catch (err) {
      setNotificationResult(err.message);
    }
  };
  return (
    <div className="stack">
      <div className="grid two align-start">
      <Panel title="Rollen & Zugriff">
        <p className="plain">Aktive MVP-Rolle: <strong>{role}</strong></p>
        <MiniBars data={{ Admin: role === "Admin" ? 1 : 0, Führungskraft: role === "Führungskraft" ? 1 : 0, Mitarbeiter: role === "Mitarbeiter" ? 1 : 0 }} />
      </Panel>
      <Panel title="Produktive Nutzung vorbereitet">
        <ul className="check-list">
          <li>Umgebungsvariablen für Port, Datenbank und Mailkonfiguration</li>
          <li>Einfacher Login mit Token als Vorbereitung für zentrale Authentifizierung</li>
          <li>Archivieren statt hartem Löschen von Dokumenten</li>
          <li>CSV-Exports für Dokumente und Audit-Historie</li>
          <li>Automatische Mailbenachrichtigung mit Eskalationsstufen</li>
        </ul>
      </Panel>
      </div>
      {canManage && (
        <Panel title="Mailbenachrichtigungen" actions={<button className="button secondary" onClick={runNotifications}>Jetzt prüfen</button>}>
          {notificationResult && <div className="success">{notificationResult}</div>}
          <NotificationEvents rows={Array.isArray(events.data) ? events.data : []} />
        </Panel>
      )}
    </div>
  );
}

function NotificationEvents({ rows }) {
  if (!rows.length) return <Empty text="Noch keine Mailereignisse vorhanden." />;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Dokument</th><th>Stufe</th><th>Prüfdatum</th><th>Status</th><th>Empfänger</th><th>Gesendet</th></tr></thead>
        <tbody>
          {rows.map((event) => (
            <tr key={event.id}>
              <td>{event.document_title}</td>
              <td>{notificationStageLabel(event.stage)}</td>
              <td>{formatDate(event.due_date)}</td>
              <td><span className={`badge delivery-${event.delivery_status}`}>{event.delivery_status}</span></td>
              <td>{formatRecipients(event.recipients)}</td>
              <td>{formatDateTime(event.sent_at || event.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function emptyUserForm() {
  return {
    first_name: "",
    last_name: "",
    email: "",
    app_role: "Mitarbeiter",
    job_title: "",
    department_id: "",
    manager_id: "",
    password: "",
    is_active: true
  };
}

function RoleBadge({ value }) {
  return <span className={`badge role-${slugSafe(value)}`}>{value}</span>;
}

function StatusBadge({ value }) {
  return <span className={`badge status-${slugSafe(value)}`}>{value}</span>;
}

function DueBadge({ value }) {
  return <span className={`badge due-${slugSafe(value)}`}>{value}</span>;
}

function ResultBadge({ value }) {
  return <span className={`badge result-${slugSafe(value)}`}>{value}</span>;
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

function formatRecipients(value) {
  try {
    const recipients = JSON.parse(value || "[]");
    return recipients.map((recipient) => recipient.name || recipient.email).join(", ") || "-";
  } catch {
    return "-";
  }
}

function notificationStageLabel(stage) {
  const labels = {
    due: "Prüfdatum",
    plus_2_same_status: "+2 Tage",
    plus_5_leadership: "+5 Tage Führungskraft"
  };
  return labels[stage] || stage;
}

function slug(value = "") {
  return value.toLowerCase().replaceAll(" ", "-").replaceAll("ü", "ue").replaceAll("ä", "ae").replaceAll("ö", "oe");
}

function slugSafe(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

createRoot(document.getElementById("root")).render(<App />);
