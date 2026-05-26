import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { fetchLeads, fetchStats } from '../../lib/api';
import LeadModal from '../../components/LeadModal';
import { STAGES } from '../../lib/api';

const STAGE_BADGE: Record<string, string> = {
  novo_lead:        'bg-green-500/15 text-green-400 border-green-500/25',
  em_contato:       'bg-sky-500/15 text-sky-400 border-sky-500/25',
  interessado:      'bg-amber-500/15 text-amber-400 border-amber-500/25',
  acompanhamento:   'bg-pink-500/15 text-pink-400 border-pink-500/25',
  proposta_enviada: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  negociando:       'bg-orange-500/15 text-orange-400 border-orange-500/25',
  fechado:          'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  perdido:          'bg-rose-500/15 text-rose-400 border-rose-500/25',
};

export default function Leads() {
  const [leads, setLeads]       = useState<any[]>([]);
  const [stats, setStats]       = useState({ hoje: 0, negociando: 0, fechados: 0, total: 0 });
  const [search, setSearch]     = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (q = '') => {
    setRefreshing(true);
    const [l, s] = await Promise.all([fetchLeads(q), fetchStats()]);
    setLeads(l);
    setStats(s);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = stageFilter ? leads.filter(l => l.stage === stageFilter) : leads;

  const fmtDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
      dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Hoje', v: stats.hoje },
          { label: 'Negociando', v: stats.negociando },
          { label: 'Visita/Fechado', v: stats.fechados },
          { label: 'Total', v: stats.total },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/8 p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-2xl font-black text-white">{loading ? '–' : s.v}</p>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); load(e.target.value); }}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 [color-scheme:dark]">
          <option value="">Todos os estágios</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button onClick={() => load(search)} disabled={refreshing}
          className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Nome', 'Telefone', 'Estágio', 'Score', 'Vendedor', 'Última msg', 'IA'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-white/30 text-xs font-black tracking-wider uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(l => {
                const stageDef = STAGES.find(s => s.key === l.stage);
                return (
                  <tr key={l.id} onClick={() => setSelected(l)}
                    className="hover:bg-white/4 cursor-pointer transition">
                    <td className="px-4 py-3">
                      <p className="text-white font-semibold leading-none">{l.name || l.whatsapp_name || 'Sem nome'}</p>
                      {l.first_message && <p className="text-white/25 text-xs mt-0.5 truncate max-w-[160px]">{l.first_message}</p>}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs font-mono">+{l.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STAGE_BADGE[l.stage] || 'bg-white/10 text-white/50 border-white/10'}`}>
                        {stageDef?.label || l.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {l.score != null ? (
                        <span className={`text-xs font-black ${l.score >= 70 ? 'text-emerald-400' : l.score >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {l.score}%
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{l.vendedor?.nome || '—'}</td>
                    <td className="px-4 py-3 text-white/30 text-xs whitespace-nowrap">{fmtDate(l.last_message_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${l.ai_mode ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-white/25'}`}>
                        {l.ai_mode ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="py-10 text-center text-white/25 text-sm">Nenhum lead encontrado.</div>
          )}
          {loading && (
            <div className="py-10 text-center text-white/25 text-sm">Carregando leads...</div>
          )}
        </div>
      </div>

      <p className="text-white/20 text-xs text-right">{filtered.length} leads exibidos</p>

      {selected && (
        <LeadModal
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(search); setSelected(null); }}
        />
      )}
    </div>
  );
}
