import { STAGES } from '../lib/api';

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

function formatTime(d: string) {
  const date = new Date(d);
  const now  = new Date();
  const hm   = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYest  = date.toDateString() === yesterday.toDateString();
  if (isToday) return `Hoje ${hm}`;
  if (isYest)  return `Ontem ${hm}`;
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hm}`;
}

function isSameDay(isoDate: string, dayStr: string): boolean {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}` === dayStr;
}

export default function Pipeline({ leads, onSelect, onToggleAi, dayFilter }: {
  leads: any[];
  onSelect: (l: any) => void;
  onToggleAi: (id: string, newMode: boolean) => void;
  dayFilter?: string | null;
}) {
  const byStage = (key: string) => leads
    .filter(l => l.stage === key)
    .filter(l => {
      if (!dayFilter) return true;
      const ref = l.last_message_at ?? l.created_at;
      return isSameDay(ref, dayFilter);
    })
    .sort((a, b) => {
      const at = new Date(a.last_message_at ?? a.created_at).getTime();
      const bt = new Date(b.last_message_at ?? b.created_at).getTime();
      return bt - at; // mais recente no topo
    });

  return (
    <div className="flex gap-2.5 h-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
      {STAGES.map(stage => {
        const items = byStage(stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden" style={{ width: 'calc((100vw - 96px - 24px) / 8)' }}>

            {/* Column header — full-width colored band */}
            <div
              className="px-3 py-3 flex items-center justify-between flex-shrink-0"
              style={{ backgroundColor: stage.headerBg }}
            >
              <span className="text-sm font-black text-white tracking-wider uppercase leading-none drop-shadow-md">
                {stage.label}
              </span>
              <span className="text-sm font-black bg-black/30 text-white px-2.5 py-0.5 rounded-full min-w-[26px] text-center">
                {items.length}
              </span>
            </div>

            {/* Cards area */}
            <div className="flex-1 overflow-y-auto space-y-2 p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full" style={{ background: 'rgba(10,20,55,0.5)' }}>
              {items.map(lead => {
                const isNew       = minutesSince(lead.created_at) < 60;
                const lastMsg     = lead.last_message_at ?? lead.created_at;
                const idleHours   = minutesSince(lastMsg) / 60;
                const semAtend    = !['fechado','perdido'].includes(lead.stage) && idleHours >= 2;
                const emAtend     = lead.vendedor_ativo_at && minutesSince(lead.vendedor_ativo_at) < 15;
                // handoff pendente: BIA mandou pra humano mas nenhum vendedor respondeu depois disso
                const handoffPendente = lead.handoff_at && minutesSince(lead.handoff_at) >= 3 &&
                  (!lead.vendedor_ativo_at || new Date(lead.vendedor_ativo_at) < new Date(lead.handoff_at));
                const semResposta = !['fechado','perdido'].includes(lead.stage) && !emAtend && (
                  (lead.unanswered_since_at && minutesSince(lead.unanswered_since_at) >= 30) || handoffPendente
                );
                const biaAtiva    = lead.last_outbound_by === 'bia' && !['fechado','perdido'].includes(lead.stage) && minutesSince(lastMsg) < 120 && !emAtend;
                const rawName = lead.name || lead.whatsapp_name;
                const displayName = rawName || `+${lead.phone}`;
                return (
                  <div key={lead.id} className="relative rounded-lg overflow-hidden">
                    {biaAtiva && (
                      <div className="absolute inset-0 border border-violet-400/50 animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }} />
                    )}
                  <button
                    onClick={() => onSelect(lead)}
                    className="w-full text-left rounded-lg transition-all duration-150 p-3 group border hover:border-white/25"
                    style={{
                      background: semResposta ? 'rgba(234,88,12,0.10)' : semAtend ? 'rgba(220,30,30,0.08)' : biaAtiva ? 'rgba(109,40,217,0.08)' : 'rgba(15,28,60,0.85)',
                      borderColor: semResposta ? 'rgba(251,146,60,0.45)' : semAtend ? 'rgba(239,68,68,0.35)' : biaAtiva ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.08)',
                      borderLeftWidth: 3,
                      borderLeftColor: semResposta ? '#f97316' : semAtend ? '#ef4444' : biaAtiva ? '#a78bfa' : stage.cardBorder,
                    }}
                  >
                    {/* Name row */}
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p className="text-sm font-black text-white truncate leading-tight flex-1">
                        {displayName}
                      </p>
                      {isNew && (
                        <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full text-white tracking-wide" style={{ backgroundColor: stage.headerBg }}>
                          NOVO
                        </span>
                      )}
                      {semAtend && !isNew && (
                        <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 tracking-wide border border-red-500/30">
                          SEM RETORNO
                        </span>
                      )}
                      {emAtend && (
                        <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 animate-pulse">
                          💬 ATENDENDO
                        </span>
                      )}
                      {semResposta && !emAtend && (
                        <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/25 text-orange-300 border border-orange-500/50 animate-pulse">
                          ❓ RESPONDER
                        </span>
                      )}
                      {biaAtiva && !semResposta && !emAtend && !isNew && (
                        <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-500/25 text-violet-300 border border-violet-500/50 animate-pulse">
                          👁 VER
                        </span>
                      )}
                    </div>

                    {/* Phone — só mostra se já tem nome real, senão o número já aparece como nome */}
                    {rawName && <p className="text-xs text-white/40 font-semibold mb-1.5">+{lead.phone}</p>}

                    {/* Bottom: linha 1 — vendedor + ícones + IA toggle */}
                    <div className="flex items-center justify-between mt-1.5 gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        {lead.last_outbound_by === 'bia' ? (
                          <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">🤖 BIA</span>
                        ) : (
                          <>
                            <div className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
                              <span className="text-white font-black text-[8px]">{(lead.vendedor?.nome ?? 'S')[0].toUpperCase()}</span>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-400/80 truncate">{lead.vendedor?.nome ?? 'Sem vendedor'}</span>
                          </>
                        )}
                        {lead.needs_invoice && (
                          <span className="shrink-0 text-[9px] font-black px-1 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30" title="Cliente solicitou nota fiscal">🧾</span>
                        )}
                        {(lead.followup_count ?? 0) > 0 && (
                          <span className="shrink-0 text-[9px] font-black px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30" title={`${lead.followup_count} follow-up(s) enviado(s)`}>
                            📬 {lead.followup_count}x
                          </span>
                        )}
                      </div>
                      {!['fechado','perdido'].includes(lead.stage) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleAi(lead.id, !lead.ai_mode); }}
                          title={lead.ai_mode ? 'IA ligada — clique para desligar' : 'IA desligada — clique para ligar'}
                          className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full border transition-all ${
                            lead.ai_mode
                              ? 'bg-violet-500/25 text-violet-300 border-violet-500/50 shadow-sm shadow-violet-500/20'
                              : 'bg-white/10 text-white/50 border-white/25'
                          }`}
                        >
                          🤖 {lead.ai_mode ? 'ON' : 'OFF'}
                        </button>
                      )}
                    </div>

                    {/* Bottom: linha 2 — data+hora | score */}
                    <div className="flex items-center justify-between mt-1 gap-1">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md truncate ${semAtend ? 'text-red-300 bg-red-500/15' : 'text-white/60 bg-white/6'}`}>
                        {semAtend ? '⚠ ' : ''}{formatTime(lastMsg)}
                      </span>
                      {lead.score != null && (
                        <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{
                          backgroundColor: lead.score >= 70 ? '#22c55e22' : lead.score >= 40 ? '#f59e0b22' : '#ef444422',
                          color:           lead.score >= 70 ? '#4ade80'   : lead.score >= 40 ? '#fbbf24'   : '#f87171',
                        }}>
                          {lead.score}%
                        </span>
                      )}
                    </div>
                  </button>
                  </div>
                );
              })}

              {!items.length && (
                <div className="rounded-lg border border-dashed p-5 text-center mt-1" style={{ borderColor: stage.cardBorder + '30' }}>
                  <p className="text-xs font-medium" style={{ color: stage.cardBorder + '60' }}>Vazio</p>
                </div>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}
