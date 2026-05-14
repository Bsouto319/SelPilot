import { STAGES } from '../lib/api';

function formatTime(d: string) {
  const date = new Date(d);
  const now   = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYest = date.toDateString() === yesterday.toDateString();
  if (isToday) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isYest)  return `Ontem`;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export default function MobileLeadList({ leads, onSelect }: { leads: any[]; onSelect: (l: any) => void }) {
  const sorted = [...leads].sort((a, b) =>
    new Date(b.last_message_at ?? b.created_at).getTime() - new Date(a.last_message_at ?? a.created_at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20 py-20">
        <p className="text-4xl">📭</p>
        <p className="text-sm font-medium">Nenhum lead ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 py-3 overflow-y-auto">
      {sorted.map(lead => {
        const displayName = lead.name || lead.whatsapp_name || 'Lead';
        const stage = STAGES.find(s => s.key === lead.stage);
        const isNew = (Date.now() - new Date(lead.created_at).getTime()) < 3600000;

        return (
          <button
            key={lead.id}
            onClick={() => onSelect(lead)}
            className="w-full text-left bg-[#111c30] border border-white/8 hover:border-white/20 active:bg-[#162040] rounded-xl p-4 transition-all"
            style={{ borderLeftWidth: 3, borderLeftColor: (STAGES.find(s => s.key === lead.stage) as any)?.cardBorder ?? '#6b7280' }}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                <span className="text-white text-sm font-bold">{displayName[0].toUpperCase()}</span>
              </div>

              <div className="flex-1 min-w-0">
                {/* Row 1: name + time */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{displayName}</p>
                    {isNew && (
                      <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">NOVO</span>
                    )}
                  </div>
                  <span className="text-xs text-white/30 shrink-0">{formatTime(lead.last_message_at ?? lead.created_at)}</span>
                </div>

                {/* Row 2: stage + score */}
                <div className="flex items-center gap-2 mb-1.5">
                  {stage && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.color}`}>{stage.label}</span>
                  )}
                  {lead.score != null && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      lead.score >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                      lead.score >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-rose-500/20 text-rose-400'
                    }`}>{lead.score}%</span>
                  )}
                </div>

                {/* Row 3: summary or first message */}
                {lead.summary ? (
                  <p className="text-xs text-emerald-400/80 line-clamp-1">🤖 {lead.summary}</p>
                ) : lead.first_message ? (
                  <p className="text-xs text-white/35 line-clamp-1">{lead.first_message}</p>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
