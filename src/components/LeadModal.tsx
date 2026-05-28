import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Phone, MessageCircle, Save, Trash2, Send, ChevronDown, ChevronUp, CheckCircle, XCircle, Sparkles, Paperclip, Mic, Square, FileText, Download } from 'lucide-react';
import {
  STAGES, FOLLOWUP_TEMPLATES,
  fetchMessages, updateLeadStage, updateLeadNotes, deleteLead, sendFollowUp, analyzeLeadAI,
  sendWhatsApp, sendMediaWhatsApp, sendPttWhatsApp, deleteMessage,
} from '../lib/api';
import { supabase } from '../lib/supabase';

type Toast = { ok: boolean; msg: string } | null;

const aiCache = new Map<string, { result: any; at: number }>();
const CACHE_TTL = 15 * 60 * 1000;

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
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [chatText, setChatText]     = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [recording, setRecording]   = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [audioBlob, setAudioBlob]   = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendingMedia, setSendingMedia] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const [copied, setCopied]         = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const refreshMessages = useCallback(() => {
    fetchMessages(lead.id).then(setMessages);
  }, [lead.id]);

  useEffect(() => {
    refreshMessages();

    // Realtime: atualiza conversa quando nova mensagem chega no lead aberto
    const ch = supabase
      .channel(`sp_msgs_modal_${lead.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'sp_messages',
        filter: `lead_id=eq.${lead.id}`,
      }, () => refreshMessages())
      .subscribe();

    // Fallback: atualiza a cada 8s enquanto o modal está aberto
    const pollId = setInterval(refreshMessages, 8_000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(pollId);
    };
  }, [lead.id, refreshMessages]);

  // Auto-trigger análise se lead tem mensagens nas últimas 24h
  useEffect(() => {
    if (!lead.last_message_at) return;
    const mins = Math.floor((Date.now() - new Date(lead.last_message_at).getTime()) / 60000);
    if (mins < 1440) {
      const t = setTimeout(() => handleAnalyze(), 800);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleAnalyze(force = false) {
    const cached = aiCache.get(lead.id);
    if (!force && cached && Date.now() - cached.at < CACHE_TTL) {
      setAiAnalysis(cached.result);
      return;
    }
    setAiLoading(true);
    const result = await analyzeLeadAI(lead.id);
    if (result) aiCache.set(lead.id, { result, at: Date.now() });
    setAiAnalysis(result);
    setAiLoading(false);
  }

  function fmtSecs(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function fmtFileSize(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  }

  async function handleChatSend(e: React.FormEvent) {
    e.preventDefault();
    if (!chatText.trim() || chatSending) return;
    setChatSending(true);
    await sendWhatsApp(lead.phone, chatText.trim());
    setChatText('');
    setChatSending(false);
    setTimeout(() => fetchMessages(lead.id).then(setMessages), 1500);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: mimeType }));
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current!);
      };
      mediaRecorderRef.current = mr;
      mr.start(100);
      setRecording(true);
      setRecordSecs(0);
      timerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
    } catch { alert('Microfone não disponível ou sem permissão.'); }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleSendMedia() {
    if (!selectedFile && !audioBlob) return;
    setSendingMedia(true);
    if (audioBlob) {
      await sendPttWhatsApp(lead.phone, audioBlob, lead.id);
      setAudioBlob(null); setRecordSecs(0);
    } else if (selectedFile) {
      await sendMediaWhatsApp(lead.phone, selectedFile, lead.id);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setSendingMedia(false);
    setTimeout(() => fetchMessages(lead.id).then(setMessages), 2000);
  }

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

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayName = lead.name || lead.whatsapp_name || 'Lead';

  const urgencyStyle = {
    alta:  { bg: 'bg-red-100',   text: 'text-red-700',   dot: '🔴' },
    media: { bg: 'bg-amber-100', text: 'text-amber-700', dot: '🟡' },
    baixa: { bg: 'bg-green-100', text: 'text-green-700', dot: '🟢' },
  }[aiAnalysis?.urgencia as string] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: '⚪' };

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

          {/* ── Copiloto IA ─────────────────────────────────── */}
          <div className="border border-violet-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => handleAnalyze(true)}
              disabled={aiLoading}
              className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 hover:bg-violet-100 transition text-left disabled:opacity-70"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className={`${aiLoading ? 'animate-spin' : ''} text-violet-500`} />
                <span className="text-sm font-bold text-violet-700">Copiloto IA</span>
                {aiLoading && <span className="text-xs text-violet-400 animate-pulse">Analisando...</span>}
              </div>
              {!aiLoading && (
                <span className="text-xs font-bold text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">
                  {aiAnalysis ? 'Reanalisar' : 'Analisar'}
                </span>
              )}
            </button>

            {aiAnalysis && (
              <div className="p-4 space-y-3 border-t border-violet-100">
                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${urgencyStyle.bg} ${urgencyStyle.text}`}>
                    {urgencyStyle.dot} {(aiAnalysis.urgencia ?? '').toUpperCase()}
                  </span>
                  {aiAnalysis.intencao && (
                    <span className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full">
                      {aiAnalysis.intencao}
                    </span>
                  )}
                  {aiAnalysis.stage_sugerido && aiAnalysis.stage_sugerido !== lead.stage && (
                    <span className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                      → {STAGES.find(s => s.key === aiAnalysis.stage_sugerido)?.label ?? aiAnalysis.stage_sugerido}
                    </span>
                  )}
                </div>

                {/* Observação */}
                {aiAnalysis.observacao && (
                  <p className="text-xs text-slate-500 italic leading-relaxed">
                    💡 {aiAnalysis.observacao}
                  </p>
                )}

                {/* Resposta sugerida — colapsável */}
                {aiAnalysis.resposta_sugerida && (
                  <div className="rounded-xl border border-violet-100 overflow-hidden">
                    <button
                      onClick={() => setShowSuggestion(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-violet-50 hover:bg-violet-100 transition text-left"
                    >
                      <span className="text-xs font-bold text-violet-600">💬 Resposta sugerida</span>
                      {showSuggestion
                        ? <ChevronUp size={13} className="text-violet-400" />
                        : <ChevronDown size={13} className="text-violet-400" />}
                    </button>
                    {showSuggestion && (
                      <div className="bg-white px-3 pb-3 pt-2 border-t border-violet-100">
                        <p className="text-sm text-violet-900 whitespace-pre-wrap leading-relaxed">
                          {aiAnalysis.resposta_sugerida}
                        </p>
                        <div className="flex gap-2 mt-2.5">
                          <button
                            onClick={() => { setChatText(aiAnalysis.resposta_sugerida); setShowSuggestion(false); }}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 px-2.5 py-1 rounded-lg transition"
                          >
                            ✏️ Usar no chat
                          </button>
                          <button
                            onClick={() => handleCopy(aiAnalysis.resposta_sugerida)}
                            className="flex items-center gap-1.5 text-xs font-bold text-violet-500 hover:text-violet-700 transition"
                          >
                            {copied ? <CheckCircle size={12} /> : '📋'}
                            {copied ? 'Copiado!' : 'Copiar mensagem'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Mensagens rápidas ───────────────────────── */}
          <div className="border border-sky-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowFollowup(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-sky-50 hover:bg-sky-100 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Send size={15} className="text-sky-500" />
                <span className="text-sm font-bold text-sky-700">Mensagens Rápidas</span>
                <span className="text-xs bg-sky-200 text-sky-700 font-bold px-2 py-0.5 rounded-full">WhatsApp</span>
              </div>
              {showFollowup
                ? <ChevronUp size={16} className="text-sky-400" />
                : <ChevronDown size={16} className="text-sky-400" />
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
                    className="w-full flex items-center justify-between px-3.5 py-3 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 rounded-xl text-left transition disabled:opacity-50"
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

          {/* AI Summary legado — só mostra se ainda não há análise nova */}
          {lead.summary && !aiAnalysis && (
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

          {/* Message history */}
          {messages.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Histórico da Conversa</p>
              <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1">
                {messages.map(m => {
                  const isIn = m.direction === 'inbound';
                  const time = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const hasMedia = m.media_type && m.media_url;
                  const bodyIsPlaceholder = m.body && ['[image]','[audio]','[video]','[document]','[sticker]'].includes(m.body);
                  const showBody = m.body && !bodyIsPlaceholder;
                  return (
                    <div key={m.id} className={`group flex items-end gap-1 ${isIn ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        isIn ? 'bg-slate-100 text-slate-800 rounded-tl-sm' : 'bg-green-600 text-white rounded-tr-sm'
                      }`}>
                        {hasMedia && m.media_type === 'image' && (
                          <a href={m.media_url} target="_blank" rel="noreferrer">
                            <img src={m.media_url} alt="imagem" className="w-full max-w-[240px] rounded-xl mb-1 cursor-zoom-in" />
                          </a>
                        )}
                        {hasMedia && m.media_type === 'audio' && (
                          <div className="mb-1 w-full min-w-[200px]">
                            <audio controls src={m.media_url} className="w-full" style={{ height: '38px' }} />
                          </div>
                        )}
                        {hasMedia && m.media_type === 'video' && (
                          <video controls src={m.media_url} className="w-full max-w-[240px] rounded-xl mb-1" />
                        )}
                        {hasMedia && m.media_type === 'document' && (
                          <a href={m.media_url} target="_blank" rel="noreferrer"
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 text-xs font-medium ${isIn ? 'bg-white/60 text-blue-600 hover:text-blue-800' : 'bg-white/20 text-white'}`}>
                            <FileText size={14} className="shrink-0" />
                            <span className="truncate">{m.media_filename || 'Documento'}</span>
                            <Download size={12} className="shrink-0 ml-auto" />
                          </a>
                        )}
                        {hasMedia && m.media_type === 'sticker' && (
                          <img src={m.media_url} alt="sticker" className="w-20 h-20 mb-1" />
                        )}
                        {!hasMedia && bodyIsPlaceholder && (
                          <p className="italic opacity-50 text-xs">{m.body}</p>
                        )}
                        {showBody && <p className="leading-snug">{m.body}</p>}
                        <p className={`text-[10px] mt-1 text-right ${isIn ? 'text-slate-400' : 'text-green-200'}`}>{time}</p>
                      </div>
                      {/* Apagar mensagem enviada */}
                      {!isIn && (
                        <button type="button" title="Apagar mensagem"
                          onClick={async () => {
                            if (!confirm('Apagar esta mensagem do histórico?')) return;
                            await deleteMessage(m.id);
                            setMessages(prev => prev.filter(msg => msg.id !== m.id));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 text-red-300 hover:text-red-500 transition shrink-0">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : lead.first_message ? (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 mb-1">Primeira mensagem</p>
              <p className="text-sm text-slate-700">{lead.first_message}</p>
            </div>
          ) : null}

          {/* Atalho de sugestão IA perto do chat */}
          {aiAnalysis?.resposta_sugerida && (
            <div className="rounded-2xl border border-violet-200 overflow-hidden">
              <button
                onClick={() => setShowSuggestion(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-violet-50 hover:bg-violet-100 transition text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-violet-500 shrink-0" />
                  <span className="text-xs font-bold text-violet-700">Sugestão IA</span>
                </div>
                {showSuggestion ? <ChevronUp size={14} className="text-violet-400" /> : <ChevronDown size={14} className="text-violet-400" />}
              </button>
              {showSuggestion && (
                <div className="px-4 pb-3 pt-2 bg-white border-t border-violet-100">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{aiAnalysis.resposta_sugerida}</p>
                  <button
                    onClick={() => { setChatText(aiAnalysis.resposta_sugerida); setShowSuggestion(false); }}
                    className="mt-2 flex items-center gap-1.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 px-3 py-1.5 rounded-lg transition"
                  >
                    ✏️ Usar no chat
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chat input */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
            <p className="px-4 pt-3 text-xs font-semibold text-slate-500">Enviar mensagem</p>
            <input ref={fileInputRef} type="file" className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={e => { if (e.target.files?.[0]) { setSelectedFile(e.target.files[0]); setAudioBlob(null); } }} />

            <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5">
              {/* Arquivo selecionado */}
              {selectedFile && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200">
                  <Paperclip size={12} className="text-sky-500 shrink-0" />
                  <span className="flex-1 text-xs text-sky-700 truncate">{selectedFile.name} ({fmtFileSize(selectedFile.size)})</span>
                  <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
                </div>
              )}
              {/* Áudio pronto */}
              {audioBlob && !recording && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <Mic size={12} className="text-emerald-500 shrink-0" />
                  <span className="text-xs text-emerald-700">Áudio — {fmtSecs(recordSecs)}</span>
                  <button type="button" onClick={() => { setAudioBlob(null); setRecordSecs(0); }}
                    className="ml-auto text-slate-400 hover:text-slate-600 text-sm">✕</button>
                </div>
              )}
              {/* Gravando */}
              {recording && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-xs text-red-600 font-bold">Gravando... {fmtSecs(recordSecs)}</span>
                  <button type="button" onClick={stopRecording}
                    className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-100 text-red-600 text-xs font-bold">
                    <Square size={10} /> Parar
                  </button>
                </div>
              )}

              <form onSubmit={handleChatSend} className="flex gap-1.5">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl border bg-white border-slate-200 text-slate-400 hover:text-slate-600 transition shrink-0" title="Arquivo / Imagem">
                  <Paperclip size={14} />
                </button>
                <button type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={!!selectedFile || !!audioBlob}
                  className={`p-2 rounded-xl border transition shrink-0 disabled:opacity-30 ${recording ? 'bg-red-50 border-red-200 text-red-500 animate-pulse' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                  title={recording ? 'Parar gravação' : 'Gravar áudio'}>
                  <Mic size={14} />
                </button>
                {!audioBlob && !selectedFile && !recording && (
                  <textarea
                    value={chatText}
                    onChange={e => { setChatText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (chatText.trim() && !chatSending) handleChatSend(e as any); } }}
                    placeholder="Digite a mensagem... (Enter = enviar, Shift+Enter = nova linha)"
                    rows={1}
                    style={{ minHeight: '38px', maxHeight: '120px', resize: 'none', overflowY: 'auto' }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                )}
                {(audioBlob || selectedFile || recording) && <div className="flex-1" />}
                {(audioBlob || selectedFile) ? (
                  <button type="button" onClick={handleSendMedia} disabled={sendingMedia}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition disabled:opacity-50 shrink-0">
                    {sendingMedia ? '...' : <Send size={14} />}
                  </button>
                ) : (
                  <button type="submit" disabled={chatSending || !chatText.trim() || recording}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition disabled:opacity-50 shrink-0">
                    <Send size={14} />
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Anotações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Preferências, objeções, próximo passo..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
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
