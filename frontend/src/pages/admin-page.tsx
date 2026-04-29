import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { AuditLog, Department, DocumentType, EmailTemplate, Role, RoleCode, SettingsItem, User } from '../types/api';

type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  roleCode: RoleCode;
  departmentId: string;
  active: boolean;
};

const initialUserForm: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  roleCode: 'employee',
  departmentId: '',
  active: true,
};

function toUserForm(entry: User): UserFormState {
  return {
    firstName: entry.firstName,
    lastName: entry.lastName,
    email: entry.email,
    username: entry.username,
    password: '',
    roleCode: entry.role.code,
    departmentId: entry.department?.id ?? '',
    active: entry.active,
  };
}

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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [newType, setNewType] = useState({ name: '', description: '' });
  const [newUser, setNewUser] = useState<UserFormState>(initialUserForm);
  const [editUser, setEditUser] = useState<UserFormState>(initialUserForm);

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
    try {
      await api('/departments', { method: 'POST', token, body: JSON.stringify(newDepartment) });
      setNewDepartment({ name: '', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Abteilung konnte nicht angelegt werden.');
    }
  };

  const createType = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    try {
      await api('/document-types', { method: 'POST', token, body: JSON.stringify(newType) });
      setNewType({ name: '', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dokumenttyp konnte nicht angelegt werden.');
    }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    try {
      await api('/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          username: newUser.username,
          password: newUser.password,
          roleCode: newUser.roleCode,
          departmentId: newUser.departmentId || undefined,
        }),
      });
      setNewUser(initialUserForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benutzer konnte nicht angelegt werden.');
    }
  };

  const startEditingUser = (entry: User) => {
    setEditingUserId(entry.id);
    setEditUser(toUserForm(entry));
    setError(null);
  };

  const cancelEditingUser = () => {
    setEditingUserId(null);
    setEditUser(initialUserForm);
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !editingUserId) return;

    try {
      await api(`/users/${editingUserId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          firstName: editUser.firstName,
          lastName: editUser.lastName,
          email: editUser.email,
          username: editUser.username,
          password: editUser.password.trim() || undefined,
          roleCode: editUser.roleCode,
          departmentId: editUser.departmentId || null,
          active: editUser.active,
        }),
      });
      cancelEditingUser();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benutzer konnte nicht gespeichert werden.');
    }
  };

  const deleteUser = async (entry: User) => {
    if (!token) return;
    if (entry.id === user?.id) {
      setError('Das eigene Administrationskonto kann hier nicht geloescht werden.');
      return;
    }

    const confirmed = window.confirm(`Soll ${entry.firstName} ${entry.lastName} wirklich geloescht werden?`);
    if (!confirmed) return;

    try {
      await api(`/users/${entry.id}`, { method: 'DELETE', token });
      if (editingUserId === entry.id) {
        cancelEditingUser();
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benutzer konnte nicht geloescht werden.');
    }
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
    return <section className="card page-panel">Der Admin-Bereich ist nur fuer Administratoren sichtbar.</section>;
  }

  return (
    <section className="page-grid">
      {error && <div className="error-box">{error}</div>}
      <article className="card page-panel">
        <span className="eyebrow">Benutzer</span>
        <h2>Benutzeruebersicht</h2>
        <form className="form-grid user-form" onSubmit={createUser}>
          <input required placeholder="Vorname" value={newUser.firstName} onChange={(event) => setNewUser((current) => ({ ...current, firstName: event.target.value }))} />
          <input required placeholder="Nachname" value={newUser.lastName} onChange={(event) => setNewUser((current) => ({ ...current, lastName: event.target.value }))} />
          <input required type="email" placeholder="E-Mail" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} />
          <input required placeholder="Benutzername" value={newUser.username} onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))} />
          <input required minLength={8} type="password" placeholder="Passwort" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} />
          <select value={newUser.roleCode} onChange={(event) => setNewUser((current) => ({ ...current, roleCode: event.target.value as RoleCode }))}>
            {roles.map((role) => (
              <option key={role.id} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>
          <select value={newUser.departmentId} onChange={(event) => setNewUser((current) => ({ ...current, departmentId: event.target.value }))}>
            <option value="">Abteilung waehlen</option>
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
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    {entry.firstName} {entry.lastName}
                  </td>
                  <td>{entry.role.name}</td>
                  <td>{entry.department?.name || '-'}</td>
                  <td>{entry.active ? 'Aktiv' : 'Inaktiv'}</td>
                  <td>
                    <div className="action-row">
                      <button type="button" className="secondary-button" onClick={() => startEditingUser(entry)}>
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="secondary-button danger-button"
                        onClick={() => void deleteUser(entry)}
                        disabled={entry.id === user?.id}
                        title={entry.id === user?.id ? 'Das eigene Konto kann nicht geloescht werden.' : undefined}
                      >
                        Loeschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editingUserId && (
          <form className="form-grid user-form edit-user-form" onSubmit={saveUser}>
            <h3 className="full-span">Benutzer bearbeiten</h3>
            <input required placeholder="Vorname" value={editUser.firstName} onChange={(event) => setEditUser((current) => ({ ...current, firstName: event.target.value }))} />
            <input required placeholder="Nachname" value={editUser.lastName} onChange={(event) => setEditUser((current) => ({ ...current, lastName: event.target.value }))} />
            <input required type="email" placeholder="E-Mail" value={editUser.email} onChange={(event) => setEditUser((current) => ({ ...current, email: event.target.value }))} />
            <input required placeholder="Benutzername" value={editUser.username} onChange={(event) => setEditUser((current) => ({ ...current, username: event.target.value }))} />
            <input minLength={8} type="password" placeholder="Neues Passwort (optional)" value={editUser.password} onChange={(event) => setEditUser((current) => ({ ...current, password: event.target.value }))} />
            <select value={editUser.roleCode} onChange={(event) => setEditUser((current) => ({ ...current, roleCode: event.target.value as RoleCode }))}>
              {roles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
            <select value={editUser.departmentId} onChange={(event) => setEditUser((current) => ({ ...current, departmentId: event.target.value }))}>
              <option value="">Abteilung waehlen</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <label className="checkbox-row">
              <input type="checkbox" checked={editUser.active} onChange={(event) => setEditUser((current) => ({ ...current, active: event.target.checked }))} />
              Benutzer ist aktiv
            </label>
            <div className="button-row full-span">
              <button className="primary-button" type="submit">
                Aenderungen speichern
              </button>
              <button className="secondary-button" type="button" onClick={cancelEditingUser}>
                Abbrechen
              </button>
            </div>
          </form>
        )}
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
                {entry.entityType} - {entry.entityId}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
