import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/status-badge';
import { useAuth } from '../context/auth-context';
import { api, buildQuery } from '../lib/api';
import { formatDate } from '../lib/format';
import type { Department, DocumentItem, DocumentType, Paginated, User } from '../types/api';

const initialForm = {
  title: '',
  description: '',
  documentTypeId: '',
  linkUrl: '',
  sourceType: 'weblink',
  departmentId: '',
  responsibleUserId: '',
  reviewIntervalType: 'monatlich',
  reviewIntervalDays: '30',
  nextReviewAt: new Date().toISOString().slice(0, 16),
  multiStageApprovalEnabled: false,
  reminderAfterHours: '24',
  escalationAfterHours: '48',
};

export function DocumentsPage() {
  const { token, user } = useAuth();
  const [documents, setDocuments] = useState<Paginated<DocumentItem> | null>(null);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({ search: '', active: '', status: '', documentTypeId: '', departmentId: '' });
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isManager = user?.role.code === 'manager';
  const isAdmin = user?.role.code === 'admin';

  const load = async () => {
    if (!token) return;
    try {
      const [docs, docTypes, depts, allUsers] = await Promise.all([
        api<Paginated<DocumentItem>>(`/documents${buildQuery(filters)}`, { token }),
        api<DocumentType[]>('/document-types', { token }),
        api<Department[]>('/departments', { token }),
        api<User[]>('/users', { token }).catch(() => []),
      ]);
      setDocuments(docs);
      setTypes(docTypes);
      setDepartments(depts);
      setUsers(allUsers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dokumente konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    void load();
  }, [token, filters.search, filters.active, filters.status, filters.documentTypeId, filters.departmentId]);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      departmentId: user.department?.id ?? current.departmentId,
    }));
  }, [user]);

  const departmentOptions = useMemo(() => (isAdmin ? departments : departments.filter((dept) => dept.id === user?.department?.id)), [departments, isAdmin, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await api('/documents', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...form,
          responsibleUserId: form.responsibleUserId || null,
          reviewIntervalDays: Number(form.reviewIntervalDays),
          reminderAfterHours: Number(form.reminderAfterHours),
          escalationAfterHours: Number(form.escalationAfterHours),
          nextReviewAt: new Date(form.nextReviewAt).toISOString(),
        }),
      });
      setForm({ ...initialForm, departmentId: user?.department?.id ?? '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dokument konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-grid">
      <article className="card page-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Dokumentenliste</span>
            <h2>Dokumente filtern und durchsuchen</h2>
          </div>
        </div>
        <div className="filter-grid">
          <input placeholder="Suche nach Titel, Beschreibung oder Kommentar" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          <select value={filters.active} onChange={(event) => setFilters((current) => ({ ...current, active: event.target.value }))}>
            <option value="">Alle Zustände</option>
            <option value="true">Nur aktiv</option>
            <option value="false">Nur inaktiv</option>
          </select>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">Alle Status</option>
            <option value="offen">Offen</option>
            <option value="freigegeben">Freigegeben</option>
            <option value="ueberarbeitet_noetig">Überarbeitung nötig</option>
            <option value="eskaliert">Eskaliert</option>
          </select>
          <select value={filters.documentTypeId} onChange={(event) => setFilters((current) => ({ ...current, documentTypeId: event.target.value }))}>
            <option value="">Alle Dokumenttypen</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <select value={filters.departmentId} onChange={(event) => setFilters((current) => ({ ...current, departmentId: event.target.value }))}>
            <option value="">Alle Abteilungen</option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Titel</th>
                <th>Typ</th>
                <th>Abteilung</th>
                <th>Status</th>
                <th>Nächste Prüfung</th>
                <th>Quelle</th>
              </tr>
            </thead>
            <tbody>
              {documents?.items.map((document) => (
                <tr key={document.id}>
                  <td>
                    <Link className="text-link" to={`/dokumente/${document.id}`}>
                      {document.title}
                    </Link>
                  </td>
                  <td>{document.documentType.name}</td>
                  <td>{document.department.name}</td>
                  <td>
                    <StatusBadge status={document.currentStatus} />
                  </td>
                  <td>{formatDate(document.nextReviewAt)}</td>
                  <td>
                    <a className="text-link" href={document.linkUrl} target="_blank" rel="noreferrer">
                      Link öffnen
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card page-panel">
        <span className="eyebrow">Neues Dokument</span>
        <h2>{isManager || isAdmin || user?.role.code === 'employee' ? 'Dokument anlegen' : 'Keine Berechtigung'}</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Titel
            <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            Dokumenttyp
            <select required value={form.documentTypeId} onChange={(event) => setForm((current) => ({ ...current, documentTypeId: event.target.value }))}>
              <option value="">Bitte wählen</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            Beschreibung
            <textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label>
            Externer Link
            <input required type="url" value={form.linkUrl} onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))} />
          </label>
          <label>
            Quellentyp
            <select value={form.sourceType} onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value }))}>
              <option value="sharepoint">SharePoint</option>
              <option value="wiki">Wiki</option>
              <option value="dateiserver">Dateiserver</option>
              <option value="weblink">Weblink</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label>
            Abteilung
            <select required value={form.departmentId} disabled={!isAdmin} onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}>
              <option value="">Bitte wählen</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Verantwortliche Person
            <select value={form.responsibleUserId} onChange={(event) => setForm((current) => ({ ...current, responsibleUserId: event.target.value }))}>
              <option value="">Optional</option>
              {users.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.firstName} {candidate.lastName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prüfintervall
            <select value={form.reviewIntervalType} onChange={(event) => setForm((current) => ({ ...current, reviewIntervalType: event.target.value }))}>
              <option value="monatlich">Monatlich</option>
              <option value="quartalsweise">Quartalsweise</option>
              <option value="halbjaehrlich">Halbjährlich</option>
              <option value="jaehrlich">Jährlich</option>
              <option value="tage">Benutzerdefiniert in Tagen</option>
            </select>
          </label>
          <label>
            Tage
            <input type="number" min={1} value={form.reviewIntervalDays} onChange={(event) => setForm((current) => ({ ...current, reviewIntervalDays: event.target.value }))} />
          </label>
          <label>
            Nächste Prüfung fällig am
            <input type="datetime-local" required value={form.nextReviewAt} onChange={(event) => setForm((current) => ({ ...current, nextReviewAt: event.target.value }))} />
          </label>
          <label>
            Erinnerung nach Stunden
            <input type="number" min={1} value={form.reminderAfterHours} onChange={(event) => setForm((current) => ({ ...current, reminderAfterHours: event.target.value }))} />
          </label>
          <label>
            Eskalation nach Stunden
            <input type="number" min={1} value={form.escalationAfterHours} onChange={(event) => setForm((current) => ({ ...current, escalationAfterHours: event.target.value }))} />
          </label>
          <label className="checkbox-row full-span">
            <input type="checkbox" checked={form.multiStageApprovalEnabled} onChange={(event) => setForm((current) => ({ ...current, multiStageApprovalEnabled: event.target.checked }))} />
            Mehrstufige Freigabe aktivieren
          </label>
          <button className="primary-button full-span" disabled={saving}>
            {saving ? 'Speichert ...' : 'Dokument speichern'}
          </button>
        </form>
      </article>
    </section>
  );
}
