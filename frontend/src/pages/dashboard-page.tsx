import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/stat-card';
import { StatusBadge } from '../components/status-badge';
import { useAuth } from '../context/auth-context';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { DashboardSummary } from '../types/api';

export function DashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api<DashboardSummary>('/dashboard', { token })
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Dashboard konnte nicht geladen werden.'));
  }, [token]);

  if (error) return <section className="card page-panel error-box">{error}</section>;
  if (!summary) return <section className="card page-panel">Dashboard wird geladen ...</section>;

  return (
    <section className="page-grid">
      <div className="stats-grid">
        <StatCard title="Aktive Dokumente" value={summary.activeDocuments} hint="Derzeit aktive, sichtbare Dokumente." />
        <StatCard title="Überfällig" value={summary.overdueDocuments} hint="Dokumente mit fälliger oder überschrittener Prüfung." />
        <StatCard title="Offene Aufgaben" value={summary.openAssignments} hint="Prüfungen, die noch bearbeitet werden müssen." />
        <StatCard title="Eskalationen" value={summary.escalatedAssignments} hint="Überfällige oder eskalierte Prüfungen." />
      </div>
      <article className="card page-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Zuletzt relevant</span>
            <h2>Neueste Prüfaktivitäten</h2>
          </div>
          <Link className="text-link" to="/aufgaben">
            Zu meinen Prüfungen
          </Link>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Dokument</th>
                <th>Stufe</th>
                <th>Status</th>
                <th>Zugewiesen</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <strong>{assignment.cycle.document.title}</strong>
                  </td>
                  <td>{assignment.stageNumber}</td>
                  <td>
                    <StatusBadge status={assignment.status} />
                  </td>
                  <td>{formatDate(assignment.assignedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
