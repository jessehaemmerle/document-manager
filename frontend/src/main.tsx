import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { AuthProvider, useAuth } from './context/auth-context';
import { AdminPage } from './pages/admin-page';
import { DashboardPage } from './pages/dashboard-page';
import { DocumentDetailPage } from './pages/document-detail-page';
import { DocumentsPage } from './pages/documents-page';
import { LoginPage } from './pages/login-page';
import { NotificationsPage } from './pages/notifications-page';
import { TasksPage } from './pages/tasks-page';
import './styles.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="page-state">Lade Sitzung ...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dokumente" element={<DocumentsPage />} />
            <Route path="dokumente/:id" element={<DocumentDetailPage />} />
            <Route path="aufgaben" element={<TasksPage />} />
            <Route path="benachrichtigungen" element={<NotificationsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
