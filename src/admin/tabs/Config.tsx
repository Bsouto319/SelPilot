import { useEffect, useState } from 'react';
import { Save, Bot, Phone, Zap, RefreshCw, Star } from 'lucide-react';
import { fetchConfig, setConfig } from '../../lib/adminApi';
import { supabase } from '../../lib/supabase';

export default function Config() {
  const [biaGlobal, setBiaGlobal]   = useState(false);
  const [fallbackPhone, setFallback] = useState('');
  const [finPhone, setFinPhone]      = useState('');
  const [pollStatus, setPollStatus]  = useState<string | null>(null);
  const [loading, setLoading]        = useState(true);
  const [saving, setSaving]          = useState(false);
  const [toast, setToast]            = useState('');

  // Links Google Review por loja
  const [linkNacional, setLinkNacional]     = useState('');
  const [linkCasaPark, setLinkCasaPark]     = useState('');
  const [linkShoppingId, setLinkShoppingId] = useState('');
  const [linkProdormir, setLinkProdormir]   = useState('');

  async function load() {
    setLoading(true);
    const [bia, fb, fin, gNac, gCasa, gShop, gPro] = await Promise.all([
      fetchConfig('bia_global_mode'),
      fetchConfig('fallback_phone'),
      fetchConfig('financeiro_phone'),
      fetchConfig('google_review_nacional'),
      fetchConfig('google_review_casapark'),
      fetchConfig('google_review_shoppingid'),
      fetchConfig('google_review_prodormir'),
    ]);
    setBiaGlobal(bia === 'true');
    setFallback(fb || '');
    setFinPhone(fin || '');
    setLinkNacional(gNac || '');
    setLinkCasaPark(gCasa || '');
    setLinkShoppingId(gShop || '');
    setLinkProdormir(gPro || '');
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleSaveBia() {
    setSaving(true);
    await setConfig('bia_global_mode', biaGlobal ? 'true' : 'false');
    if (biaGlobal) {
      await supabase.from('sp_leads').update({ ai_mode: true, updated_at: new Date().toISOString() })
        .not('stage', 'in', '("fechado","perdido")');
    }
    showToast('BIA atualizada!');
    setSaving(false);
  }

  async function handleSavePhones() {
    setSaving(true);
    await Promise.all([
      setConfig('fallback_phone', fallbackPhone),
      setConfig('financeiro_phone', finPhone),
    ]);
    showToast('Números salvos!');
    setSaving(false);
  }

  async function triggerPoll() {
    setPollStatus('Disparando...');
    try {
      const { data, error } = await supabase.functions.invoke('sellpilot-poll', {});
      if (error) throw error;
      setPollStatus(`✓ processed=${data?.processed ?? '?'} new=${data?.newMessages ?? '?'}`);
    } catch (e: any) {
      setPollStatus('Erro: ' + e.message);
    }
    setTimeout(() => setPollStatus(null), 5000);
  }

  if (loading) return <div className="text-white/30 text-sm text-center py-10">Carregando...</div>;

  return (
    <div className="space-y-5 max-w-xl">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white text-sm font-bold px-4 py-3 rounded-xl shadow-xl animate-pulse">
          {toast}
        </div>
      )}

      {/* BIA Global */}
      <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-600/30 flex items-center justify-center">
            <Bot size={18} className="text-violet-300" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">BIA Global</p>
            <p className="text-white/30 text-xs">Liga/desliga a IA para todos os leads ativos</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm font-semibold">Status atual</p>
            <p className={`text-sm font-black ${biaGlobal ? 'text-violet-400' : 'text-white/30'}`}>
              {biaGlobal ? '🤖 BIA ATIVA' : '⏸ BIA INATIVA'}
            </p>
          </div>
          <button
            onClick={() => setBiaGlobal(v => !v)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${biaGlobal ? 'bg-violet-600' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${biaGlobal ? 'translate-x-7' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <button onClick={handleSaveBia} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition disabled:opacity-60">
          <Save size={14} /> Salvar BIA
        </button>
      </div>

      {/* Phones */}
      <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-sky-600/30 flex items-center justify-center">
            <Phone size={18} className="text-sky-300" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Números de Notificação</p>
            <p className="text-white/30 text-xs">Para alertas de handoff e nota fiscal</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-white/50 text-xs font-bold mb-1 block">Fallback (handoff genérico)</label>
            <input value={fallbackPhone} onChange={e => setFallback(e.target.value)}
              placeholder="556199999999" className={INPUT} />
          </div>
          <div>
            <label className="text-white/50 text-xs font-bold mb-1 block">Setor Financeiro (nota fiscal)</label>
            <input value={finPhone} onChange={e => setFinPhone(e.target.value)}
              placeholder="556199999999" className={INPUT} />
          </div>
          <button onClick={handleSavePhones} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold transition disabled:opacity-60">
            <Save size={14} /> Salvar Números
          </button>
        </div>
      </div>

      {/* Poll manual */}
      <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/30 flex items-center justify-center">
            <Zap size={18} className="text-emerald-300" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Poll Manual</p>
            <p className="text-white/30 text-xs">Força um ciclo de leitura de mensagens agora</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={triggerPoll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition">
            <RefreshCw size={14} /> Disparar Poll
          </button>
          {pollStatus && <p className="text-white/50 text-xs font-mono">{pollStatus}</p>}
        </div>
      </div>

      {/* Google Review Links */}
      <div className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-600/30 flex items-center justify-center">
            <Star size={18} className="text-amber-300" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Links Google Review (Pós-Venda)</p>
            <p className="text-white/30 text-xs">BIA envia automaticamente após fechamento de venda</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Probel Conjunto Nacional', val: linkNacional, set: setLinkNacional },
            { label: 'Probel Casa Park', val: linkCasaPark, set: setLinkCasaPark },
            { label: 'Probel Shopping ID', val: linkShoppingId, set: setLinkShoppingId },
            { label: 'Prodormir', val: linkProdormir, set: setLinkProdormir },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-white/50 text-xs font-bold mb-1 block">{label}</label>
              <input value={val} onChange={e => set(e.target.value)}
                placeholder="https://g.page/r/..." className={INPUT} />
            </div>
          ))}
          <p className="text-white/20 text-[11px] mt-1">
            💡 O poll usa o primeiro link preenchido como padrão. Para múltiplas lojas, configure todos.
          </p>
          <button
            onClick={async () => {
              setSaving(true);
              await Promise.all([
                setConfig('google_review_nacional', linkNacional),
                setConfig('google_review_casapark', linkCasaPark),
                setConfig('google_review_shoppingid', linkShoppingId),
                setConfig('google_review_prodormir', linkProdormir),
              ]);
              showToast('Links salvos!');
              setSaving(false);
            }}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition disabled:opacity-60">
            <Save size={14} /> Salvar Links Google
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-rose-500/20 p-5" style={{ background: 'rgba(239,68,68,0.04)' }}>
        <p className="text-rose-400 font-bold text-sm mb-2">⚠️ Zona de Risco</p>
        <p className="text-white/30 text-xs mb-3">
          Para reset de dados ou configurações avançadas, acesse o Supabase diretamente via MCP ou dashboard.
          Projeto: <span className="font-mono text-white/50">pvphgusjofufwtyiyviu</span>
        </p>
        <a
          href="https://supabase.com/dashboard/project/pvphgusjofufwtyiyviu"
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-sm font-semibold hover:bg-rose-500/25 transition"
        >
          Abrir Supabase Dashboard →
        </a>
      </div>
    </div>
  );
}

const INPUT = 'w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 transition font-mono';
