import { useEffect, useState, useCallback } from 'react';
import { Star, RefreshCw, CheckCircle2, Clock, ExternalLink, Trash2, RotateCcw, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAvaliacoes, markAvaliacaoFeita, markAvaliacaoPendente, deleteAvaliacao } from '../lib/avaliacoesApi';

const LOJAS = ['Todas', 'Probel Conjunto Nacional', 'Probel Casa Park', 'Probel Shopping ID', 'Prodormir', 'Probel'];

export default function PostVenda() {
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lojaFilter, setLojaFilter] = useState('Todas');

  const load = useCallback(async () => {
    setLoading(true);
    setAvaliacoes(await fetchAvaliacoes());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const ch = supabase
      .channel('sp_avaliacoes_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sp_avaliacoes' }, load)
      .subscribe();

    const poll = setInterval(load, 15_000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [load]);

  async function handleMark(id: string, feita: boolean) {
    if (feita) await markAvaliacaoPendente(id);
    else       await markAvaliacaoFeita(id);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este registro de avaliação?')) return;
    await deleteAvaliacao(id);
    load();
  }

  const filtered = lojaFilter === 'Todas'
    ? avaliacoes
    : avaliacoes.filter(a => a.loja_origem === lojaFilter);

  const naoFeitas = filtered.filter(a => !a.avaliacao_feita);
  const feitas    = filtered.filter(a => a.avaliacao_feita);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  function Card({ a }: { a: any }) {
    const initials = (a.nome || '?')[0].toUpperCase();
    const feita = a.avaliacao_feita;
    return (
      <div className={`rounded-xl border p-4 transition-all ${feita
        ? 'border-emerald-500/25 bg-emerald-500/5'
        : 'border-white/10 bg-white/3 hover:bg-white/5'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm text-white ${
            feita ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'
          }`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-none truncate">{a.nome}</p>
            <p className="text-white/30 text-[11px] mt-0.5">+{a.telefone}</p>
            <p className="text-white/40 text-[11px] mt-0.5 truncate">{a.loja_origem}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {a.link_google_loja && (
              <a href={a.link_google_loja} target="_blank" rel="noreferrer"
                className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-300 hover:bg-blue-500/30 transition"
                title="Abrir link Google">
                <ExternalLink size={12} />
              </a>
            )}
            <button
              onClick={() => handleMark(a.id, feita)}
              title={feita ? 'Marcar como pendente' : 'Marcar como avaliado'}
              className={`p-1.5 rounded-lg border transition ${feita
                ? 'bg-amber-500/15 border-amber-500/25 text-amber-300 hover:bg-amber-500/30'
                : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/30'}`}
            >
              {feita ? <RotateCcw size={12} /> : <CheckCircle2 size={12} />}
            </button>
            <button
              onClick={() => handleDelete(a.id)}
              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400/60 hover:text-red-300 hover:bg-red-500/20 transition"
              title="Remover"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/40">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>Solicitado: {fmtDate(a.data_envio_solicitacao)}</span>
          </div>
          {feita && a.data_confirmacao_avaliacao && (
            <div className="flex items-center gap-1 text-emerald-400/70">
              <CheckCircle2 size={10} />
              <span>Avaliado: {fmtDate(a.data_confirmacao_avaliacao)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-white/30" />
          <select
            value={lojaFilter}
            onChange={e => setLojaFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/70 text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 [color-scheme:dark]"
          >
            {LOJAS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button onClick={load}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition"
          title="Atualizar">
          <RefreshCw size={13} className={`text-white/50 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs font-black text-white/40">
          <span className="text-amber-400/70">{naoFeitas.length} pendente{naoFeitas.length !== 1 ? 's' : ''}</span>
          <span className="text-emerald-400/70">{feitas.length} feita{feitas.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Columns */}
      {loading && avaliacoes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/25 text-sm">Carregando...</div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          {/* Não Feita */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <Clock size={14} className="text-amber-400" />
              <p className="text-amber-400 text-xs font-black tracking-widest uppercase">
                ⏳ Avaliação Não Feita
              </p>
              <span className="ml-auto text-xs font-black text-amber-400/60 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {naoFeitas.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {naoFeitas.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-white/20 text-sm">Nenhum pendente</p>
                </div>
              ) : naoFeitas.map(a => <Card key={a.id} a={a} />)}
            </div>
          </div>

          {/* Feita */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <Star size={14} className="text-emerald-400" />
              <p className="text-emerald-400 text-xs font-black tracking-widest uppercase">
                ✅ Avaliação Feita
              </p>
              <span className="ml-auto text-xs font-black text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {feitas.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {feitas.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-white/20 text-sm">Nenhuma avaliação confirmada ainda</p>
                </div>
              ) : feitas.map(a => <Card key={a.id} a={a} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
