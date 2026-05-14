import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Download, RefreshCw, Users, TrendingUp, CheckCircle2, BarChart3, FileText } from 'lucide-react';
import Pipeline from './components/Pipeline';
import MobileLeadList from './components/MobileLeadList';
import LeadModal from './components/LeadModal';
import ReportModal from './components/ReportModal';
import ConnectionStatus from './components/ConnectionStatus';
import { fetchLeads, fetchStats, exportLeadsCSV } from './lib/api';
import { supabase } from './lib/supabase';

export default function App() {
  const [leads, setLeads]       = useState<any[]>([]);
  const [stats, setStats]       = useState({ hoje: 0, negociando: 0, fechados: 0, total: 0 });
  const [search, setSearch]     = useState('');
  const [selected, setSelected]   = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const searchRef = useRef(search);
  searchRef.current = search;

  const load = useCallback(async (q?: string) => {
    const query = q !== undefined ? q : searchRef.current;
    const [l, s] = await Promise.all([fetchLeads(query), fetchStats()]);
    setLeads(l);
    setStats(s);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  // Realtime — atualiza ao mudar qualquer lead
  useEffect(() => {
    const channel = supabase
      .channel('sp_leads_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sp_leads' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearch(v);
    fetchLeads(v).then(setLeads);
  }

  const statCards = [
    { label: 'Leads Hoje',  value: stats.hoje,       icon: Users,        bg: 'bg-sky-500',     shadow: 'shadow-sky-500/30'     },
    { label: 'Negociando',  value: stats.negociando, icon: TrendingUp,   bg: 'bg-amber-500',   shadow: 'shadow-amber-500/30'   },
    { label: 'Fechados',    value: stats.fechados,   icon: CheckCircle2, bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/30' },
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
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 bg-violet-600/80 hover:bg-violet-600 border border-violet-500/30 text-white font-semibold px-3 py-2.5 rounded-xl text-sm transition shadow-lg shadow-violet-500/20"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">Relatório</span>
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

      {/* ── Pipeline (desktop) / Lista (mobile) ─────────────────── */}
      <main className="flex-1 overflow-hidden min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            Carregando leads...
          </div>
        ) : (
          <>
            {/* Desktop: kanban */}
            <div className="hidden sm:block h-full px-6 pb-6">
              <Pipeline leads={leads} onSelect={setSelected} />
            </div>
            {/* Mobile: lista vertical */}
            <div className="sm:hidden h-full overflow-y-auto">
              <MobileLeadList leads={leads} onSelect={setSelected} />
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
    </div>
  );
}
