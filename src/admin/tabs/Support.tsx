import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, MessageSquare, Phone, Clock } from 'lucide-react';
import { fetchHandoffLeads } from '../../lib/adminApi';
import { fetchMessages, sendWhatsApp } from '../../lib/api';

export default function Support() {
  const [leads, setLeads]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);

  async function load() {
    setLoading(true);
    setLeads(await fetchHandoffLeads());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const loadMsgs = useCallback(async (lead: any) => {
    setMsgsLoading(true);
    setMessages(await fetchMessages(lead.id));
    setMsgsLoading(false);
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadMsgs(selected);
    const id = setInterval(() => loadMsgs(selected), 8_000);
    return () => clearInterval(id);
  }, [selected, loadMsgs]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setSending(true);
    await sendWhatsApp(selected.phone, reply.trim());
    setReply('');
    setTimeout(() => loadMsgs(selected), 1500);
    setSending(false);
  }

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const since = (d: string) => {
    if (!d) return '';
    const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h${mins % 60 > 0 ? ` ${mins % 60}min` : ''} atrás`;
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[400px]">
      {/* Lead list */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-xs font-black tracking-widest uppercase">
            {leads.length} handoff{leads.length !== 1 ? 's' : ''} pendente{leads.length !== 1 ? 's' : ''}
          </p>
          <button onClick={load} className="text-white/30 hover:text-white transition">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {loading && <div className="text-white/25 text-sm text-center py-8">Carregando...</div>}
          {!loading && leads.length === 0 && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-white/30 text-sm font-semibold">Nenhum handoff pendente</p>
              <p className="text-white/15 text-xs mt-1">Tudo em dia!</p>
            </div>
          )}
          {leads.map(l => {
            const isActive = selected?.id === l.id;
            return (
              <button key={l.id} onClick={() => setSelected(l)}
                className={`w-full text-left p-3.5 rounded-xl border transition ${
                  isActive ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/8 bg-white/3 hover:bg-white/6'
                }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-xs">{(l.name || l.whatsapp_name || '?')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm leading-none truncate">{l.name || l.whatsapp_name || 'Sem nome'}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">+{l.phone}</p>
                  </div>
                </div>
                {l.handoff_at && (
                  <div className="flex items-center gap-1 mt-2 text-amber-400/70">
                    <Clock size={10} />
                    <p className="text-[10px] font-semibold">{since(l.handoff_at)}</p>
                  </div>
                )}
                {l.summary && (
                  <p className="text-white/25 text-[11px] mt-1.5 line-clamp-2">{l.summary}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation panel */}
      <div className="flex-1 flex flex-col rounded-2xl border border-white/10 overflow-hidden min-w-0"
        style={{ background: 'rgba(255,255,255,0.03)' }}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20">
            <MessageSquare size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-semibold">Selecione um lead para ver a conversa</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0"
              style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <span className="text-white font-black">{(selected.name || selected.whatsapp_name || '?')[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-none">{selected.name || selected.whatsapp_name || 'Sem nome'}</p>
                  <p className="text-white/30 text-xs">+{selected.phone} · Handoff {since(selected.handoff_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`tel:+${selected.phone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/25 text-blue-300 text-xs font-bold hover:bg-blue-600/40 transition">
                  <Phone size={12} /> Ligar
                </a>
                <button onClick={() => loadMsgs(selected)} className="text-white/30 hover:text-white transition p-1">
                  <RefreshCw size={13} className={msgsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {msgsLoading && messages.length === 0 && (
                <div className="text-white/20 text-sm text-center py-8">Carregando mensagens...</div>
              )}
              {messages.map(m => {
                const isIn = m.direction === 'inbound';
                const hasMedia = m.media_type && m.media_url;
                return (
                  <div key={m.id} className={`flex ${isIn ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[72%] px-3 py-2 rounded-xl text-sm leading-snug ${
                      isIn ? 'bg-white/8 text-white/90 rounded-tl-sm' : 'bg-violet-600/70 text-white rounded-tr-sm'
                    }`}>
                      {hasMedia && m.media_type === 'audio' && (
                        <audio controls src={m.media_url} className="w-full mb-1" style={{ height: '36px' }} />
                      )}
                      {hasMedia && m.media_type === 'image' && (
                        <a href={m.media_url} target="_blank" rel="noreferrer">
                          <img src={m.media_url} alt="" className="w-full max-w-[200px] rounded-lg mb-1" />
                        </a>
                      )}
                      {m.body && <p>{m.body}</p>}
                      <p className={`text-[10px] mt-0.5 text-right opacity-50`}>{fmtTime(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && !msgsLoading && (
                <div className="text-white/20 text-sm text-center py-8">Sem mensagens.</div>
              )}
            </div>

            {/* Reply */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-2 shrink-0"
              style={{ background: 'rgba(0,0,0,0.15)' }}>
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Responder como suporte..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button type="submit" disabled={sending || !reply.trim()}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition disabled:opacity-40">
                {sending ? '...' : 'Enviar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
