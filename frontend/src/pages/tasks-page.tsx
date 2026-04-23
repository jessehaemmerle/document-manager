import { useEffect, useState } from 'react';
import { StatusBadge } from '../components/status-badge';
import { useAuth } from '../context/auth-context';
import { api, buildQuery } from '../lib/api';
import { formatDate } from '../lib/format';
import type { Paginated, ReviewAssignment } from '../types/api';

export function TasksPage() {
  const { token, user } = useAuth();
  const [assignments, setAssignments] = useState<Paginated<ReviewAssignment> | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});

  const load = async () => {
    if (!token) return;
    try {
      const endpoint = user?.role.code === 'employee' ? '/reviews/assignments/mine' : '/reviews/assignments';
      const result = await api<Paginated<ReviewAssignment>>(`${endpoint}${buildQuery({ status })}`, { token });
      setAssignments(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aufgaben konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    void load();
  }, [token, status, user?.role.code]);

  const submit = async (assignmentId: string, nextStatus: string) => {
    if (!token) return;
    try {
      await api(`/reviews/assignments/${assignmentId}/action`, {
        method: 'POST',
        token,
        body: JSON.stringify({ status: nextStatus, comment: comment[assignmentId] || undefined }),
      });
      setComment((current) => ({ ...current, [assignmentId]: '' }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht gespeichert werden.');
    }
  };

  return (
    <section className="card page-panel">
      <div className="section-header">
        <div>
          <span className="eyebrow">Aufgabenansicht</span>
          <h2>Meine relevanten Prüfungen</h2>
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Alle Status</option>
          <option value="offen">Offen</option>
          <option value="freigegeben">Freigegeben</option>
          <option value="ueberarbeitet_noetig">Überarbeitung nötig</option>
          <option value="ueberfaellig">Überfällig</option>
        </select>
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="stack-list">
        {assignments?.items.map((assignment) => (
          <article className="list-card" key={assignment.id}>
            <div className="section-header">
              <div>
                <strong>{assignment.cycle.document.title}</strong>
                <p>
                  Stufe {assignment.stageNumber} · fällig seit {formatDate(assignment.cycle.dueAt)}
                </p>
              </div>
              <StatusBadge status={assignment.status} />
            </div>
            <form
              className="task-actions"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(assignment.id, 'freigegeben');
              }}
            >
              <textarea
                rows={3}
                placeholder="Kommentar oder Abzeichnungstext ..."
                value={comment[assignment.id] ?? ''}
                onChange={(event) => setComment((current) => ({ ...current, [assignment.id]: event.target.value }))}
              />
              <div className="button-row">
                <button className="primary-button" type="submit">
                  Freigeben
                </button>
                <button className="secondary-button" type="button" onClick={() => void submit(assignment.id, 'gelesen')}>
                  Gelesen
                </button>
                <button className="secondary-button warning-button" type="button" onClick={() => void submit(assignment.id, 'ueberarbeitet_noetig')}>
                  Überarbeitung nötig
                </button>
                <button className="secondary-button danger-button" type="button" onClick={() => void submit(assignment.id, 'eskaliert')}>
                  Eskalieren
                </button>
              </div>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
