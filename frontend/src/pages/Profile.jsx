import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Camera, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const roleLabel = { admin: 'Administrador', vendedor: 'Vendedor', tecnico: 'Técnico' };

export default function Profile() {
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [myStats, setMyStats] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      const [pr, sr] = await Promise.all([api.get('/users/me'), api.get('/users/me/stats')]);
      setProfile(pr.data);
      setForm({ email: pr.data.email || '', phone: pr.data.phone || '' });
      setMyStats(sr.data);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      await api.put('/users/me/profile', form);
      toast.success('Perfil atualizado!');
      load();
    } catch { toast.error('Erro'); }
    finally { setSaving(false); }
  }

  async function savePassword() {
    if (!pwForm.current_password || !pwForm.new_password) return toast.error('Preencha todos os campos');
    if (pwForm.new_password !== pwForm.confirm) return toast.error('Senhas não coincidem');
    if (pwForm.new_password.length < 4) return toast.error('Mínimo 4 caracteres');
    setSavingPw(true);
    try {
      await api.put('/users/me/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Senha alterada!');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setSavingPw(false); }
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const r = await api.post('/users/me/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ photo_url: r.data.photo_url });
      toast.success('Foto atualizada!');
      load();
    } catch { toast.error('Erro ao enviar foto'); }
    finally { setUploading(false); }
  }

  if (!profile) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  const clients = myStats?.clients || [];
  const orders = myStats?.orders || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Meu Perfil</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gerencie suas informações pessoais</p>
      </div>

      {/* Photo + Info */}
      <div className="card flex items-start gap-5 flex-wrap">
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            {profile.photo_url
              ? <img src={profile.photo_url} alt="Perfil" className="w-full h-full object-cover" />
              : <User className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
          </div>
          <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: 'var(--accent)' }}>
            <Camera className="w-4 h-4" style={{ color: 'var(--bg-main)' }} />
            <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          </label>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.name}</h2>
          <p className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{profile.jd_id}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{roleLabel[profile.role]}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {profile.email && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><Mail className="w-3 h-3" />{profile.email}</span>}
            {profile.phone && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><Phone className="w-3 h-3" />{profile.phone}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      {(clients.length > 0 || orders.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {authUser.role === 'vendedor' && <>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{clients.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Clientes</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: '#4ade80' }}>{clients.filter(c=>c.status==='ativo').length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ativos</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: '#facc15' }}>{clients.filter(c=>c.status==='pendente').length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pendentes</p>
            </div>
          </>}
          {authUser.role === 'tecnico' && <>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{orders.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total OS</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: '#4ade80' }}>{orders.filter(o=>o.status==='finalizado').length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Finalizadas</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: '#facc15' }}>{orders.filter(o=>o.status==='pendente').length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pendentes</p>
            </div>
          </>}
        </div>
      )}

      {/* My Clients (for sellers) */}
      {authUser.role === 'vendedor' && clients.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Meus Clientes</h3>
          <div className="space-y-2">
            {clients.slice(0,5).map(c => (
              <div key={c.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.city} — {c.plan_name || 'Sem plano'}</p>
                </div>
                <span className={`badge-${c.status}`}>{c.status.charAt(0).toUpperCase()+c.status.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile */}
      <div className="card">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Editar Contato</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label"><Mail className="w-3 h-3 inline mr-1" />E-mail</label>
            <input value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} className="input" placeholder="seu@email.com" />
          </div>
          <div>
            <label className="label"><Phone className="w-3 h-3 inline mr-1" />Telefone</label>
            <input value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} className="input" placeholder="(00) 00000-0000" />
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary mt-4 text-sm">
          {saving ? 'Salvando...' : 'Salvar Contato'}
        </button>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Lock className="w-4 h-4" style={{ color: 'var(--accent)' }} />Alterar Senha
        </h3>
        <div className="space-y-3">
          <div>
            <label className="label">Senha Atual</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={pwForm.current_password}
                onChange={e=>setPwForm(p=>({...p,current_password:e.target.value}))} className="input pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Nova Senha</label>
            <input type="password" value={pwForm.new_password} onChange={e=>setPwForm(p=>({...p,new_password:e.target.value}))} className="input" />
          </div>
          <div>
            <label className="label">Confirmar Nova Senha</label>
            <input type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} className="input" />
          </div>
        </div>
        <button onClick={savePassword} disabled={savingPw} className="btn-primary mt-4 text-sm">
          {savingPw ? 'Alterando...' : 'Alterar Senha'}
        </button>
      </div>
    </div>
  );
}
