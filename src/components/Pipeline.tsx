import { STAGES } from '../lib/api';

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

function formatTime(d: string) {
  const date = new Date(d);
  const now  = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYest  = date.toDateString() === yesterday.toDateString();
  if (isToday) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isYest)  return `Ontem`;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export default function Pipeline({ leads, onSelect }: { leads: any[]; onSelect: (l: any) => void }) {
  const byStage = (key: string) => leads.filter(l => l.stage === key);

  return (
    <div className="flex gap-2.5 h-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
      {STAGES.map(stage => {
        const items = byStage(stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden" style={{ width: 'calc((100vw - 96px - 24px) / 7)' }}>

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
                const isNew     = minutesSince(lead.created_at) < 60;
                const lastMsg   = lead.last_message_at ?? lead.created_at;
                const idleHours = minutesSince(lastMsg) / 60;
                const semAtend  = !['fechado','perdido'].includes(lead.stage) && idleHours >= 2;
                const rawName = lead.name || lead.whatsapp_name;
                const displayName = rawName || `+${lead.phone}`;
                return (
                  <button
                    key={lead.id}
                    onClick={() => onSelect(lead)}
                    className="w-full text-left rounded-lg transition-all duration-150 p-3 group border hover:border-white/25"
                    style={{
                      background: semAtend ? 'rgba(220,30,30,0.08)' : 'rgba(15,28,60,0.85)',
                      borderColor: semAtend ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)',
                      borderLeftWidth: 3,
                      borderLeftColor: semAtend ? '#ef4444' : stage.cardBorder,
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
                    </div>

                    {/* Phone */}
                    <p className="text-xs text-white/40 font-semibold mb-1.5">+{lead.phone}</p>

                    {/* Summary or first message */}
                    {lead.summary ? (
                      <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: stage.cardBorder + 'cc' }}>
                        🤖 {lead.summary}
                      </p>
                    ) : lead.first_message ? (
                      <p className="text-xs text-white/40 line-clamp-2 mb-2">{lead.first_message}</p>
                    ) : <div className="mb-2" />}

                    {/* Bottom row: vendedor + score + time */}
                    <div className="flex items-center justify-between mt-1">
                      {/* Vendedor */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
                          <span className="text-white font-black text-[9px]">C</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400/70">Cauã</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold ${semAtend ? 'text-red-400' : 'text-white/25'}`}>
                          {semAtend ? '⚠ ' : ''}{formatTime(lastMsg)}
                        </span>
                        {lead.score != null && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{
                            backgroundColor: lead.score >= 70 ? '#22c55e22' : lead.score >= 40 ? '#f59e0b22' : '#ef444422',
                            color:           lead.score >= 70 ? '#4ade80'   : lead.score >= 40 ? '#fbbf24'   : '#f87171',
                          }}>
                            {lead.score}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
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
