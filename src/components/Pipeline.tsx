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
              className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
              style={{ backgroundColor: stage.headerBg }}
            >
              <span className="text-xs font-black text-white tracking-wide uppercase leading-none drop-shadow">
                {stage.label}
              </span>
              <span className="text-xs font-black bg-black/25 text-white px-2 py-0.5 rounded-full min-w-[22px] text-center">
                {items.length}
              </span>
            </div>

            {/* Cards area */}
            <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-white/[0.03] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
              {items.map(lead => {
                const isNew = minutesSince(lead.created_at) < 60;
                const displayName = lead.name || lead.whatsapp_name || 'Lead';
                return (
                  <button
                    key={lead.id}
                    onClick={() => onSelect(lead)}
                    className="w-full text-left bg-[#111c30] hover:bg-[#162040] rounded-lg transition-all duration-150 p-3 group border border-white/8 hover:border-white/20"
                    style={{ borderLeftWidth: 3, borderLeftColor: stage.cardBorder }}
                  >
                    {/* Name row */}
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p className="text-sm font-bold text-white truncate leading-tight flex-1">
                        {displayName}
                      </p>
                      {isNew && (
                        <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full text-white tracking-wide" style={{ backgroundColor: stage.headerBg }}>
                          NOVO
                        </span>
                      )}
                    </div>

                    {/* Phone */}
                    <p className="text-[10px] text-white/30 font-medium mb-1.5">+{lead.phone}</p>

                    {/* Summary or first message */}
                    {lead.summary ? (
                      <p className="text-[11px] leading-relaxed line-clamp-2 mb-2" style={{ color: stage.cardBorder + 'cc' }}>
                        🤖 {lead.summary}
                      </p>
                    ) : lead.first_message ? (
                      <p className="text-[11px] text-white/35 line-clamp-2 mb-2">{lead.first_message}</p>
                    ) : <div className="mb-2" />}

                    {/* Score + Time */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/25">
                        {formatTime(lead.last_message_at ?? lead.created_at)}
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
