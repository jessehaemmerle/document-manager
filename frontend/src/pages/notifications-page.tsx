import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { NotificationItem, Paginated } from '../types/api';

export function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Paginated<NotificationItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      const result = await api<Paginated<NotificationItem>>('/notifications', { token });
      setNotifications(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benachrichtigungen konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const markRead = async (id?: string) => {
    if (!token || !id) return;
    await api(`/notifications/${id}/read`, { method: 'PUT', token, body: JSON.stringify({}) });
    await load();
  };

  const markAll = async () => {
    if (!token) return;
    await api('/notifications/read-all', { method: 'PUT', token, body: JSON.stringify({}) });
    await load();
  };

  return (
    <section className="card page-panel">
      <div className="section-header">
        <div>
          <span className="eyebrow">Benachrichtigungen</span>
          <h2>In-App-Nachrichten</h2>
        </div>
        <button className="secondary-button" onClick={markAll}>
          Alle als gelesen markieren
        </button>
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="stack-list">
        {notifications?.items.map((notification) => (
          <article key={notification.id} className={`list-card ${notification.read ? '' : 'highlight-card'}`}>
            <div className="section-header">
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
              </div>
              {!notification.read && (
                <button className="secondary-button" onClick={() => void markRead(notification.id)}>
                  Gelesen
                </button>
              )}
            </div>
            <span>{formatDate(notification.createdAt)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
