import { useEffect, useState } from 'react';
import { DollarSign, Store, Users, MessageSquare, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { fetchAdminStats } from '../../lib/adminApi';

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="rounded-2xl border border-white/10 p-5 flex items-center gap-4"
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-black text-white leading-none">{value}</p>
        <p className="text-white/40 text-xs font-bold tracking-wider uppercase mt-1">{label}</p>
        {sub && <p className="text-white/25 text-[11px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Overview() {
  const [stats, setStats]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    const s = await fetchAdminStats();
    setStats(s);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-white/30 text-sm">Carregando...</div>
  );

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
  const fmtMrr = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* MRR destaque */}
      <div className="rounded-2xl border border-violet-500/30 p-6 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(109,40,217,0.08) 100%)' }}>
        <div>
          <p className="text-violet-300/60 text-xs font-black tracking-widest uppercase mb-1">MRR Total</p>
          <p className="text-5xl font-black text-white">{fmtMrr(stats.mrr)}<span className="text-xl text-white/30 ml-1">/mês</span></p>
          <p className="text-violet-300/50 text-sm mt-1">{stats.activeClients} cliente{stats.activeClients !== 1 ? 's' : ''} ativo{stats.activeClients !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/40 flex items-center justify-center">
            <DollarSign size={26} className="text-violet-300" />
          </div>
          <button onClick={load} disabled={refreshing} className="text-violet-400/50 hover:text-violet-300 transition">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Clientes ativos"    value={stats.activeClients}     icon={Store}        color="bg-emerald-600"  />
        <StatCard label="Total clientes"     value={stats.totalClients}      icon={Store}        color="bg-sky-600"      />
        <StatCard label="Leads hoje"         value={stats.leadsHoje}         icon={Users}        color="bg-amber-500"    />
        <StatCard label="Total de leads"     value={fmt(stats.totalLeads)}   icon={TrendingUp}   color="bg-indigo-600"   />
        <StatCard label="Msgs hoje"          value={fmt(stats.msgsHoje)}     icon={MessageSquare} color="bg-teal-600"    />
        <StatCard
          label="Handoffs pendentes"
          value={stats.handoffPendente}
          icon={AlertTriangle}
          color={stats.handoffPendente > 0 ? 'bg-rose-600' : 'bg-slate-600'}
          sub={stats.handoffPendente > 0 ? 'Clientes aguardando atendimento' : 'Tudo em dia ✓'}
        />
      </div>

      {/* Dicas rápidas */}
      <div className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-white/50 text-xs font-black tracking-widest uppercase mb-3">Próximas ações</p>
        <ul className="space-y-2">
          {stats.handoffPendente > 0 && (
            <li className="flex items-center gap-2 text-sm text-rose-300">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              {stats.handoffPendente} lead{stats.handoffPendente > 1 ? 's' : ''} em handoff aguardando atendimento → aba Suporte
            </li>
          )}
          {stats.leadsHoje === 0 && (
            <li className="flex items-center gap-2 text-sm text-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
              Nenhum lead novo hoje ainda
            </li>
          )}
          {stats.leadsHoje > 0 && (
            <li className="flex items-center gap-2 text-sm text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              {stats.leadsHoje} novo{stats.leadsHoje > 1 ? 's leads' : ' lead'} chegaram hoje
            </li>
          )}
          {stats.activeClients < stats.totalClients && (
            <li className="flex items-center gap-2 text-sm text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              {stats.totalClients - stats.activeClients} cliente{stats.totalClients - stats.activeClients > 1 ? 's' : ''} não ativo{stats.totalClients - stats.activeClients > 1 ? 's' : ''} — verifique plano
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
