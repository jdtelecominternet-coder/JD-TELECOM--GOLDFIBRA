import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Clients from './pages/Clients';
import Plans from './pages/Plans';
import Orders from './pages/Orders';
import TechnicalOrders from './pages/TechnicalOrders';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import AccessDenied from './pages/AccessDenied';

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <AccessDenied />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users"     element={<PrivateRoute roles={['admin']}><Users /></PrivateRoute>} />
        <Route path="clients"   element={<PrivateRoute roles={['admin','vendedor']}><Clients /></PrivateRoute>} />
        <Route path="plans"     element={<Plans />} />
        <Route path="orders"    element={<PrivateRoute roles={['admin','vendedor']}><Orders /></PrivateRoute>} />
        <Route path="technical" element={<PrivateRoute roles={['admin','tecnico']}><TechnicalOrders /></PrivateRoute>} />
        <Route path="reports"   element={<PrivateRoute roles={['admin']}><Reports /></PrivateRoute>} />
        <Route path="chat"      element={<PrivateRoute roles={['admin','tecnico']}><Chat /></PrivateRoute>} />
        <Route path="profile"   element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function Inner() {
  return (
    <ChatProvider>
      <AppRoutes />
    </ChatProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Inner />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
              success: { iconTheme: { primary: '#3b82f6', secondary: '#fff' } }
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
