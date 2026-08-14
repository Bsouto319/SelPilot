import { useEffect, useState, useRef } from 'react';
import { X, TrendingUp, Users, CheckCircle2, BarChart3, Lightbulb, Megaphone, AlertTriangle, Star, Download, Send, RefreshCw, CalendarDays } from 'lucide-react';
import { STAGES } from '../lib/api';

type Period = 'hoje' | 'semana' | 'mes' | 'tudo' | 'personalizado';

const PERIOD_LABELS: Record<Exclude<Period, 'personalizado'>, string> = {
  hoje: 'Hoje',
  semana: '7 dias',
  mes: '30 dias',
  tudo: 'Tudo',
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function today() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function ReportModal({ onClose }: { onClose: () => void }) {
  const [period, setPeriod]     = useState<Period>('semana');
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo]     = useState(today());
  const [report, setReport]     = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (period !== 'personalizado') fetchReport(period);
  }, [period]);

  function buildUrl(p: Period, mode?: string) {
    const base = `${SUPABASE_URL}/functions/v1/sellpilot-report`;
    const params = new URLSearchParams();
    if (p === 'personalizado') {
      params.set('from', dateFrom);
      params.set('to', dateTo);
    } else {
      params.set('period', p);
    }
    if (mode) params.set('mode', mode);
    return `${base}?${params}`;
  }

  async function fetchReport(p: Period) {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setReport(null);
    setError(null);
    try {
      const res = await fetch(buildUrl(p), { signal: abortRef.current.signal });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setReport(data);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError('Falha ao carregar relatório. Tente novamente.');
        console.error(e);
      }
    }
    setLoading(false);
  }

  function handleSendWhatsApp() {
    const m  = report?.metricas;
    const ia = report?.ia;
    if (!m) return;

    const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    const sep  = '━━━━━━━━━━━━━━━━━━━━';
    const periodLabel = period === 'personalizado'
      ? `${dateFrom} a ${dateTo}`
      : { hoje: 'hoje', semana: 'nos últimos 7 dias', mes: 'nos últimos 30 dias', tudo: 'em todo o histórico' }[period] ?? period;

    let msg = `📊 *Relatório SellPilot*\n`;
    msg += `📅 ${date}  |  _${periodLabel}_\n`;
    msg += `${sep}\n\n`;
    msg += `👥 *Leads recebidos:* ${m.total}\n`;
    msg += `✅ *Fechados:* ${m.fechados}`;
    if (m.total > 0) msg += ` _(${m.conversao}% conversão)_`;
    msg += `\n🔴 *Perdidos:* ${m.perdidos}\n🟡 *Ativos:* ${m.ativos}\n`;
    if (m.score_medio != null) msg += `🎯 *Score médio:* ${m.score_medio}%\n`;
    msg += `\n`;

    if (ia) {
      msg += `${sep}\n📝 *Análise:*\n${ia.resumo_executivo}\n\n`;
      if (ia.alerta) msg += `🚨 *ALERTA:* ${ia.alerta}\n\n`;
      if (ia.produtos_mais_pedidos?.length) {
        msg += `📦 *Mais pedidos:*\n`;
        ia.produtos_mais_pedidos.slice(0, 4).forEach((p: string, i: number) => { msg += `  ${i+1}. ${p}\n`; });
        msg += `\n`;
      }
      if (ia.objecoes_comuns?.length) {
        msg += `⚠️ *Objeções:*\n`;
        ia.objecoes_comuns.slice(0, 3).forEach((o: string) => { msg += `  • ${o}\n`; });
        msg += `\n`;
      }
      if (ia.sugestao_campanha) msg += `🚀 *Campanha:*\n${ia.sugestao_campanha}\n\n`;
      if (ia.insights?.length) {
        msg += `💡 *Insights:*\n`;
        ia.insights.slice(0, 3).forEach((ins: string, i: number) => { msg += `  ${i+1}. ${ins}\n`; });
        msg += `\n`;
      }
    }

    if (report.leads_quentes?.length) {
      msg += `${sep}\n🔥 *Top Leads:*\n`;
      report.leads_quentes.slice(0, 5).forEach((l: any) => {
        const stage = STAGES.find(s => s.key === l.stage);
        msg += `  • *${l.nome}* — ${l.score}% — ${stage?.label ?? l.stage}\n`;
        if (l.summary) msg += `    _${l.summary.slice(0, 80)}..._\n`;
      });
      msg += `\n`;
    }

    msg += `${sep}\n_SellPilot by BTechSouto_ 🤖`;

    const a = document.createElement('a');
    a.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePrint() {
    const style = document.createElement('style');
    style.id = 'sp-print-style';
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #report-print-area, #report-print-area * { visibility: visible !important; }
        #report-print-area {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          max-height: none !important;
          overflow: visible !important;
          background: white !important;
          padding: 24px !important;
          box-sizing: border-box !important;
        }
        #report-print-area * { max-height: none !important; overflow: visible !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById('sp-print-style')?.remove(), 500);
  }

  const m  = report?.metricas;
  const ia = report?.ia;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 print:static print:block print:p-0 print:bg-white">
      <div id="report-print-area" className="bg-[#0d1426] print:bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] flex flex-col border border-white/8 print:max-h-none print:max-w-none print:rounded-none print:border-0 print:shadow-none print:flex-none">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 print:border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg print:hidden">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-white print:text-slate-900 text-base leading-none">Relatório SellPilot</p>
              <p className="text-white/40 print:text-slate-500 text-xs mt-0.5">Loja Probel — análise IA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition print:hidden">
            <X size={18} className="text-white/50" />
          </button>
        </div>

        {/* Period tabs */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0 print:hidden space-y-2">
          <div className="flex gap-2">
            {(Object.keys(PERIOD_LABELS) as Exclude<Period, 'personalizado'>[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  period === p
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <button onClick={() => setPeriod('personalizado')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition ${
                period === 'personalizado'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}>
              <CalendarDays size={12} />
              Período
            </button>
            <button onClick={() => fetchReport(period)} className="ml-auto p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition">
              <RefreshCw size={13} className={`text-white/40 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Date picker row — shown only when "personalizado" is active */}
          {period === 'personalizado' && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <span className="text-[10px] text-white/40 font-bold uppercase shrink-0">De</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white/80 focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <span className="text-[10px] text-white/40 font-bold uppercase shrink-0">Até</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  max={today()}
                  onChange={e => setDateTo(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white/80 focus:outline-none [color-scheme:dark]"
                />
              </div>
              <button
                onClick={() => fetchReport('personalizado')}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition shrink-0"
              >
                Gerar
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4 print:overflow-visible print:flex-none">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              <p className="text-white/40 text-sm">Gerando análise com IA...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <AlertTriangle size={32} className="text-rose-400" />
              <p className="text-rose-300 text-sm">{error}</p>
              <button onClick={() => fetchReport(period)} className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white/70 text-sm rounded-xl transition">
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && report && report.metricas && (
            <>
              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
                {[
                  { label: 'Total Leads', value: m.total, icon: Users, color: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/30' },
                  { label: 'Visitas', value: m.fechados, icon: CheckCircle2, color: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/30' },
                  { label: 'Conversão', value: `${m.conversao}%`, icon: TrendingUp, color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/30' },
                  { label: 'Score Médio', value: m.score_medio ? `${m.score_medio}%` : '–', icon: Star, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/30' },
                ].map(({ label, value, icon: Icon, color, shadow }) => (
                  <div key={label} className="bg-white/5 print:bg-slate-50 border border-white/8 print:border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${shadow} shrink-0 print:hidden`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-black text-white print:text-slate-900 leading-none">{value}</p>
                      <p className="text-white/40 print:text-slate-500 text-[10px] font-medium">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Funil */}
              <div className="bg-white/5 print:bg-slate-50 border border-white/8 print:border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-white/60 print:text-slate-500 mb-3 uppercase tracking-wide">Distribuição no Funil</p>
                <div className="space-y-2">
                  {STAGES.map(s => {
                    const count = m.por_etapa[s.key] ?? 0;
                    const pct   = m.total > 0 ? Math.round((count / m.total) * 100) : 0;
                    if (count === 0) return null;
                    return (
                      <div key={s.key} className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-32 text-center shrink-0 ${s.color}`}>{s.label}</span>
                        <div className="flex-1 bg-white/10 print:bg-slate-200 rounded-full h-2">
                          <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-white/50 print:text-slate-500 w-10 text-right font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Analysis */}
              {ia && (
                <>
                  {/* Resumo executivo */}
                  <div className="bg-violet-500/10 print:bg-violet-50 border border-violet-500/20 print:border-violet-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 size={14} className="text-violet-400" />
                      <p className="text-xs font-bold text-violet-400 uppercase tracking-wide">Resumo Executivo</p>
                    </div>
                    <p className="text-sm text-violet-100 print:text-violet-900 leading-relaxed">{ia.resumo_executivo}</p>
                  </div>

                  {/* Alerta */}
                  {ia.alerta && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3">
                      <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-rose-200 print:text-rose-900">{ia.alerta}</p>
                    </div>
                  )}

                  {/* Produtos + Objeções */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {ia.produtos_mais_pedidos?.length > 0 && (
                      <div className="bg-white/5 print:bg-slate-50 border border-white/8 print:border-slate-200 rounded-2xl p-4">
                        <p className="text-xs font-bold text-white/50 print:text-slate-500 uppercase tracking-wide mb-2">📦 Mais Pedidos</p>
                        <ul className="space-y-1">
                          {ia.produtos_mais_pedidos.map((p: string, i: number) => (
                            <li key={i} className="text-sm text-white/80 print:text-slate-700 flex items-start gap-2">
                              <span className="text-emerald-400 font-bold text-xs mt-0.5">{i + 1}.</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ia.objecoes_comuns?.length > 0 && (
                      <div className="bg-white/5 print:bg-slate-50 border border-white/8 print:border-slate-200 rounded-2xl p-4">
                        <p className="text-xs font-bold text-white/50 print:text-slate-500 uppercase tracking-wide mb-2">⚠️ Objeções Comuns</p>
                        <ul className="space-y-1">
                          {ia.objecoes_comuns.map((o: string, i: number) => (
                            <li key={i} className="text-sm text-white/80 print:text-slate-700 flex items-start gap-2">
                              <span className="text-rose-400 font-bold text-xs mt-0.5">•</span>{o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Perfil lead quente */}
                  {ia.perfil_lead_quente && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star size={14} className="text-amber-400" />
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Perfil do Lead Quente</p>
                      </div>
                      <p className="text-sm text-amber-100 print:text-amber-900">{ia.perfil_lead_quente}</p>
                    </div>
                  )}

                  {/* Campanha */}
                  {ia.sugestao_campanha && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Megaphone size={14} className="text-emerald-400" />
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Campanha Sugerida</p>
                      </div>
                      <p className="text-sm text-emerald-100 print:text-emerald-900">{ia.sugestao_campanha}</p>
                    </div>
                  )}

                  {/* Insights */}
                  {ia.insights?.length > 0 && (
                    <div className="bg-white/5 print:bg-slate-50 border border-white/8 print:border-slate-200 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={14} className="text-yellow-400" />
                        <p className="text-xs font-bold text-white/50 print:text-slate-500 uppercase tracking-wide">Insights Estratégicos</p>
                      </div>
                      <ul className="space-y-2">
                        {ia.insights.map((ins: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/80 print:text-slate-700">
                            <span className="w-5 h-5 rounded-full bg-yellow-400/20 text-yellow-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            {ins}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Top leads */}
                  {report.leads_quentes?.length > 0 && (
                    <div className="bg-white/5 print:bg-slate-50 border border-white/8 print:border-slate-200 rounded-2xl p-4">
                      <p className="text-xs font-bold text-white/50 print:text-slate-500 uppercase tracking-wide mb-3">🔥 Top Leads</p>
                      <div className="space-y-2">
                        {report.leads_quentes.map((l: any, i: number) => {
                          const stage = STAGES.find(s => s.key === l.stage);
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shrink-0 print:hidden">
                                <span className="text-white text-xs font-bold">{(l.nome[0] || 'L').toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white print:text-slate-900 truncate">{l.nome}</p>
                                {l.summary && <p className="text-xs text-white/40 print:text-slate-500 truncate">{l.summary}</p>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {stage && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.color}`}>{stage.label}</span>}
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                  l.score >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                                  l.score >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                                  'bg-rose-500/20 text-rose-400'
                                }`}>{l.score}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && !error && report && report.metricas && (
          <div className="flex gap-3 px-5 py-4 border-t border-white/8 print:hidden flex-shrink-0">
            <button
              onClick={handleSendWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-2xl text-sm transition"
            >
              <Send size={15} />
              Compartilhar no WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold px-5 py-3 rounded-2xl text-sm transition"
            >
              <Download size={15} /> PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
