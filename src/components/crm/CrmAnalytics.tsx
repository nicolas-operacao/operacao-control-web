import { useState, useEffect } from 'react';
import { crmApi, ESTAGIOS_ATIVOS } from '../../services/crm/crmApi';
import type { Analytics } from '../../services/crm/crmApi';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CrmAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crmApi.analytics.get().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-zinc-800 border-t-yellow-400 rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="text-zinc-600 text-center py-12 italic">Não foi possível carregar analytics.</div>;

  const maxFunil = Math.max(...ESTAGIOS_ATIVOS.map(e => data.porEstagio[e.key] || 0), 1);

  return (
    <div className="space-y-6">

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de Leads', value: data.total, icon: '🎯', cor: 'text-white' },
          { label: 'Ativos no Pipeline', value: data.ativos, icon: '⚡', cor: 'text-yellow-400' },
          { label: 'Fechamentos', value: data.fechados, icon: '🏆', cor: 'text-green-400' },
          { label: 'Taxa de Conversão', value: `${data.taxaConversao}%`, icon: '📈', cor: 'text-blue-400' },
        ].map(c => (
          <div key={c.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">{c.icon} {c.label}</p>
            <p className={`font-black text-2xl mt-1 ${c.cor}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Valor do pipeline */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-yellow-900/30 rounded-xl p-4">
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">💰 Valor em Pipeline</p>
          <p className="text-yellow-400 font-black text-xl mt-1">{fmt(data.valorPipeline)}</p>
        </div>
        <div className="bg-zinc-900 border border-green-900/30 rounded-xl p-4">
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">✅ Valor Fechado</p>
          <p className="text-green-400 font-black text-xl mt-1">{fmt(data.valorFechado)}</p>
        </div>
      </div>

      {/* Funil */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">🔽 Funil de Conversão</p>
        <div className="space-y-2.5">
          {ESTAGIOS_ATIVOS.map(e => {
            const qtd = data.porEstagio[e.key] || 0;
            const pct = maxFunil > 0 ? (qtd / maxFunil) * 100 : 0;
            return (
              <div key={e.key} className="flex items-center gap-3">
                <span className="text-sm w-5 flex-shrink-0">{e.emoji}</span>
                <span className="text-zinc-400 text-xs font-bold w-28 flex-shrink-0 truncate">{e.label}</span>
                <div className="flex-1 h-5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: e.cor + 'cc', boxShadow: `0 0 6px ${e.cor}60` }}
                  />
                </div>
                <span className="text-white font-black text-sm w-6 text-right flex-shrink-0">{qtd}</span>
              </div>
            );
          })}
          {/* Perdidos */}
          {data.perdidos > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm w-5 flex-shrink-0">❌</span>
              <span className="text-red-500 text-xs font-bold w-28 flex-shrink-0">Perdidos</span>
              <div className="flex-1 h-5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-red-900/60" style={{ width: `${(data.perdidos / maxFunil) * 100}%` }} />
              </div>
              <span className="text-red-400 font-black text-sm w-6 text-right flex-shrink-0">{data.perdidos}</span>
            </div>
          )}
        </div>
      </div>

      {/* Por vendedor */}
      {Object.keys(data.porVendedor).length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">👤 Por Vendedor</p>
          <div className="space-y-2.5">
            {Object.entries(data.porVendedor)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([nome, stats]) => {
                const taxa = stats.total > 0 ? ((stats.fechados / stats.total) * 100).toFixed(0) : '0';
                return (
                  <div key={nome} className="flex items-center justify-between gap-3 bg-zinc-950/60 rounded-lg px-3 py-2.5">
                    <span className="text-white font-bold text-sm truncate">{nome}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-zinc-500 text-xs">{stats.total} leads</span>
                      <span className="text-green-400 font-black text-xs">{stats.fechados} fechados</span>
                      <span className="text-yellow-400 font-black text-xs bg-yellow-400/10 px-2 py-0.5 rounded">{taxa}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
