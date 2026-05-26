import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchVendedores, upsertVendedor, deleteVendedor } from '../../lib/adminApi';

const ROLES = ['vendedor', 'financeiro'] as const;

const EMPTY = { nome: '', phone: '', role: 'vendedor', ativo: true };

export default function Team() {
  const [team, setTeam]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<any | null>(null);
  const [saving, setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [error, setError]       = useState('');

  async function load() {
    setLoading(true);
    setTeam(await fetchVendedores());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!modal?.nome?.trim()) { setError('Nome obrigatório'); return; }
    setSaving(true);
    try {
      await upsertVendedor(modal);
      await load();
      setModal(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(v: any) {
    await upsertVendedor({ ...v, ativo: !v.ativo });
    load();
  }

  async function handleDelete(id: string) {
    await deleteVendedor(id);
    setConfirmDel(null);
    load();
  }

  const ROLE_COLOR: Record<string, string> = {
    vendedor:   'bg-sky-500/15 text-sky-300 border-sky-500/25',
    financeiro: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-xs font-bold tracking-wider uppercase">
          {team.filter(v => v.ativo).length} ativo{team.filter(v => v.ativo).length !== 1 ? 's' : ''} · {team.length} total
        </p>
        <button
          onClick={() => { setModal({ ...EMPTY }); setError(''); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition shadow-lg shadow-violet-500/20"
        >
          <Plus size={15} /> Novo Membro
        </button>
      </div>

      {loading ? (
        <div className="text-white/30 text-sm text-center py-10">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {team.map(v => (
            <div key={v.id}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition ${v.ativo ? 'border-white/10 bg-white/4' : 'border-white/5 bg-white/2 opacity-50'}`}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                <span className="text-white font-black text-sm">{(v.nome || '?')[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-none">{v.nome}</p>
                <p className="text-white/30 text-xs mt-0.5">+{v.phone || 'sem número'}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ROLE_COLOR[v.role] || ROLE_COLOR.vendedor}`}>
                {v.role}
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleAtivo(v)} title={v.ativo ? 'Desativar' : 'Ativar'}
                  className="text-white/40 hover:text-white transition">
                  {v.ativo ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => { setModal({ ...v }); setError(''); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setConfirmDel(v.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {team.length === 0 && (
            <div className="py-10 text-center text-white/25 text-sm">Nenhum membro na equipe ainda.</div>
          )}
        </div>
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0e1530] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <p className="text-white font-bold mb-2">Excluir membro?</p>
            <p className="text-white/40 text-sm mb-5">Leads atribuídos a ele ficarão sem vendedor.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-semibold">Cancelar</button>
              <button onClick={() => handleDelete(confirmDel)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0b1530] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <p className="text-white font-black">{modal.id ? 'Editar Membro' : 'Novo Membro'}</p>
              <button onClick={() => setModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
              <div>
                <label className="text-white/50 text-xs font-bold mb-1 block">Nome completo *</label>
                <input value={modal.nome} onChange={e => setModal((m: any) => ({ ...m, nome: e.target.value }))}
                  placeholder="Nome do vendedor" className={INPUT} required />
              </div>
              <div>
                <label className="text-white/50 text-xs font-bold mb-1 block">WhatsApp (com código país)</label>
                <input value={modal.phone || ''} onChange={e => setModal((m: any) => ({ ...m, phone: e.target.value }))}
                  placeholder="5561999999999" className={INPUT} />
              </div>
              <div>
                <label className="text-white/50 text-xs font-bold mb-1 block">Função</label>
                <select value={modal.role} onChange={e => setModal((m: any) => ({ ...m, role: e.target.value }))} className={SELECT}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="ativo" checked={modal.ativo !== false}
                  onChange={e => setModal((m: any) => ({ ...m, ativo: e.target.checked }))}
                  className="w-4 h-4 rounded accent-violet-600" />
                <label htmlFor="ativo" className="text-white/70 text-sm">Membro ativo</label>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-semibold">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition disabled:opacity-60">
                  <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const INPUT  = 'w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 transition';
const SELECT = 'w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition [color-scheme:dark]';
