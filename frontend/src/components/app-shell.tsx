import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export function AppShell() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role.code === 'admin';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">Dokumentenmanager</div>
          <p className="sidebar-copy">Prüfungen, Freigaben und Audit-Trail für interne Dokumente.</p>
        </div>
        <nav className="nav">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/dokumente">Dokumente</NavLink>
          <NavLink to="/aufgaben">Meine Prüfungen</NavLink>
          <NavLink to="/benachrichtigungen">Benachrichtigungen</NavLink>
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="sidebar-footer">
          <div>
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>
            <p>{user?.role.name}</p>
          </div>
          <button className="ghost-button" onClick={logout}>
            Abmelden
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div>
            <h1>Internes Dokumentenmanagement</h1>
            <p>Deutschsprachige Self-Hosted-Anwendung mit Audit-Log, Rollenprüfung und Scheduler.</p>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
