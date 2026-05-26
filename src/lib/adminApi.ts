import { supabase } from './supabase';

// ── Clients ─────────────────────────────────────────────────────────────────

export async function fetchClients() {
  const { data, error } = await supabase
    .from('sp_clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error('fetchClients', error.message);
  return data || [];
}

export async function upsertClient(client: Record<string, any>) {
  const { data, error } = await supabase
    .from('sp_clients')
    .upsert({ ...client, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from('sp_clients').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Vendedores ───────────────────────────────────────────────────────────────

export async function fetchVendedores() {
  const { data, error } = await supabase
    .from('sp_vendedores')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) console.error('fetchVendedores', error.message);
  return data || [];
}

export async function upsertVendedor(v: Record<string, any>) {
  const { data, error } = await supabase
    .from('sp_vendedores')
    .upsert(v, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVendedor(id: string) {
  const { error } = await supabase.from('sp_vendedores').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Stats admin ──────────────────────────────────────────────────────────────

export async function fetchAdminStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [clientsRes, mrrRes, leadsHojeRes, totalLeadsRes, handoffRes, msgsHojeRes] =
    await Promise.all([
      supabase.from('sp_clients').select('id,status,mrr', { count: 'exact' }),
      supabase.from('sp_clients').select('mrr').eq('status', 'active'),
      supabase.from('sp_leads').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
      supabase.from('sp_leads').select('id', { count: 'exact' }),
      supabase.from('sp_leads').select('id', { count: 'exact' }).eq('ai_mode', false).not('handoff_at', 'is', null).not('stage', 'in', '("fechado","perdido")'),
      supabase.from('sp_messages').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
    ]);

  const mrr = (mrrRes.data || []).reduce((sum, c) => sum + (c.mrr || 0), 0);
  const activeClients = (clientsRes.data || []).filter(c => c.status === 'active').length;

  return {
    mrr,
    activeClients,
    totalClients: clientsRes.count || 0,
    leadsHoje:    leadsHojeRes.count || 0,
    totalLeads:   totalLeadsRes.count || 0,
    handoffPendente: handoffRes.count || 0,
    msgsHoje:     msgsHojeRes.count || 0,
  };
}

// ── Config ───────────────────────────────────────────────────────────────────

export async function fetchConfig(key: string): Promise<string | null> {
  const { data } = await supabase.from('sp_config').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}

export async function setConfig(key: string, value: string) {
  await supabase.from('sp_config').upsert({ key, value, updated_at: new Date().toISOString() });
}

// ── Handoff leads ────────────────────────────────────────────────────────────

export async function fetchHandoffLeads() {
  const { data, error } = await supabase
    .from('sp_leads')
    .select('*, vendedor:sp_vendedores(id,nome)')
    .eq('ai_mode', false)
    .not('handoff_at', 'is', null)
    .not('stage', 'in', '("fechado","perdido")')
    .order('handoff_at', { ascending: false });
  if (error) console.error('fetchHandoffLeads', error.message);
  return data || [];
}
