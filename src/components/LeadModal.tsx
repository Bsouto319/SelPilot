import { useEffect, useState } from 'react';
import { X, Phone, MessageCircle, Save, Trash2, Send, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import {
  STAGES, FOLLOWUP_TEMPLATES,
  fetchMessages, updateLeadStage, updateLeadNotes, deleteLead, sendFollowUp,
} from '../lib/api';

type Toast = { ok: boolean; msg: string } | null;

export default function LeadModal({
  lead, onClose, onUpdated,
}: { lead: any; onClose: () => void; onUpdated: () => void }) {
  const [messages, setMessages]     = useState<any[]>([]);
  const [notes, setNotes]           = useState(lead.notes || '');
  const [stage, setStage]           = useState(lead.stage);
  const [saving, setSaving]         = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [sending, setSending]       = useState<string | null>(null);
  const [toast, setToast]           = useState<Toast>(null);

  useEffect(() => {
    fetchMessages(lead.id).then(setMessages);
  }, [lead.id]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleSave() {
    setSaving(true);
    await updateLeadStage(lead.id, stage);
    await updateLeadNotes(lead.id, notes);
    setSaving(false);
    onUpdated();
    onClose();
  }

  async function handleDelete() {
    await deleteLead(lead.id);
    onUpdated();
    onClose();
  }

  async function handleFollowUp(templateKey: string) {
    setSending(templateKey);
    const currentLead = { ...lead, notes };
    const ok = await sendFollowUp(currentLead, templateKey);
    setSending(null);
    if (ok) {
      const tpl = FOLLOWUP_TEMPLATES.find(t => t.key === templateKey);
      setToast({ ok: true, msg: `${tpl?.label} enviado!` });
      const now  = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      const note = `[${now}] ✅ Follow-up enviado: ${tpl?.label}`;
      setNotes((prev: string) => prev ? `${prev}\n${note}` : note);
    } else {
      setToast({ ok: false, msg: 'Erro ao enviar. Verifique a instância.' });
    }
  }

  const displayName = lead.name || lead.whatsapp_name || 'Lead';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Toast */}
        {toast && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg text-sm font-semibold transition-all ${
            toast.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-lg">{displayName[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">{displayName}</p>
              <p className="text-sm text-slate-400">+{lead.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Quick actions */}
          <div className="flex gap-3">
            <a href={`tel:+${lead.phone}`}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-2xl text-sm shadow-lg shadow-blue-500/25">
              <Phone size={16} /> Ligar
            </a>
            <a href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=Lead: ${encodeURIComponent(lead.name || lead.whatsapp_name || 'Lead')} - %2B${lead.phone}`}
              target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 rounded-2xl text-sm shadow-lg shadow-green-500/25">
              <MessageCircle size={16} /> WhatsApp Neres
            </a>
          </div>

          {/* ── Follow-up agressivo ─────────────── */}
          <div className="border border-orange-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowFollowup(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Send size={15} className="text-orange-500" />
                <span className="text-sm font-bold text-orange-700">Follow-up Automático</span>
                <span className="text-xs bg-orange-200 text-orange-700 font-bold px-2 py-0.5 rounded-full">UAZAPI</span>
              </div>
              {showFollowup
                ? <ChevronUp size={16} className="text-orange-400" />
                : <ChevronDown size={16} className="text-orange-400" />
              }
            </button>

            {showFollowup && (
              <div className="p-3 space-y-2 bg-white">
                <p className="text-xs text-slate-400 px-1">Envia via WhatsApp da instância Probel. Registrado nas notas.</p>
                {FOLLOWUP_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.key}
                    onClick={() => handleFollowUp(tpl.key)}
                    disabled={!!sending}
                    className="w-full flex items-center justify-between px-3.5 py-3 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-xl text-left transition disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{tpl.label}</p>
                      <p className="text-xs text-slate-400">{tpl.description}</p>
                    </div>
                    {sending === tpl.key
                      ? <span className="text-xs text-orange-500 font-bold">Enviando...</span>
                      : <Send size={14} className="text-slate-400 shrink-0" />
                    }
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Summary + Score */}
          {lead.summary && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-purple-600">🤖 Análise IA</p>
                {lead.score != null && (
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    lead.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    lead.score >= 40 ? 'bg-amber-100 text-amber-700' :
                                      'bg-rose-100 text-rose-600'
                  }`}>
                    {lead.score}% conversão
                  </span>
                )}
              </div>
              <p className="text-sm text-purple-800">{lead.summary}</p>
            </div>
          )}

          {/* Stage */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Etapa do Funil</label>
            <select value={stage} onChange={e => setStage(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Anotações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              placeholder="Preferências, objeções, próximo passo..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>

          {/* Message history */}
          {messages.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Histórico da Conversa</p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs px-3.5 py-2.5 rounded-2xl text-sm ${
                      m.direction === 'inbound'
                        ? 'bg-slate-100 text-slate-800 rounded-tl-sm'
                        : 'bg-green-600 text-white rounded-tr-sm'
                    }`}>
                      <p>{m.body}</p>
                      <p className={`text-[10px] mt-1 ${m.direction === 'inbound' ? 'text-slate-400' : 'text-green-200'}`}>
                        {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.length === 0 && lead.first_message && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 mb-1">Primeira mensagem</p>
              <p className="text-sm text-slate-700">{lead.first_message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex gap-3">
          {confirmDel ? (
            <button onClick={handleDelete}
              className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-2xl text-sm">
              Confirmar exclusão
            </button>
          ) : (
            <button onClick={() => setConfirmDel(true)}
              className="p-3 rounded-2xl bg-slate-100 hover:bg-red-50 hover:text-red-500 transition">
              <Trash2 size={18} className="text-slate-400" />
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-2xl text-sm transition disabled:opacity-50">
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
