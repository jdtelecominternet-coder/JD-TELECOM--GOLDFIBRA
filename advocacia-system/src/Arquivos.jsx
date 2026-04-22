import { useState, useRef } from 'react';
import { getFiles, addFile, deleteFile, getProcesses, getClients } from './store';
import { Upload, Trash2, Download, FileText, Image, File, FolderOpen, Search } from 'lucide-react';

function getIcon(name) {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return Image;
  if (['pdf', 'doc', 'docx'].includes(ext)) return FileText;
  return File;
}

export default function Arquivos({ user }) {
  const [files, setFiles] = useState(getFiles());
  const [processes] = useState(getProcesses());
  const [clients] = useState(getClients());
  const [search, setSearch] = useState('');
  const [filterProcess, setFilterProcess] = useState('');
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const reload = () => setFiles(getFiles());

  const filtered = files.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchProcess = !filterProcess || f.processId === filterProcess;
    return matchSearch && matchProcess;
  });

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      addFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: ev.target.result,
        processId: filterProcess || null,
        uploadedBy: user.name,
      });
      reload();
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function handleDelete(id) {
    if (confirm('Excluir este arquivo?')) { deleteFile(id); reload(); }
  }

  function handleDownload(f) {
    const a = document.createElement('a');
    a.href = f.data;
    a.download = f.name;
    a.click();
  }

  const getProcessName = (id) => processes.find(p => p.id === id)?.number || '—';
  const formatSize = (bytes) => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="font-cinzel" style={{ fontSize: '20px', color: 'var(--white)' }}>Arquivos</h1>
          <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>{files.length} arquivos armazenados</p>
        </div>
        <button className="btn-gold" onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={16} /> {uploading ? 'Enviando...' : 'Upload'}
        </button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--white-dim)' }} />
          <input className="input-dark" style={{ paddingLeft: '36px' }} placeholder="Buscar arquivos..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-dark" style={{ maxWidth: '280px' }} value={filterProcess} onChange={e => setFilterProcess(e.target.value)}>
          <option value="">Todos os processos</option>
          {processes.map(p => <option key={p.id} value={p.id}>{p.number}</option>)}
        </select>
      </div>

      {/* Upload zone */}
      <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed rgba(201,168,76,0.2)', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', marginBottom: '20px', transition: 'border-color 0.2s' }}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--gold)'; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; }}
        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; const file = e.dataTransfer.files[0]; if (file) { const ev = { target: { files: [file] } }; handleUpload(ev); } }}>
        <Upload size={32} color="var(--gold-dark)" style={{ marginBottom: '10px' }} />
        <p style={{ color: 'var(--white-dim)', fontSize: '14px' }}>Arraste arquivos aqui ou <span style={{ color: 'var(--gold)' }}>clique para selecionar</span></p>
        <p style={{ color: 'var(--white-dim)', fontSize: '12px', marginTop: '4px' }}>PDF, DOCX, imagens e outros formatos</p>
      </div>

      {/* Files grid */}
      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {filtered.map(f => {
            const Icon = getIcon(f.name);
            return (
              <div key={f.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color="var(--gold)" />
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ color: 'var(--white)', fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ color: 'var(--white-dim)', fontSize: '11px' }}>{formatSize(f.size)}</div>
                  </div>
                </div>
                {f.processId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <FolderOpen size={11} color="var(--gold-dark)" />
                    <span style={{ color: 'var(--white-dim)', fontSize: '11px', fontFamily: 'monospace' }}>{getProcessName(f.processId)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleDownload(f)} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Download size={12} /> Baixar
                  </button>
                  <button onClick={() => handleDelete(f.id)} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', color: 'var(--red)', cursor: 'pointer' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--white-dim)' }}>
          <File size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>Nenhum arquivo encontrado.</p>
        </div>
      )}
    </div>
  );
}
