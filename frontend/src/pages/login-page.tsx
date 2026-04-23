import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export function LoginPage() {
  const { login, token } = useAuth();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form.login, form.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-layout">
      <section className="login-panel">
        <span className="eyebrow">Self-Hosted · DSGVO-orientiert</span>
        <h1>Dokumente prüfen, freigeben und revisionsnah nachvollziehen.</h1>
        <p>
          Verwalten Sie externe Dokumentlinks, Prüfintervalle, Aufgaben, Eskalationen und digitale Freigaben in einer
          modernen browserbasierten Oberfläche.
        </p>
      </section>
      <form className="login-form card" onSubmit={handleSubmit}>
        <h2>Anmeldung</h2>
        <label>
          E-Mail oder Benutzername
          <input
            required
            value={form.login}
            onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))}
          />
        </label>
        <label>
          Passwort
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary-button" disabled={submitting}>
          {submitting ? 'Anmeldung läuft ...' : 'Anmelden'}
        </button>
        <div className="hint-box">
          Seed-Login: <code>admin</code> / <code>Passwort123!</code>
        </div>
      </form>
    </div>
  );
}
