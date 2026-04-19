import { useState, useRef, useEffect } from 'react';
import { Trash2, X, Lock, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * Modal de confirmação de senha para deletar.
 * 
 * Props:
 *   open         boolean
 *   onClose      () => void
 *   onConfirmed  () => Promise<void>  — chamado APÓS senha verificada
 *   itemName     string               — nome do item a ser deletado (exibição)
 */
export default function AdminDeleteModal({ open, onClose, onConfirmed, itemName = 'este item' }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  async function handleConfirm(e) {
    e.preventDefault();
    if (!password.trim()) { toast.error('Digite a senha do administrador'); return; }
    setLoading(true);
    try {
      await api.post('/users/verify-admin-password', { password });
      await onConfirmed();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Senha incorreta';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: 'var(--card)', border: '1px solid #ef444444' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ background: '#ef444422' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            </div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Confirmar Exclusão</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70">
            <X size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Body */}
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Você está prestes a excluir <strong style={{ color: 'var(--text)' }}>{itemName}</strong>. Esta ação não pode ser desfeita.
        </p>
        <p className="text-xs mb-3 font-semibold" style={{ color: '#ef4444' }}>
          Digite a senha do Administrador para confirmar:
        </p>

        <form onSubmit={handleConfirm} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
            <Lock size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              type="password"
              placeholder="Senha do Administrador"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text)' }}
            />
          </div>

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ background: 'var(--input)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
              style={{ background: loading ? '#ef444466' : '#ef4444', color: '#fff' }}
            >
              <Trash2 size={15} />
              {loading ? 'Verificando...' : 'Excluir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
