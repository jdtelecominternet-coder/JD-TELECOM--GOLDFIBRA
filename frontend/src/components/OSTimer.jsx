import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

const LIMIT = 2 * 60 * 60 * 1000; // 2 horas em ms

export default function OSTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Date.now() - start);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return null;

  const pct = Math.min(elapsed / LIMIT, 1);
  const remaining = Math.max(LIMIT - elapsed, 0);
  const over = elapsed > LIMIT;

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const elH = Math.floor(elapsed / 3600000);
  const elM = Math.floor((elapsed % 3600000) / 60000);
  const elS = Math.floor((elapsed % 60000) / 1000);

  const color = over ? '#ef4444' : pct > 0.5 ? '#f97316' : '#22c55e';
  const label = over
    ? `+${elH}h ${elM}m ${elS}s acima do prazo`
    : `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')} restantes`;

  return (
    <div className="mt-2 p-3 rounded-xl" style={{ background: 'var(--table-header)', border: `2px solid ${color}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Timer className="w-4 h-4" style={{ color }} />
        <span className="text-xs font-bold" style={{ color }}>
          {over ? '⚠️ Prazo excedido!' : '⏱ Prazo da OS (2h)'}
        </span>
        <span className="ml-auto text-xs font-black" style={{ color }}>{label}</span>
      </div>
      <div className="w-full rounded-full h-2" style={{ background: 'var(--border)' }}>
        <div className="h-2 rounded-full transition-all"
          style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}
