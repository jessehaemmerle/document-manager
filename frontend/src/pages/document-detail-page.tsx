import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { StatusBadge } from '../components/status-badge';
import { useAuth } from '../context/auth-context';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { CommentItem, DocumentItem, ReviewAction, ReviewCycle } from '../types/api';

interface DocumentDetail extends DocumentItem {
  cycles: ReviewCycle[];
  comments: CommentItem[];
  actions: ReviewAction[];
}

export function DocumentDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [comment, setComment] = useState('');
  const [deactivationComment, setDeactivationComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token || !id) return;
    try {
      const result = await api<DocumentDetail>(`/documents/${id}`, { token });
      setDocument(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dokument konnte nicht geladen werden.');
    }
  };

  useEffect(() => {
    void load();
  }, [id, token]);

  const handleComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !document || !comment.trim()) return;
    try {
      await api('/reviews/comments', {
        method: 'POST',
        token,
        body: JSON.stringify({ documentId: document.id, content: comment }),
      });
      setComment('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kommentar konnte nicht gespeichert werden.');
    }
  };

  const handleDeactivate = async () => {
    if (!token || !document || !deactivationComment.trim()) return;
    try {
      await api(`/documents/${document.id}`, {
        method: 'DELETE',
        token,
        body: JSON.stringify({ comment: deactivationComment }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dokument konnte nicht deaktiviert werden.');
    }
  };

  if (error) return <section className="card page-panel error-box">{error}</section>;
  if (!document) return <section className="card page-panel">Dokument wird geladen ...</section>;
  const canDeactivate = user?.role.code === 'admin' || (user?.role.code === 'manager' && user.department?.id === document.department.id);

  return (
    <section className="page-grid">
      <article className="card page-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Dokumentdetail</span>
            <h2>{document.title}</h2>
          </div>
          <StatusBadge status={document.currentStatus} />
        </div>
        <div className="details-grid">
          <div>
            <strong>Beschreibung</strong>
            <p>{document.description || 'Keine Beschreibung hinterlegt.'}</p>
          </div>
          <div>
            <strong>Dokumenttyp</strong>
            <p>{document.documentType.name}</p>
          </div>
          <div>
            <strong>Abteilung</strong>
            <p>{document.department.name}</p>
          </div>
          <div>
            <strong>Prüfintervall</strong>
            <p>{document.reviewIntervalType}</p>
          </div>
          <div>
            <strong>Nächste Prüfung</strong>
            <p>{formatDate(document.nextReviewAt)}</p>
          </div>
          <div>
            <strong>Mehrstufige Freigabe</strong>
            <p>{document.multiStageApprovalEnabled ? 'Aktiv' : 'Nicht aktiv'}</p>
          </div>
        </div>
        <a className="primary-button inline-button" href={document.linkUrl} target="_blank" rel="noreferrer">
          Externes Dokument öffnen
        </a>
        {canDeactivate && document.active && (
          <div className="deactivate-box">
            <h3>Dokument deaktivieren</h3>
            <textarea
              rows={3}
              placeholder="Pflichtkommentar für die Inaktivsetzung ..."
              value={deactivationComment}
              onChange={(event) => setDeactivationComment(event.target.value)}
            />
            <button className="secondary-button danger-button" onClick={() => void handleDeactivate()}>
              Dokument deaktivieren
            </button>
          </div>
        )}
      </article>

      <article className="card page-panel">
        <span className="eyebrow">Workflow</span>
        <h2>Freigabestufen und Historie</h2>
        <div className="timeline">
          {document.approvalStages.map((stage) => (
            <div key={stage.stageNumber} className="timeline-item">
              <strong>Stufe {stage.stageNumber}</strong>
              <p>{stage.label}</p>
            </div>
          ))}
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Zeitpunkt</th>
                <th>Aktion</th>
                <th>Benutzer</th>
                <th>Kommentar</th>
              </tr>
            </thead>
            <tbody>
              {document.actions.map((action) => (
                <tr key={action.id}>
                  <td>{formatDate(action.timestamp)}</td>
                  <td>{action.actionType}</td>
                  <td>
                    {action.user.firstName} {action.user.lastName}
                  </td>
                  <td>{action.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card page-panel">
        <span className="eyebrow">Kommentare</span>
        <h2>Diskussion und Hinweise</h2>
        <form className="comment-form" onSubmit={handleComment}>
          <textarea rows={4} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Kommentar hinterlassen ..." />
          <button className="primary-button">Kommentar speichern</button>
        </form>
        <div className="stack-list">
          {document.comments.map((entry) => (
            <div key={entry.id} className="list-card">
              <strong>
                {entry.user.firstName} {entry.user.lastName}
              </strong>
              <span>{formatDate(entry.createdAt)}</span>
              <p>{entry.content}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
