import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, DollarSign, CheckCircle, Clock, PauseCircle, XCircle } from 'lucide-react';
import { fetchClients, upsertClient, deleteClient } from '../../lib/adminApi';

const PLANS   = ['starter', 'pro', 'enterprise'] as const;
const STATUSES = ['trial', 'active', 'paused', 'cancelled'] as const;

const PLAN_COLORS: Record<string, string> = {
  starter:    'bg-slate-500/20 text-slate-300 border-slate-500/30',
  pro:        'bg-violet-500/20 text-violet-300 border-violet-500/30',
  enterprise: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};
const STATUS_ICONS: Record<string, any> = {
  trial:     { icon: Clock,        cls: 'text-amber-400' },
  active:    { icon: CheckCircle,  cls: 'text-emerald-400' },
  paused:    { icon: PauseCircle,  cls: 'text-sky-400' },
  cancelled: { icon: XCircle,      cls: 'text-rose-400' },
};

const EMPTY: Record<string, any> = {
  name: '', segment: '', plan: 'starter', status: 'trial',
  mrr: 0, setup_fee: 0, contact_name: '', contact_email: '',
  contact_phone: '', city: '', state: 'DF', whatsapp_instance: '', notes: '',
  start_date: new Date().toISOString().slice(0, 10),
};

export default function Clients() {
  const [clients, setClients]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<any | null>(null); // null = closed, {} = new, {...} = edit
  const [saving, setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [error, setError]       = useState('');

  async function load() {
    setLoading(true);
    setClients(await fetchClients());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!modal?.name?.trim()) { setError('Nome obrigatório'); return; }
    setSaving(true);
    try {
      await upsertClient(modal);
      await load();
      setModal(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteClient(id);
    setConfirmDel(null);
    load();
  }

  const totalMrr = clients.filter(c => c.status === 'active').reduce((s, c) => s + (c.mrr || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs font-bold tracking-wider uppercase">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''} · MRR ativo:{' '}
            <span className="text-emerald-400">R$ {totalMrr.toLocaleString('pt-BR')}</span>
          </p>
        </div>
        <button
          onClick={() => { setModal({ ...EMPTY }); setError(''); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition shadow-lg shadow-violet-500/20"
        >
          <Plus size={15} /> Novo Cliente
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-white/30 text-sm text-center py-10">Carregando...</div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {['Cliente', 'Plano', 'Status', 'MRR', 'Contato', 'Cidade', 'Início', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-white/30 text-xs font-black tracking-wider uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clients.map(c => {
                  const SI = STATUS_ICONS[c.status] || STATUS_ICONS.trial;
                  const Icon = SI.icon;
                  return (
                    <tr key={c.id} className="hover:bg-white/3 transition group">
                      <td className="px-4 py-3">
                        <p className="text-white font-bold leading-none">{c.name}</p>
                        {c.segment && <p className="text-white/30 text-xs mt-0.5">{c.segment}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full border uppercase tracking-wide ${PLAN_COLORS[c.plan] || PLAN_COLORS.starter}`}>
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Icon size={13} className={SI.cls} />
                          <span className={`text-xs font-semibold capitalize ${SI.cls}`}>{c.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-emerald-400 font-bold">
                          <DollarSign size={12} />
                          {Number(c.mrr || 0).toLocaleString('pt-BR')}
                        </div>
                        {c.setup_fee > 0 && <p className="text-white/25 text-[10px]">Setup: R${Number(c.setup_fee).toLocaleString('pt-BR')}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-xs">{c.contact_name || '—'}</p>
                        {c.contact_phone && <p className="text-white/30 text-[11px]">{c.contact_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">{c.city || '—'}</td>
                      <td className="px-4 py-3 text-white/30 text-xs whitespace-nowrap">
                        {c.start_date ? new Date(c.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => { setModal({ ...c }); setError(''); }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setConfirmDel(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {clients.length === 0 && (
              <div className="py-12 text-center text-white/25 text-sm">
                Nenhum cliente ainda. Clique em "Novo Cliente" para adicionar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0e1530] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <p className="text-white font-bold mb-2">Excluir cliente?</p>
            <p className="text-white/40 text-sm mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-semibold">Cancelar</button>
              <button onClick={() => handleDelete(confirmDel)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b1530] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl my-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <p className="text-white font-black">{modal.id ? 'Editar Cliente' : 'Novo Cliente'}</p>
              <button onClick={() => setModal(null)} className="text-white/40 hover:text-white transition"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
              {error && <p className="text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-white/50 text-xs font-bold mb-1 block">Nome da loja *</label>
                  <input value={modal.name} onChange={e => setModal((m: any) => ({ ...m, name: e.target.value }))}
                    placeholder="Loja Probel" className={INPUT} required />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-bold mb-1 block">Segmento</label>
                  <input value={modal.segment || ''} onChange={e => setModal((m: any) => ({ ...m, segment: e.target.value }))}
                    placeholder="colchões, roupas..." className={INPUT} />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-bold mb-1 block">Cidade</label>
                  <input value={modal.city || ''} onChange={e => setModal((m: any) => ({ ...m, city: e.target.value }))}
                    placeholder="Brasília" className={INPUT} />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-bold mb-1 block">Plano</label>
                  <select value={modal.plan} onChange={e => setModal((m: any) => ({ ...m, plan: e.target.value }))} className={SELECT}>
                    {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs font-bold mb-1 block">Status</label>
                  <select value={modal.status} onChange={e => setModal((m: any) => ({ ...m, status: e.target.value }))} className={SELECT}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs font-bold mb-1 block">MRR (R$)</label>
                  <input type="number" min="0" value={modal.mrr || 0} onChange={e => setModal((m: any) => ({ ...m, mrr: Number(e.target.value) }))}
                    className={INPUT} />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-bold mb-1 block">Setup (R$)</label>
                  <input type="number" min="0" value={modal.setup_fee || 0} onChange={e => setModal((m: any) => ({ ...m, setup_fee: Number(e.target.value) }))}
                    className={INPUT} />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-bold mb-1 block">Responsável</label>
                  <input value={modal.contact_name || ''} onChange={e => setModal((m: any) => ({ ...m, contact_name: e.target.value }))}
                    placeholder="Nome do dono" className={INPUT} />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-bold mb-1 block">WhatsApp contato</label>
                  <input value={modal.contact_phone || ''} onChange={e => setModal((m: any) => ({ ...m, contact_phone: e.target.value }))}
                    placeholder="5561999999999" className={INPUT} />
                </div>
                <div className="col-span-2">
                  <label className="text-white/50 text-xs font-bold mb-1 block">Email</label>
                  <input type="email" value={modal.contact_email || ''} onChange={e => setModal((m: any) => ({ ...m, contact_email: e.target.value }))}
                    placeholder="contato@loja.com" className={INPUT} />
                </div>
                <div className="col-span-2">
                  <label className="text-white/50 text-xs font-bold mb-1 block">Instância WhatsApp (UAZAPI)</label>
                  <input value={modal.whatsapp_instance || ''} onChange={e => setModal((m: any) => ({ ...m, whatsapp_instance: e.target.value }))}
                    placeholder="token ou URL da instância" className={INPUT} />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-bold mb-1 block">Data início</label>
                  <input type="date" value={modal.start_date || ''} onChange={e => setModal((m: any) => ({ ...m, start_date: e.target.value }))}
                    className={INPUT + ' [color-scheme:dark]'} />
                </div>
                <div className="col-span-2">
                  <label className="text-white/50 text-xs font-bold mb-1 block">Notas internas</label>
                  <textarea rows={3} value={modal.notes || ''} onChange={e => setModal((m: any) => ({ ...m, notes: e.target.value }))}
                    placeholder="Observações, histórico de suporte, negociações..." className={INPUT + ' resize-none'} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
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
