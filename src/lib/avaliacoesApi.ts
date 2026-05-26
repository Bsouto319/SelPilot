import { supabase } from './supabase';

export async function fetchAvaliacoes() {
  const { data } = await supabase
    .from('sp_avaliacoes')
    .select('*')
    .order('data_envio_solicitacao', { ascending: false });
  return data ?? [];
}

export async function markAvaliacaoFeita(id: string) {
  await supabase.from('sp_avaliacoes').update({
    avaliacao_feita: true,
    data_confirmacao_avaliacao: new Date().toISOString(),
  }).eq('id', id);
}

export async function markAvaliacaoPendente(id: string) {
  await supabase.from('sp_avaliacoes').update({
    avaliacao_feita: false,
    data_confirmacao_avaliacao: null,
  }).eq('id', id);
}

export async function deleteAvaliacao(id: string) {
  await supabase.from('sp_avaliacoes').delete().eq('id', id);
}
