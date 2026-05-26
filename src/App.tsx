import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Download, RefreshCw, Users, TrendingUp, CheckCircle2, BarChart3, FileText, CalendarDays, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import Pipeline from './components/Pipeline';
import LeadModal from './components/LeadModal';
import ReportModal from './components/ReportModal';
import ConnectionStatus from './components/ConnectionStatus';
import AdminApp from './admin/AdminApp';
import { fetchLeads, fetchStats, exportLeadsCSV, updateLeadAiMode, fetchBiaGlobalMode, setBiaGlobalMode } from './lib/api';
import { supabase } from './lib/supabase';

export default function App() {
  const [leads, setLeads]       = useState<any[]>([]);
  const [stats, setStats]       = useState({ hoje: 0, negociando: 0, fechados: 0, total: 0 });
  const [search, setSearch]     = useState('');
  const [selected, setSelected]   = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [biaActive, setBiaActive] = useState(false);
  const [biaLoading, setBiaLoading] = useState(false);
  const [newLeadAlert, setNewLeadAlert] = useState(false);
  const [newMsgAlert, setNewMsgAlert]   = useState(false);
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('sp_sound_muted') === 'true');
  const [showAdmin, setShowAdmin] = useState(false);

  const searchRef = useRef(search);
  searchRef.current = search;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  function playNewLeadSound() {
    if (mutedRef.current) return;
    try {
      const ctx = new AudioContext();
      ([[ 880, 0, 0.15 ], [ 1100, 0.18, 0.15 ]] as [number,number,number][]).forEach(([freq, start, dur]) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
      });
      setTimeout(() => ctx.close(), 1000);
    } catch { /* AudioContext not available */ }
  }

  function playNewMessageSound() {
    if (mutedRef.current) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.25);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
      setTimeout(() => ctx.close(), 500);
    } catch { /* AudioContext not available */ }
  }

  const load = useCallback(async (q?: string) => {
    const query = q !== undefined ? q : searchRef.current;
    const [l, s] = await Promise.all([fetchLeads(query), fetchStats()]);
    setLeads(l);
    setStats(s);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    fetchBiaGlobalMode().then(setBiaActive);
  }, []);

  // Realtime — beep e badge em novo lead; beep em mensagem recebida
  useEffect(() => {
    const leadsChannel = supabase
      .channel('sp_leads_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sp_leads' }, () => {
        playNewLeadSound();
        setNewLeadAlert(true);
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sp_leads' }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sp_leads' }, () => load())
      .subscribe();

    const msgsChannel = supabase
      .channel('sp_messages_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sp_messages' }, (payload: any) => {
        if (payload.new?.direction === 'inbound') {
          playNewMessageSound();
          setNewMsgAlert(true);
        }
        load();
      })
      .subscribe();

    // Fallback: atualiza a cada 15s caso o Realtime caia
    const fallbackId = setInterval(() => load(), 15_000);

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(msgsChannel);
      clearInterval(fallbackId);
    };
  }, [load]);

  async function handleToggleBiaGlobal() {
    const next = !biaActive;
    setBiaActive(next);
    setBiaLoading(true);
    await setBiaGlobalMode(next);
    await load();
    setBiaLoading(false);
  }

  async function handleToggleAi(id: string, newMode: boolean) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ai_mode: newMode } : l));
    await updateLeadAiMode(id, newMode);
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearch(v);
    fetchLeads(v).then(setLeads);
  }

  const statCards = [
    { label: 'Leads Hoje',  value: stats.hoje,       icon: Users,        bg: 'bg-sky-500',     shadow: 'shadow-sky-500/30'     },
    { label: 'Negociando',  value: stats.negociando, icon: TrendingUp,   bg: 'bg-amber-500',   shadow: 'shadow-amber-500/30'   },
    { label: 'Visitas',     value: stats.fechados,   icon: CheckCircle2, bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/30' },
    { label: 'Total',       value: stats.total,      icon: BarChart3,    bg: 'bg-violet-500',  shadow: 'shadow-violet-500/30'  },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(160deg, #0e1f4a 0%, #162d6b 40%, #0f2057 100%)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-white/10" style={{ background: 'rgba(10,20,60,0.7)', backdropFilter: 'blur(12px)' }}>
        {/* Top row */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <span className="text-white font-black text-sm sm:text-base">S</span>
            </div>
            <div>
              <p className="text-white font-black text-lg sm:text-xl leading-none tracking-tight">SellPilot</p>
              <p className="text-blue-200/50 text-xs font-bold tracking-wide">LOJA PROBEL</p>
            </div>
          </div>

          {/* Vendedor em destaque */}
          <div className="hidden sm:flex items-center gap-2.5 ml-2 px-3 py-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow shadow-emerald-500/40 shrink-0">
              <span className="text-white font-black text-xs">C</span>
            </div>
            <div className="leading-tight">
              <p className="text-emerald-300 font-black text-sm leading-none">Cauã</p>
              <p className="text-emerald-500/60 text-[10px] font-bold tracking-wide">VENDEDOR</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Online" />
          </div>

          {/* Search — hidden on mobile (shown below) */}
          <div className="relative max-w-md w-full hidden sm:block">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Buscar por nome ou telefone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-3">
            <ConnectionStatus />

            {/* Botão global BIA */}
            <button
              onClick={handleToggleBiaGlobal}
              disabled={biaLoading}
              title={biaActive ? 'Bia ativa — clique para desligar' : 'Bia inativa — clique para ligar'}
              className={`flex items-center gap-1.5 font-black px-3 py-2.5 rounded-xl text-sm border transition-all shadow-lg ${
                biaActive
                  ? 'bg-violet-600 hover:bg-violet-700 border-violet-500/50 text-white shadow-violet-500/30'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/40'
              } ${biaLoading ? 'opacity-60 cursor-wait' : ''}`}
            >
              <span className="text-base leading-none">🤖</span>
              <span className="hidden sm:inline">{biaActive ? 'BIA ON' : 'BIA OFF'}</span>
            </button>

            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 bg-violet-600/80 hover:bg-violet-600 border border-violet-500/30 text-white font-semibold px-3 py-2.5 rounded-xl text-sm transition shadow-lg shadow-violet-500/20"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">Relatório</span>
            </button>
            <button
              onClick={() => setMuted(m => { const next = !m; localStorage.setItem('sp_sound_muted', next ? 'true' : 'false'); return next; })}
              title={muted ? 'Som desligado — clique para ligar' : 'Som ligado — clique para desligar'}
              className={`p-2.5 rounded-xl border transition ${muted ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/50'}`}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              onClick={() => { setRefreshing(true); load(); }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
              title="Atualizar"
            >
              <RefreshCw size={15} className={`text-white/60 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => exportLeadsCSV(leads)}
              className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
            >
              <Download size={14} />
              <span>Exportar CSV</span>
            </button>

            {/* Admin — botão discreto, sem label */}
            <button
              onClick={() => setShowAdmin(true)}
              title="Admin"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/30 transition"
            >
              <ShieldCheck size={15} className="text-white/30 hover:text-violet-300" />
            </button>
          </div>
        </div>

        {/* Search bar — mobile only */}
        <div className="px-4 pb-3 sm:hidden">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Buscar por nome ou telefone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>
        </div>
      </header>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(({ label, value, icon: Icon, bg, shadow }) => (
          <div key={label} className="border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:bg-white/[0.06] transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shadow-lg ${shadow} flex-shrink-0`}>
              <Icon size={22} className="text-white" />
            </div>
            <div>
              <p className="text-4xl font-black text-white leading-none">{loading ? '–' : value}</p>
              <p className="text-blue-200/60 text-xs font-black tracking-widest uppercase mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtro por dia ───────────────────────────────────────── */}
      {(() => {
        const today = new Date();
        const fmt = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const da = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${da}`;
        };
        const todayStr = fmt(today);
        const yest = new Date(today); yest.setDate(today.getDate() - 1);
        const yesterdayStr = fmt(yest);
        const filteredCount = dayFilter ? leads.filter(l => {
          const ref = l.last_message_at ?? l.created_at;
          const d = new Date(ref);
          const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          return s === dayFilter;
        }).length : leads.length;

        return (
          <div className="flex-shrink-0 px-6 pb-2 flex items-center gap-2 flex-wrap">
            <CalendarDays size={14} className="text-white/30" />
            {[
              { label: 'Todos', value: null },
              { label: 'Hoje', value: todayStr },
              { label: 'Ontem', value: yesterdayStr },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => setDayFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${
                  dayFilter === opt.value
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <input
              type="date"
              value={dayFilter && dayFilter !== (() => { const t=new Date(); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`; })() ? dayFilter : ''}
              onChange={e => setDayFilter(e.target.value || null)}
              className="px-2 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 [color-scheme:dark] cursor-pointer"
            />
            {dayFilter && (
              <span className="text-xs font-bold text-white/40 ml-1">
                {filteredCount} lead{filteredCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      })()}

      {/* ── Pipeline (desktop) / Lista (mobile) ─────────────────── */}
      <main className="flex-1 overflow-hidden min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            Carregando leads...
          </div>
        ) : (
          <>
            {/* Kanban sempre visível — scroll horizontal em telas pequenas */}
            <div className="block h-full px-6 pb-6">
              <Pipeline leads={leads} onSelect={setSelected} onToggleAi={handleToggleAi} dayFilter={dayFilter} />
            </div>
          </>
        )}
      </main>

      {/* ── Lead Modal ──────────────────────────────────────────── */}
      {selected && (
        <LeadModal
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); setSelected(null); }}
        />
      )}

      {/* ── Report Modal ─────────────────────────────────────────── */}
      {showReport && <ReportModal onClose={() => setShowReport(false)} />}

      {/* ── Admin overlay ────────────────────────────────────────── */}
      {showAdmin && (
        <div className="fixed inset-0 z-50">
          <AdminApp onExit={() => setShowAdmin(false)} />
        </div>
      )}

      {/* ── Alertas flutuantes ───────────────────────────────────── */}
      {(newLeadAlert || newMsgAlert) && (
        <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
          {newLeadAlert && (
            <button
              onClick={() => setNewLeadAlert(false)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-black text-white shadow-2xl border border-green-500/40 animate-pulse"
              style={{ background: 'rgba(16,100,50,0.95)', backdropFilter: 'blur(12px)' }}
            >
              <span className="text-base">🟢</span>
              <span>Novo Lead chegou!</span>
              <span className="text-white/50 text-xs font-bold ml-1">×</span>
            </button>
          )}
          {newMsgAlert && (
            <button
              onClick={() => setNewMsgAlert(false)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-black text-white shadow-2xl border border-amber-500/40 animate-pulse"
              style={{ background: 'rgba(120,80,0,0.95)', backdropFilter: 'blur(12px)' }}
            >
              <span className="text-base">💬</span>
              <span>Nova mensagem!</span>
              <span className="text-white/50 text-xs font-bold ml-1">×</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
