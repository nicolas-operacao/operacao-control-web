import { api } from '../api';

export const ESTAGIOS_ATIVOS = [
  { key: 'base',          label: 'Base',         cor: '#71717a', emoji: '🎯' },
  { key: 'prospeccao',    label: 'Prospecção',   cor: '#3b82f6', emoji: '📡' },
  { key: 'conexao',       label: 'Conexão',      cor: '#06b6d4', emoji: '🤝' },
  { key: 'qualificacao',  label: 'Qualificação', cor: '#8b5cf6', emoji: '🔍' },
  { key: 'apresentacao',  label: 'Apresentação', cor: '#f59e0b', emoji: '🎤' },
  { key: 'negociacao',    label: 'Negociação',   cor: '#f97316', emoji: '💬' },
  { key: 'followup',      label: 'Follow-up',    cor: '#ec4899', emoji: '🔄' },
  { key: 'fechamento',    label: 'Fechamento',   cor: '#22c55e', emoji: '🏆' },
] as const;

export const ESTAGIOS_PERDA = [
  { key: 'perdido_sem_interesse',    label: 'Sem interesse',    emoji: '❌' },
  { key: 'perdido_sem_contato',      label: 'Sem contato',      emoji: '📵' },
  { key: 'perdido_concorrente',      label: 'Concorrente',      emoji: '⚔️' },
  { key: 'perdido_preco',            label: 'Preço alto',       emoji: '💸' },
  { key: 'perdido_nao_qualificado',  label: 'Não qualificado',  emoji: '🚫' },
] as const;

export type EstagioKey = typeof ESTAGIOS_ATIVOS[number]['key'] | typeof ESTAGIOS_PERDA[number]['key'];

export interface Lead {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  produto_interesse?: string;
  valor_estimado?: number;
  estagio: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  origem?: string;
  observacoes?: string;
  motivo_perda?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadDetalhe extends Lead {
  historico: HistoricoItem[];
  atividades: Atividade[];
  tarefas: Tarefa[];
  mensagens: WaMensagem[];
}

export interface HistoricoItem {
  id: string; lead_id: string; user_nome?: string;
  estagio_anterior?: string; estagio_novo?: string;
  observacao?: string; created_at: string;
}

export interface Atividade {
  id: string; lead_id: string; user_nome?: string;
  tipo: string; conteudo: string; created_at: string;
}

export interface Tarefa {
  id: string; lead_id?: string; user_nome?: string;
  titulo: string; descricao?: string;
  vencimento?: string; concluida: boolean; created_at: string;
  crm_leads?: { nome: string; estagio: string };
}

export interface WaMensagem {
  id: string; lead_id?: string; conta_id?: string;
  conta_nome?: string; direcao: string; conteudo: string;
  media_type?: string | null; media_url?: string | null;
  created_at: string;
}

export interface WaConta {
  id: string; nome: string; instance_name: string;
  responsavel_nome?: string; status: string; numero_telefone?: string; created_at: string;
}

export interface Analytics {
  total: number; ativos: number; fechados: number; perdidos: number;
  valorPipeline: number; valorFechado: number; taxaConversao: number;
  porEstagio: Record<string, number>;
  porVendedor: Record<string, { total: number; fechados: number }>;
}

// ── LEADS ──────────────────────────────────────────────────────────────────────

export const crmApi = {
  leads: {
    list: (params?: { estagio?: string; busca?: string }) =>
      api.get<Lead[]>('/crm/leads', { params }).then(r => r.data),
    get: (id: string) =>
      api.get<LeadDetalhe>(`/crm/leads/${id}`).then(r => r.data),
    create: (body: Partial<Lead>) =>
      api.post<Lead>('/crm/leads', body).then(r => r.data),
    update: (id: string, body: Partial<Lead>) =>
      api.put<Lead>(`/crm/leads/${id}`, body).then(r => r.data),
    move: (id: string, estagio: string, observacao?: string, motivo_perda?: string) =>
      api.patch<Lead>(`/crm/leads/${id}/move`, { estagio, observacao, motivo_perda }).then(r => r.data),
    delete: (id: string) =>
      api.delete(`/crm/leads/${id}`),
    atribuir: (id: string, vendedor_id: string, vendedor_nome: string) =>
      api.patch<Lead>(`/crm/leads/${id}/atribuir`, { vendedor_id, vendedor_nome }).then(r => r.data),
    addAtividade: (id: string, tipo: string, conteudo: string) =>
      api.post<Atividade>(`/crm/leads/${id}/atividades`, { tipo, conteudo }).then(r => r.data),
  },

  tarefas: {
    list: () => api.get<Tarefa[]>('/crm/tarefas').then(r => r.data),
    create: (body: { lead_id?: string; titulo: string; descricao?: string; vencimento?: string }) =>
      api.post<Tarefa>('/crm/tarefas', body).then(r => r.data),
    complete: (id: string) =>
      api.patch<Tarefa>(`/crm/tarefas/${id}/done`).then(r => r.data),
    delete: (id: string) =>
      api.delete(`/crm/tarefas/${id}`),
  },

  analytics: {
    get: () => api.get<Analytics>('/crm/analytics').then(r => r.data),
  },

  vendedores: {
    list: () => api.get<{ id: string; name: string }[]>('/crm/vendedores').then(r => r.data),
  },

  whatsapp: {
    contas: () => api.get<WaConta[]>('/crm/whatsapp/contas').then(r => r.data),
    criar: (body: { nome: string; instance_name: string }) =>
      api.post<WaConta>('/crm/whatsapp/contas', body).then(r => r.data),
    qr: (instanceName: string) =>
      api.get(`/crm/whatsapp/contas/${instanceName}/qr`).then(r => r.data),
    pairingCode: (instanceName: string, phoneNumber: string) =>
      api.post(`/crm/whatsapp/contas/${instanceName}/pairing`, { phoneNumber }).then(r => r.data),
    status: (instanceName: string) =>
      api.get(`/crm/whatsapp/contas/${instanceName}/status`).then(r => r.data),
    desconectar: (instanceName: string) =>
      api.delete(`/crm/whatsapp/contas/${instanceName}/logout`),
    deletar: (instanceName: string) =>
      api.delete(`/crm/whatsapp/contas/${instanceName}`),
    enviar: (body: { instanceName: string; telefone: string; mensagem: string; lead_id?: string; conta_id?: string; conta_nome?: string }) =>
      api.post('/crm/whatsapp/send', body).then(r => r.data),
    templates: () => api.get('/crm/whatsapp/templates').then(r => r.data),
    mensagens: (leadId: string) =>
      api.get<WaMensagem[]>(`/crm/whatsapp/mensagens/${leadId}`).then(r => r.data),
  },
};
