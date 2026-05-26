import { useState } from 'react';
import {
  LogOut, LayoutDashboard, Store, Users, Settings,
  Headphones, Lock, ShieldCheck, Menu, X, ArrowLeft,
} from 'lucide-react';
import Overview from './tabs/Overview';
import Clients  from './tabs/Clients';
import Leads    from './tabs/Leads';
import Team     from './tabs/Team';
import Config   from './tabs/Config';
import Support  from './tabs/Support';

// ── Auth ─────────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = 'sellpilot2025';
const AUTH_KEY       = 'sp_admin_auth';

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'clients',  label: 'Clientes',    icon: Store },
  { id: 'leads',    label: 'Leads',       icon: Users },
  { id: 'team',     label: 'Equipe',      icon: Users },
  { id: 'config',   label: 'Config',      icon: Settings },
  { id: 'support',  label: 'Suporte',     icon: Headphones },
];

export default function AdminApp({ onExit }: { onExit?: () => void } = {}) {
  const [authed, setAuthed]     = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [pwd, setPwd]           = useState('');
  const [err, setErr]           = useState(false);
  const [tab, setTab]           = useState('overview');
  const [sideOpen, setSideOpen] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1');
      setAuthed(true);
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 2000);
    }
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #080d20 0%, #0e1540 100%)' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-800 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-violet-500/30">
              <Lock size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">SellPilot Admin</h1>
            <p className="text-white/30 text-sm mt-1">Área restrita — acesso exclusivo BTechSouto</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={pwd}
              onChange={e => { setPwd(e.target.value); setErr(false); }}
              placeholder="Senha de administrador"
              autoFocus
              className={`w-full px-4 py-3.5 rounded-2xl bg-white/5 border text-white text-sm placeholder-white/25
                focus:outline-none focus:ring-2 focus:ring-violet-500 transition
                ${err ? 'border-red-500' : 'border-white/10'}`}
            />
            {err && <p className="text-red-400 text-xs text-center font-semibold">Senha incorreta</p>}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition shadow-xl shadow-violet-500/30"
            >
              Entrar
            </button>
            {onExit && (
              <button type="button" onClick={onExit}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 text-sm transition flex items-center justify-center gap-2">
                <ArrowLeft size={14} /> Voltar ao Kanban
              </button>
            )}
          </form>
          <p className="text-center text-white/20 text-xs mt-6">SellPilot v2 · BTechSouto © 2025</p>
        </div>
      </div>
    );
  }

  const currentTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(160deg, #060b1c 0%, #0b1530 100%)' }}>

      {/* ── Sidebar desktop ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 flex-col border-r border-white/8 shrink-0"
        style={{ background: 'rgba(0,0,0,0.25)' }}>
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-800 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none">SellPilot</p>
              <p className="text-violet-400/60 text-[10px] font-black tracking-widest">ADMIN PANEL</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left
                  ${active
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
              >
                <Icon size={16} className="shrink-0" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/8 space-y-0.5">
          <div className="px-3 py-2 mb-1">
            <p className="text-white/30 text-[11px] font-bold">Bruno Souto</p>
            <p className="text-white/20 text-[10px]">BTechSouto Admin</p>
          </div>
          {onExit && (
            <button onClick={onExit}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-500/10 transition">
              <ArrowLeft size={14} />
              Voltar ao Kanban
            </button>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/5 transition"
          >
            <LogOut size={14} />
            Sair da conta admin
          </button>
        </div>
      </aside>

      {/* ── Drawer mobile ────────────────────────────────────────────────── */}
      {sideOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSideOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col border-r border-white/10"
            style={{ background: '#0b1530' }}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-white" />
                </div>
                <p className="text-white font-black text-sm">Admin Panel</p>
              </div>
              <button onClick={() => setSideOpen(false)} className="text-white/40"><X size={18} /></button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button key={t.id} onClick={() => { setTab(t.id); setSideOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left
                      ${active ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                    <Icon size={16} />
                    {t.label}
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-white/10">
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-white/30 text-sm hover:text-white/60">
                <LogOut size={14} /> Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10"
          style={{ background: 'rgba(0,0,0,0.3)' }}>
          <button onClick={() => setSideOpen(true)} className="text-white/60 p-1">
            <Menu size={20} />
          </button>
          <p className="text-white font-black text-sm">{currentTab.label}</p>
          <div className="flex items-center gap-3">
            {onExit && (
              <button onClick={onExit} className="text-emerald-400/70 text-xs font-bold flex items-center gap-1">
                <ArrowLeft size={12} /> Kanban
              </button>
            )}
            <button onClick={logout} className="text-white/30 text-xs font-bold">Sair</button>
          </div>
        </header>

        {/* Page title (desktop) */}
        <div className="hidden md:flex items-center justify-between px-8 py-5 border-b border-white/8">
          <div>
            <h2 className="text-white font-black text-lg leading-none">{currentTab.label}</h2>
            <p className="text-white/30 text-xs mt-0.5">SellPilot Admin · BTechSouto</p>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {tab === 'overview' && <Overview />}
          {tab === 'clients'  && <Clients />}
          {tab === 'leads'    && <Leads />}
          {tab === 'team'     && <Team />}
          {tab === 'config'   && <Config />}
          {tab === 'support'  && <Support />}
        </main>
      </div>
    </div>
  );
}
