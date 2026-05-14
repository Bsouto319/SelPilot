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
  if (isToday) return `Hoje ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  if (isYest)  return `Ontem ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export default function Pipeline({ leads, onSelect }: { leads: any[]; onSelect: (l: any) => void }) {
  const byStage = (key: string) => leads.filter(l => l.stage === key);

  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
      {STAGES.map(stage => {
        const items = byStage(stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 flex flex-col" style={{ width: 'calc((100vw - 96px - 24px) / 7)' }}>

            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stage.color}`}>{stage.label}</span>
              <span className="text-xs text-white/30 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/8">{items.length}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
              {items.map(lead => {
                const isNew = minutesSince(lead.created_at) < 60;
                return (
                  <button
                    key={lead.id}
                    onClick={() => onSelect(lead)}
                    className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/8 hover:border-emerald-500/40 rounded-2xl transition-all duration-150 p-3.5 group"
                  >
                    {/* Name row */}
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                          <span className="text-white text-xs font-bold">
                            {((lead.name || lead.whatsapp_name || 'L')[0]).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white truncate leading-tight">
                          {lead.name || lead.whatsapp_name || 'Lead'}
                        </p>
                      </div>
                      {isNew && (
                        <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white tracking-wide">
                          NOVO
                        </span>
                      )}
                    </div>

                    {/* Phone */}
                    <p className="text-xs text-white/30 font-medium mb-1.5">+{lead.phone}</p>

                    {/* First message / summary */}
                    {lead.summary ? (
                      <p className="text-xs text-emerald-400/80 line-clamp-2 font-medium">🤖 {lead.summary}</p>
                    ) : lead.first_message ? (
                      <p className="text-xs text-white/40 line-clamp-2">{lead.first_message}</p>
                    ) : null}

                    {/* Score + Time */}
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs font-semibold ${isNew ? 'text-emerald-400' : 'text-white/25'}`}>
                        🕐 {formatTime(lead.created_at)}
                      </p>
                      {lead.score != null && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                          lead.score >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                          lead.score >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-rose-500/20 text-rose-400'
                        }`}>
                          {lead.score}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {!items.length && (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center">
                  <p className="text-xs text-white/20 font-medium">Vazio</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
