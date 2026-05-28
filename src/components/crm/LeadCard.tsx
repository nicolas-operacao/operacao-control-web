import { somClick, somHover } from '../../services/hudSounds';
import type { Lead } from '../../services/crm/crmApi';
import { ESTAGIOS_ATIVOS } from '../../services/crm/crmApi';

interface Props {
  lead: Lead;
  onClick: () => void;
  isDragging?: boolean;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function LeadCard({ lead, onClick, isDragging }: Props) {
  const estagio = ESTAGIOS_ATIVOS.find(e => e.key === lead.estagio);
  const diasNoEstagio = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86400000);
  const atrasado = diasNoEstagio >= 3;

  return (
    <div
      onMouseEnter={somHover}
      onClick={() => { somClick(); onClick(); }}
      className={`group rounded-xl border p-3 cursor-pointer transition-all select-none ${
        isDragging
          ? 'shadow-[0_8px_30px_rgba(0,0,0,0.5)] scale-105 rotate-1 border-yellow-500/60 bg-zinc-800'
          : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80'
      }`}
    >
      {/* Nome + valor */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-white font-black text-sm leading-tight truncate">{lead.nome}</p>
        {lead.valor_estimado ? (
          <span className="text-green-400 font-black text-xs whitespace-nowrap flex-shrink-0">{fmt(Number(lead.valor_estimado))}</span>
        ) : null}
      </div>

      {/* Produto */}
      {lead.produto_interesse && (
        <p className="text-zinc-500 text-[10px] uppercase tracking-wider truncate mb-2">{lead.produto_interesse}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {lead.responsavel_nome && (
            <span className="text-[9px] text-zinc-600 font-bold">
              {lead.responsavel_nome.split(' ')[0]}
            </span>
          )}
          {lead.telefone && (
            <a
              href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-green-500/60 hover:text-green-400 text-[11px] transition-colors"
              title="Abrir WhatsApp"
            >📲</a>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {atrasado && (
            <span className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/30">
              {diasNoEstagio}d
            </span>
          )}
          {lead.origem && (
            <span className="text-[9px] text-zinc-700 truncate max-w-[60px]">{lead.origem}</span>
          )}
        </div>
      </div>
    </div>
  );
}
