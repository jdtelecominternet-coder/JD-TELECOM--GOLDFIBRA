import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';

export default function AccessDenied() {
  const nav = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
        <ShieldOff className="w-8 h-8" style={{ color: '#ef4444' }} />
      </div>
      <div>
        <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Acesso Negado</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Você não tem permissão para acessar esta área.
        </p>
      </div>
      <button onClick={() => nav('/')} className="btn-secondary text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
      </button>
    </div>
  );
}
