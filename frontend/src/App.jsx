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
import Relatorio from './pages/Relatorio';
import Solicitar from './pages/Solicitar';
import Solicitations from './pages/Solicitations';
import Reports from './pages/Reports';
import TechnicianReport from './pages/TechnicianReport';
import CTOOccurrences from './pages/CTOOccurrences';
import NetworkService from './pages/NetworkService';
import Profile from './pages/Profile';
import AIAssistant from './pages/AIAssistant';
import Chat from './pages/Chat';
import AccessDenied from './pages/AccessDenied';
import SettingsPage from './pages/Settings';
import SalesManagement from './pages/SalesManagement';
import ServiceHistory from './pages/ServiceHistory';
import InstallPrompt from './components/InstallPrompt';

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
      <Route path="/relatorio/:id" element={<Relatorio />} />
      <Route path="/solicitar" element={<Solicitar />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users"     element={<PrivateRoute roles={['admin']}><Users /></PrivateRoute>} />
        <Route path="clients"   element={<PrivateRoute roles={['admin','vendedor']}><Clients /></PrivateRoute>} />
        <Route path="plans"     element={<Plans />} />
        <Route path="orders"    element={<PrivateRoute roles={['admin','vendedor']}><Orders /></PrivateRoute>} />
        <Route path="solicitations" element={<PrivateRoute roles={['admin']}><Solicitations /></PrivateRoute>} />
        <Route path="technical" element={<PrivateRoute roles={['admin','tecnico']}><TechnicalOrders /></PrivateRoute>} />

        <Route path="reports"   element={<PrivateRoute roles={['admin']}><Reports /></PrivateRoute>} />
        <Route path="relatorio-tecnicos" element={<PrivateRoute roles={['admin']}><TechnicianReport /></PrivateRoute>} />
        <Route path="cto-ocorrencias" element={<PrivateRoute roles={['admin']}><CTOOccurrences /></PrivateRoute>} />
        <Route path="servico-rede" element={<PrivateRoute roles={['admin','manutencao']}><NetworkService /></PrivateRoute>} />
        <Route path="settings"  element={<PrivateRoute roles={['admin']}><SettingsPage /></PrivateRoute>} />
        <Route path="sales"     element={<PrivateRoute roles={['admin','vendedor']}><SalesManagement /></PrivateRoute>} />
        <Route path="history"   element={<PrivateRoute roles={['admin','tecnico']}><ServiceHistory /></PrivateRoute>} />
        <Route path="chat"      element={<PrivateRoute roles={['admin','tecnico','vendedor']}><Chat /></PrivateRoute>} />
        <Route path="ai"        element={<PrivateRoute roles={['admin','tecnico','vendedor']}><AIAssistant /></PrivateRoute>} />
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
          <InstallPrompt />
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
