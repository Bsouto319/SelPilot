import { useEffect, useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type Status = 'checking' | 'connected' | 'disconnected';

export default function ConnectionStatus() {
  const [status, setStatus]     = useState<Status>('checking');
  const [tooltip, setTooltip]   = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  async function check() {
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/sellpilot-health`);
      const data = await res.json();
      const isConnected = data.connected ?? data.ok ?? false;
      setStatus(isConnected ? 'connected' : 'disconnected');
      setLastCheck(data.lastCheck ?? new Date().toISOString());
    } catch {
      setStatus('disconnected');
    }
  }

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  const dotColor = {
    checking:     'bg-amber-400 animate-pulse',
    connected:    'bg-emerald-400',
    disconnected: 'bg-rose-500 animate-pulse',
  }[status];

  const textColor = {
    checking:     'text-amber-400/80',
    connected:    'text-emerald-400/80',
    disconnected: 'text-rose-400',
  }[status];

  const label = {
    checking:     'Verificando...',
    connected:    'WhatsApp ativo',
    disconnected: 'Offline!',
  }[status];

  return (
    <div
      className="relative flex items-center gap-1.5 cursor-default select-none"
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className={`hidden sm:block text-xs font-semibold ${textColor}`}>{label}</span>

      {tooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[#1a2235] border border-white/10 rounded-xl p-3 z-50 shadow-xl text-left pointer-events-none">
          <p className={`text-xs font-bold mb-1 ${textColor}`}>{label}</p>
          {lastCheck && (
            <p className="text-[10px] text-white/40">
              Verificado às {new Date(lastCheck).toLocaleTimeString('pt-BR')}
            </p>
          )}
          {status === 'disconnected' && (
            <p className="text-[10px] text-rose-300 mt-1.5 leading-relaxed">
              Mensagens dos clientes não estão sendo recebidas. Verifique a conexão WhatsApp.
            </p>
          )}
          {status === 'connected' && (
            <p className="text-[10px] text-white/30 mt-0.5">Atualiza a cada 60 segundos.</p>
          )}
        </div>
      )}
    </div>
  );
}
