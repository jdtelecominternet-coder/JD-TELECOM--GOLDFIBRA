import { useState, useRef } from 'react';
import { XCircle, Camera, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

const MOTIVOS = [
  { value: 'cliente_cancelou', label: '❌ Cliente cancelou', minFotos: 0, descObrig: false },
  { value: 'cliente_ausente',  label: '🚪 Cliente ausente',  minFotos: 2, descObrig: false,
    fotoLabels: ['Frente da residência', 'Outra evidência (portão, ausência...)'] },
  { value: 'chuva',            label: '🌧️ Chuva',            minFotos: 3, descObrig: false,
    fotoLabels: ['Céu / clima chuvoso', 'Local da instalação', 'Equipamento/condição que impede'] },
  { value: 'outro',            label: '📝 Outro motivo',     minFotos: 0, descObrig: true },
];

export default function CancelOSModal({ os, onConfirm, onClose }) {
  const [step, setStep] = useState(1); // 1=aviso, 2=motivo, 3=confirm
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const motivoInfo = MOTIVOS.find(m => m.value === motivo);

  function addFoto(e) {
    const files = Array.from(e.target.files);
    setFotos(prev => [...prev, ...files].slice(0, 5));
    e.target.value = '';
  }

  function removeFoto(i) {
    setFotos(prev => prev.filter((_, idx) => idx !== i));
  }

  const canConfirm = motivo &&
    fotos.length >= (motivoInfo?.minFotos || 0) &&
    (!motivoInfo?.descObrig || descricao.trim().length >= 10);

  async function handleConfirm() {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await onConfirm({ motivo, descricao, fotos });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>

        {/* Step 1 - Aviso */}
        {step === 1 && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/20">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Atenção!</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Antes de cancelar, leia com atenção</p>
              </div>
            </div>
            <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)' }}>
              <p className="text-sm font-bold text-orange-400">⚠️ O cancelamento exige:</p>
              <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>✔ Seleção obrigatória do motivo</li>
                <li>✔ Fotos como evidência (conforme o motivo)</li>
                <li>✔ Texto explicativo (quando necessário)</li>
                <li>✔ Será registrado com data, hora e seu nome</li>
                <li>✔ O administrador será notificado imediatamente</li>
              </ul>
            </div>
            <p className="text-sm text-center font-bold" style={{ color: 'var(--text-muted)' }}>
              OS: <span style={{ color: 'var(--accent)' }}>{os.readable_id || os.os_number}</span> — {os.client_name}
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Voltar</button>
              <button onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: '#ef4444', color: '#fff' }}>
                Entendi, prosseguir
              </button>
            </div>
          </>
        )}

        {/* Step 2 - Motivo + Fotos */}
        {step === 2 && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/20">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Cancelar OS</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Preencha todos os campos obrigatórios</p>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="label">Motivo do cancelamento *</label>
              <div className="space-y-2">
                {MOTIVOS.map(m => (
                  <button key={m.value} onClick={() => { setMotivo(m.value); setFotos([]); }}
                    className="w-full text-left p-3 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: motivo === m.value ? 'rgba(239,68,68,0.15)' : 'var(--table-header)',
                      border: `2px solid ${motivo === m.value ? '#ef4444' : 'var(--border)'}`,
                      color: 'var(--text-primary)'
                    }}>
                    {m.label}
                    {m.minFotos > 0 && (
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                        ({m.minFotos} foto{m.minFotos > 1 ? 's' : ''} obrigatória{m.minFotos > 1 ? 's' : ''})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            {motivo && (
              <div>
                <label className="label">
                  {motivoInfo?.descObrig ? 'Descrição *' : 'Descrição (opcional)'}
                </label>
                <textarea
                  className="input w-full"
                  rows={3}
                  placeholder={motivoInfo?.descObrig ? 'Descreva o motivo detalhadamente (mín. 10 caracteres)...' : 'Adicione observações se necessário...'}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                />
                {motivoInfo?.descObrig && descricao.length > 0 && descricao.length < 10 && (
                  <p className="text-xs text-red-400 mt-1">Mínimo 10 caracteres ({descricao.length}/10)</p>
                )}
              </div>
            )}

            {/* Fotos */}
            {motivo && motivoInfo && (
              <div>
                <label className="label">
                  Fotos {motivoInfo.minFotos > 0 ? `(${fotos.length}/${motivoInfo.minFotos} mínimo) *` : '(opcional)'}
                </label>
                {motivoInfo.fotoLabels && (
                  <div className="mb-2 p-3 rounded-xl space-y-1" style={{ background: 'var(--table-header)' }}>
                    {motivoInfo.fotoLabels.map((l, i) => (
                      <p key={i} className="text-xs" style={{ color: 'var(--text-muted)' }}>📷 {i+1}. {l}</p>
                    ))}
                  </div>
                )}
                <input ref={inputRef} type="file" accept="image/*" multiple capture="environment"
                  onChange={addFoto} className="hidden" />
                <button onClick={() => inputRef.current?.click()}
                  className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-2"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <Camera className="w-4 h-4" /> Tirar foto / Galeria
                </button>
                {fotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {fotos.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                        style={{ border: '2px solid var(--border)' }}>
                        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                        <button onClick={() => removeFoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                          style={{ background: '#ef4444', color: '#fff' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {motivoInfo.minFotos > 0 && fotos.length < motivoInfo.minFotos && (
                  <p className="text-xs text-red-400 mt-1">
                    Adicione mais {motivoInfo.minFotos - fotos.length} foto(s) para continuar
                  </p>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Voltar</button>
              <button onClick={handleConfirm} disabled={!canConfirm || loading}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: canConfirm ? '#ef4444' : 'var(--table-header)',
                  color: canConfirm ? '#fff' : 'var(--text-muted)',
                  cursor: canConfirm ? 'pointer' : 'not-allowed'
                }}>
                {loading ? 'Enviando...' : <><XCircle className="w-4 h-4" /> Confirmar Cancelamento</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
