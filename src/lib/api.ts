import { supabase } from './supabase';

export const STAGES = [
  { key: 'novo_lead',        label: 'Novo Lead',        color: 'bg-green-400/15 text-green-300',    headerBg: '#16a34a', cardBorder: '#22c55e' },
  { key: 'em_contato',       label: 'Em Contato',       color: 'bg-sky-400/15 text-sky-300',        headerBg: '#0284c7', cardBorder: '#38bdf8' },
  { key: 'interessado',      label: 'Interessado',      color: 'bg-amber-400/15 text-amber-300',    headerBg: '#d97706', cardBorder: '#fbbf24' },
  { key: 'proposta_enviada', label: 'Proposta',         color: 'bg-purple-400/15 text-purple-300',  headerBg: '#7c3aed', cardBorder: '#a78bfa' },
  { key: 'negociando',       label: 'Negociando',       color: 'bg-orange-400/15 text-orange-300',  headerBg: '#ea580c', cardBorder: '#fb923c' },
  { key: 'fechado',          label: 'Visita Agendada',  color: 'bg-emerald-400/15 text-emerald-300', headerBg: '#059669', cardBorder: '#34d399' },
  { key: 'perdido',          label: 'Perdido ❌',        color: 'bg-rose-400/15 text-rose-300',      headerBg: '#dc2626', cardBorder: '#f87171' },
];

// ── Follow-up templates ─────────────────────────────────────────────────────

export const FOLLOWUP_TEMPLATES = [
  {
    key: 'boas_vindas',
    label: '👋 Boas-vindas',
    description: 'Apresentação inicial',
    message: (name: string) =>
      `Oi ${name}! 👋 Muito obrigado por entrar em contato com a Loja Probel!\n\n` +
      `Sou o Neres e vou te ajudar a encontrar o colchão perfeito pra você. 🛏️\n\n` +
      `Me conta: é para casal ou solteiro? Prefere mola, espuma ou látex? 😊`,
  },
  {
    key: 'followup_1',
    label: '🔔 Follow-up 1',
    description: 'Desperta interesse',
    message: (name: string) =>
      `Oi ${name}! 😊 Passando pra ver se você ainda está procurando um colchão.\n\n` +
      `Tenho algumas novidades incríveis pra te mostrar:\n` +
      `🛏️ Colchões a partir de R$499 com qualidade premium\n` +
      `🎁 Brinde especial pra quem fechar essa semana\n` +
      `💳 Até 12x sem juros no cartão\n\n` +
      `Quando você pode passar na loja? Ou prefere eu mandar as fotos aqui? 👇`,
  },
  {
    key: 'followup_2',
    label: '⚠️ Follow-up 2',
    description: 'Cria urgência',
    message: (name: string) =>
      `${name}, boa tarde! ☀️\n\n` +
      `⚠️ *ATENÇÃO:* A promoção que separei pra você *expira AMANHÃ!*\n\n` +
      `Depois disso o preço volta ao normal e não consigo garantir mais esse desconto. 😟\n\n` +
      `Me chama aqui ou passa na loja ainda hoje — é rapidinho! 🙏`,
  },
  {
    key: 'followup_3',
    label: '🔥 Última Chance',
    description: 'Máxima pressão',
    message: (name: string) =>
      `${name}, vou ser bem direto com você:\n\n` +
      `✅ Tenho o colchão que você quer\n` +
      `✅ Tenho o preço que cabe no seu bolso\n` +
      `✅ Parcelas que não pesam no bolso\n\n` +
      `Mas só consigo garantir esse preço *até hoje às 18h*. ⏰\n\n` +
      `Depois disso tem outro cliente reservando o mesmo modelo. Você quer ou passo para o próximo? 🤷‍♂️\n\n` +
      `Me fala! 👇`,
  },
];

// ── UAZAPI ─────────────────────────────────────────────────────────────────

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const baseUrl = import.meta.env.VITE_UAZAPI_URL as string;
  const token   = import.meta.env.VITE_UAZAPI_TOKEN as string;
  try {
    const res = await fetch(`${baseUrl}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify({ number: phone, text: message }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('sendWhatsApp HTTP error', res.status, body);
    }
    return res.ok;
  } catch (e) {
    console.error('sendWhatsApp network error', e);
    return false;
  }
}

export async function sendFollowUp(lead: any, templateKey: string): Promise<boolean> {
  const tpl = FOLLOWUP_TEMPLATES.find(t => t.key === templateKey);
  if (!tpl) return false;
  const name = lead.name || lead.whatsapp_name || 'cliente';
  const ok = await sendWhatsApp(lead.phone, tpl.message(name));
  if (ok) {
    const now  = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const note = `[${now}] ✅ Follow-up enviado: ${tpl.label}`;
    const prev = lead.notes ? `${lead.notes}\n${note}` : note;
    await updateLeadNotes(lead.id, prev);
    lead.notes = prev;
  }
  return ok;
}

// ── Leads ──────────────────────────────────────────────────────────────────

export async function fetchLeads(search = '') {
  let q = supabase
    .from('sp_leads')
    .select('*, vendedor:sp_vendedores(id,nome,phone)')
    .order('created_at', { ascending: false });
  if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,whatsapp_name.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) console.error('fetchLeads', error.message);
  return data || [];
}

export async function fetchMessages(leadId: string) {
  const { data, error } = await supabase
    .from('sp_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (error) console.error('fetchMessages', error.message);
  return data || [];
}

export async function fetchStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [todayRes, negRes, fechadoRes, totalRes] = await Promise.all([
    supabase.from('sp_leads').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
    supabase.from('sp_leads').select('id', { count: 'exact' }).eq('stage', 'negociando'),
    supabase.from('sp_leads').select('id', { count: 'exact' }).eq('stage', 'fechado'),
    supabase.from('sp_leads').select('id', { count: 'exact' }),
  ]);
  return {
    hoje:       todayRes.count  || 0,
    negociando: negRes.count    || 0,
    fechados:   fechadoRes.count || 0,
    total:      totalRes.count  || 0,
  };
}

export async function updateLeadStage(id: string, stage: string) {
  const { error } = await supabase
    .from('sp_leads')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('updateLeadStage', error.message);
}

export async function updateLeadAiMode(id: string, aiMode: boolean) {
  const { error } = await supabase
    .from('sp_leads')
    .update({ ai_mode: aiMode, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('updateLeadAiMode', error.message);
}

export async function updateLeadNotes(id: string, notes: string) {
  const { error } = await supabase
    .from('sp_leads')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('updateLeadNotes', error.message);
}

export async function fetchBiaGlobalMode(): Promise<boolean> {
  const { data } = await supabase.from('sp_config').select('value').eq('key', 'bia_global_mode').maybeSingle();
  return data?.value === 'true';
}

export async function setBiaGlobalMode(active: boolean): Promise<void> {
  await supabase.from('sp_config').upsert({ key: 'bia_global_mode', value: active ? 'true' : 'false', updated_at: new Date().toISOString() });
  if (active) {
    // Liga ai_mode em todos os leads ativos
    await supabase.from('sp_leads').update({ ai_mode: true, updated_at: new Date().toISOString() })
      .not('stage', 'in', '("fechado","perdido")');
  }
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from('sp_leads').delete().eq('id', id);
  if (error) console.error('deleteLead', error.message);
}

export function exportLeadsCSV(leads: any[]) {
  const headers = ['Nome', 'Telefone', 'Stage', 'Primeira Mensagem', 'Resumo IA', 'Notas', 'Entrada'];
  const rows = leads.map(l => [
    l.name || l.whatsapp_name || '',
    l.phone,
    STAGES.find(s => s.key === l.stage)?.label || l.stage,
    (l.first_message || '').replace(/,/g, ' '),
    (l.summary      || '').replace(/,/g, ' '),
    (l.notes        || '').replace(/,/g, ' '),
    new Date(l.created_at).toLocaleString('pt-BR'),
  ]);
  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `sellpilot-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
