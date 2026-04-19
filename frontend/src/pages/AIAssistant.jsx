import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Trash2, Sparkles, Copy, Check } from 'lucide-react';

const GROQ_API_KEY = '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';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Você é o assistente da JD TELECOM - GOLD FIBRA, uma empresa de internet fibra óptica.
Você ajuda técnicos, vendedores e administradores com:
- Dúvidas técnicas sobre fibra óptica, PPPoE, OLT, CTO, splitter
- Sugestões de texto para observações de OS (ordem de serviço)
- Sugestões de texto para vendedores ao abordar clientes
- Análise de sinais (dBm), problemas de conectividade
- Procedimentos de instalação e ativação
Responda sempre em português brasileiro, de forma clara e objetiva.`;

const SUGGESTIONS = [
  'Como verificar o sinal da CTO?',
  'Qual o procedimento para ativar PPPoE no cliente?',
  'Como fazer emenda de fibra óptica?',
  'O que fazer quando o cliente perde internet à noite?',
  'Como calcular a perda de sinal na fibra?',
  'Texto de abordagem para novo cliente de internet fibra',
];

async function askGroq(messages) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1024,
      temperature: 0.7
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return data.choices?.[0]?.message?.content || 'Sem resposta';
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o assistente da JD TELECOM. Posso te ajudar com dúvidas técnicas, textos de observação, procedimentos de instalação e muito mais. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const [copied, setCopied] = useState(null);

  function copyMsg(text, i) {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const reply = await askGroq(history);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro: ' + e.message }]);
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setMessages([{ role: 'assistant', content: 'Conversa reiniciada! Como posso ajudar?' }]);
  }

  return (
    <div className="space-y-4 h-full flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Assistente IA</h1>
            <p className="text-xs flex items-center gap-1" style={{ color: '#10b981' }}>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Online · LLaMA 3 · JD Telecom
            </p>
          </div>
        </div>
        <button onClick={clear} className="btn-secondary py-1.5 text-sm flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" /> Limpar
        </button>
      </div>

      {messages.length <= 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)}
              className="text-left text-xs p-3 rounded-xl transition-all"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <Sparkles className="w-3 h-3 mb-1" style={{ color: '#7c3aed' }} />
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ minHeight: 0 }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
                style={{
                  background: m.role === 'user' ? 'linear-gradient(135deg,#1e50b4,#4f46e5)' : 'var(--card-bg)',
                  color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                  border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                }}>
                {m.content}
              </div>
            </div>
            {m.role === 'assistant' && (
              <button onClick={() => copyMsg(m.content, i)}
                className="ml-9 mt-1 flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                style={{ color: copied === i ? '#10b981' : 'var(--text-muted)', background: 'transparent' }}>
                {copied === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === i ? 'Copiado!' : 'Copiar'}
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 mt-1"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <input
          className="input flex-1"
          placeholder="Digite sua pergunta..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={loading}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-xl font-bold flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', opacity: loading || !input.trim() ? 0.6 : 1 }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
