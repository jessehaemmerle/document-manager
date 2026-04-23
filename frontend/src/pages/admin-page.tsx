import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { AuditLog, Department, DocumentType, EmailTemplate, Role, SettingsItem, User } from '../types/api';

export function AdminPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [settings, setSettings] = useState<SettingsItem[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [audit, setAudit] = useState<{ items: AuditLog[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [newType, setNewType] = useState({ name: '', description: '' });
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    roleCode: 'employee',
    departmentId: '',
  });

  const isAdmin = user?.role.code === 'admin';

  const load = async () => {
    if (!token || !isAdmin) return;
    try {
      const [allUsers, allDepartments, allTypes, roleItems, allSettings, allTemplates, auditLog] = await Promise.all([
        api<User[]>('/users', { token }),
        api<Department[]>('/departments', { token }),
        api<DocumentType[]>('/document-types', { token }),
        api<Role[]>('/users/roles', { token }),
        api<SettingsItem[]>('/settings', { token }),
        api<EmailTemplate[]>('/settings/email-templates', { token }),
        api<{ items: AuditLog[] }>('/audit?pageSize=12', { token }),
      ]);
      setUsers(allUsers);
      setDepartments(allDepartments);
      setTypes(allTypes);
      setRoles(roleItems);
      setSettings(allSettings);
      setTemplates(allTemplates);
      setAudit(auditLog);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin-Daten konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    void load();
  }, [token, isAdmin]);

  const createDepartment = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    await api('/departments', { method: 'POST', token, body: JSON.stringify(newDepartment) });
    setNewDepartment({ name: '', description: '' });
    await load();
  };

  const createType = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    await api('/document-types', { method: 'POST', token, body: JSON.stringify(newType) });
    setNewType({ name: '', description: '' });
    await load();
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    await api('/users', { method: 'POST', token, body: JSON.stringify(newUser) });
    setNewUser({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      roleCode: 'employee',
      departmentId: '',
    });
    await load();
  };

  const exportAudit = async () => {
    if (!token) return;
    const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/audit/export.csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-log.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return <section className="card page-panel">Der Admin-Bereich ist nur für Administratoren sichtbar.</section>;
  }

  return (
    <section className="page-grid">
      {error && <div className="error-box">{error}</div>}
      <article className="card page-panel">
        <span className="eyebrow">Benutzer</span>
        <h2>Benutzerübersicht</h2>
        <form className="form-grid user-form" onSubmit={createUser}>
          <input required placeholder="Vorname" value={newUser.firstName} onChange={(event) => setNewUser((current) => ({ ...current, firstName: event.target.value }))} />
          <input required placeholder="Nachname" value={newUser.lastName} onChange={(event) => setNewUser((current) => ({ ...current, lastName: event.target.value }))} />
          <input required type="email" placeholder="E-Mail" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} />
          <input required placeholder="Benutzername" value={newUser.username} onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))} />
          <input required minLength={8} type="password" placeholder="Passwort" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} />
          <select value={newUser.roleCode} onChange={(event) => setNewUser((current) => ({ ...current, roleCode: event.target.value }))}>
            {roles.map((role) => (
              <option key={role.id} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>
          <select value={newUser.departmentId} onChange={(event) => setNewUser((current) => ({ ...current, departmentId: event.target.value }))}>
            <option value="">Abteilung wählen</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <button className="primary-button">Benutzer anlegen</button>
        </form>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Rolle</th>
                <th>Abteilung</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    {entry.firstName} {entry.lastName}
                  </td>
                  <td>{entry.role.name}</td>
                  <td>{entry.department?.name || '—'}</td>
                  <td>{entry.active ? 'Aktiv' : 'Inaktiv'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card page-panel">
        <span className="eyebrow">Stammdaten</span>
        <h2>Abteilungen und Dokumenttypen</h2>
        <div className="split-grid">
          <form className="form-grid" onSubmit={createDepartment}>
            <h3>Abteilung anlegen</h3>
            <input required placeholder="Name" value={newDepartment.name} onChange={(event) => setNewDepartment((current) => ({ ...current, name: event.target.value }))} />
            <textarea placeholder="Beschreibung" rows={3} value={newDepartment.description} onChange={(event) => setNewDepartment((current) => ({ ...current, description: event.target.value }))} />
            <button className="primary-button">Speichern</button>
          </form>
          <form className="form-grid" onSubmit={createType}>
            <h3>Dokumenttyp anlegen</h3>
            <input required placeholder="Name" value={newType.name} onChange={(event) => setNewType((current) => ({ ...current, name: event.target.value }))} />
            <textarea placeholder="Beschreibung" rows={3} value={newType.description} onChange={(event) => setNewType((current) => ({ ...current, description: event.target.value }))} />
            <button className="primary-button">Speichern</button>
          </form>
        </div>
        <div className="split-grid">
          <div>
            <h3>Abteilungen</h3>
            <div className="stack-list compact-list">
              {departments.map((entry) => (
                <div key={entry.id} className="list-card">
                  <strong>{entry.name}</strong>
                  <p>{entry.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3>Dokumenttypen</h3>
            <div className="stack-list compact-list">
              {types.map((entry) => (
                <div key={entry.id} className="list-card">
                  <strong>{entry.name}</strong>
                  <p>{entry.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

      <article className="card page-panel">
        <span className="eyebrow">Einstellungen</span>
        <h2>System- und E-Mail-Konfiguration</h2>
        <div className="stack-list compact-list">
          {settings.map((setting) => (
            <div key={setting.id} className="list-card">
              <strong>{setting.key}</strong>
              <p>{setting.value}</p>
            </div>
          ))}
          {templates.map((template) => (
            <div key={template.id} className="list-card">
              <strong>{template.subject}</strong>
              <p>{template.body}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="card page-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Audit-Log</span>
            <h2>Letzte Ereignisse</h2>
          </div>
          <button className="secondary-button" onClick={() => void exportAudit()}>
            CSV exportieren
          </button>
        </div>
        <div className="stack-list compact-list">
          {audit?.items.map((entry) => (
            <div key={entry.id} className="list-card">
              <strong>{entry.actionType}</strong>
              <span>{formatDate(entry.createdAt)}</span>
              <p>
                {entry.entityType} · {entry.entityId}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
