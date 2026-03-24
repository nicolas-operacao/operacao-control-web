import { useState, useEffect } from 'react';
import { api } from '../services/api';

type VendedorRank = {
  id: string;
  nome: string;
  equipe: string;
  total_vendido: number;
  foto_url?: string; 
};

export function GuerraEquipes() {
  const [equipeA, setEquipeA] = useState<VendedorRank[]>([]);
  const [equipeB, setEquipeB] = useState<VendedorRank[]>([]);
  const [totalA, setTotalA] = useState(0);
  const [totalB, setTotalB] = useState(0);

  // 🔥 ESTADO DA OPERAÇÃO TÁTICA ATIVA
  const [desafioAtivo, setDesafioAtivo] = useState<any>(null);
  const META_OPERACAO = desafioAtivo ? Number(desafioAtivo.goal_amount) : 400000;

  const [tempoRestante, setTempoRestante] = useState('');

  // Busca inicial
  useEffect(() => {
    fetchRankingEDesafio();
  }, []);

  // Relógio Tático sincronizado com a Operação
  useEffect(() => {
    function calcularTempoTatico() {
      const agora = new Date();
      let deadline = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

      if (desafioAtivo && desafioAtivo.end_date) {
        const [ano, mes, dia] = desafioAtivo.end_date.split('-');
        deadline = new Date(Number(ano), Number(mes) - 1, Number(dia), 23, 59, 59, 999);
      }

      const diferenca = deadline.getTime() - agora.getTime();

      if (diferenca > 0) {
        const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferenca / (1000 * 60 * 60)) % 24);
        const minutos = Math.floor((diferenca / 1000 / 60) % 60);
        
        let stringTempo = '';
        if (dias > 0) stringTempo += `${dias}d `;
        if (horas > 0 || dias > 0) stringTempo += `${horas}h `;
        stringTempo += `${minutos}m restantes`;

        setTempoRestante(stringTempo);
      } else {
        setTempoRestante('OPERAÇÃO ENCERRADA');
      }
    }

    calcularTempoTatico();
    const timer = setInterval(calcularTempoTatico, 60000);
    return () => clearInterval(timer);
  }, [desafioAtivo]);

  async function fetchRankingEDesafio() {
    // 🔥 BLINDAGEM 1: Busca a operação separadamente
    try {
      const resChallenge = await api.get('/challenges');
      // Garante que é um array antes de tentar usar o .find()
      const listaDesafios = Array.isArray(resChallenge.data) ? resChallenge.data : [];
      const ativo = listaDesafios.find((c: any) => c.is_active);
      if (ativo) setDesafioAtivo(ativo);
    } catch (error) {
      console.error('Radar sem sinal para Desafios (Nenhum ativo ou erro):', error);
    }

    // 🔥 BLINDAGEM 2: O Placar carrega de qualquer jeito, independente do desafio!
    try {
      const response = await api.get('/ranking');
      const rankingGeral: VendedorRank[] = Array.isArray(response.data) ? response.data : (response.data.data || []);

      const timeA = rankingGeral.filter(v => {
        const eq = String(v.equipe || '').trim().toUpperCase();
        return eq === 'A' || eq === 'EQUIPA A' || eq === 'EQUIPE A';
      });

      const timeB = rankingGeral.filter(v => {
        const eq = String(v.equipe || '').trim().toUpperCase();
        return eq === 'B' || eq === 'EQUIPA B' || eq === 'EQUIPE B';
      });

      const somaA = timeA.reduce((acc, v) => acc + (Number(v.total_vendido) || 0), 0);
      const somaB = timeB.reduce((acc, v) => acc + (Number(v.total_vendido) || 0), 0);

      setEquipeA(timeA);
      setEquipeB(timeB);
      setTotalA(somaA);
      setTotalB(somaB);

    } catch (error) {
      console.error('Erro ao buscar dados da guerra de equipes:', error);
    }
  }

  const totalGeralOperacao = totalA + totalB;
  const MathProgresso = (totalGeralOperacao / META_OPERACAO) * 100;
  const progressoXP = isNaN(MathProgresso) ? 0 : Math.min(MathProgresso, 100);

  let liderEquipeA = false;
  let liderEquipeB = false;

  if (totalA > 0 || totalB > 0) {
    if (totalA > totalB) { liderEquipeA = true; } 
    else if (totalB > totalA) { liderEquipeB = true; }
  }

  const formataBRL = (valor: number) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const renderPodioSombrio = (equipe: VendedorRank[]) => {
    const medalhas = ['🥇', '🥈', '🥉'];
    return (
      <div className="space-y-2 mt-3">
        {[1, 2, 3].map((posicao, index) => {
          const vendedor = equipe[index];
          const temVenda = vendedor && Number(vendedor.total_vendido) > 0;

          return (
            <div key={posicao} className="flex justify-between items-center bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/50 text-sm h-12 shadow-inner transition-all hover:bg-zinc-900">
              <div className="flex items-center gap-3">
                <span className="text-lg drop-shadow-md">{medalhas[index]}</span>
                
                {temVenda ? (
                  <div className="flex items-center gap-2.5">
                    {vendedor.foto_url ? (
                      <img src={vendedor.foto_url} alt={vendedor.nome} className="w-7 h-7 rounded-full object-cover border border-zinc-700 shadow-sm"/>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shadow-sm">
                        <span className="text-[10px] font-black text-zinc-400 uppercase">{vendedor.nome.charAt(0)}</span>
                      </div>
                    )}
                    <span className="text-zinc-100 font-bold truncate max-w-[120px] md:max-w-[150px]">{vendedor.nome}</span>
                  </div>
                ) : (
                  <span className="text-zinc-600 italic text-xs ml-1">Aguardando recruta...</span>
                )}
              </div>
              
              <span className={temVenda ? "text-green-400 font-black tracking-wide" : "text-zinc-700"}>
                {temVenda ? formataBRL(Number(vendedor.total_vendido)) : '-'}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col w-full h-full relative overflow-hidden">
      
      <h2 className="text-xl md:text-2xl font-black text-white mb-5 uppercase tracking-widest flex items-center gap-3 border-b border-zinc-800 pb-3">
        ⚔️ Guerra de Equipes <span className="text-zinc-600 text-sm font-bold">({desafioAtivo ? desafioAtivo.name : 'Geral'})</span>
      </h2>

      {/* BARRA DE XP COLETIVA */}
      <div className="mb-8 p-4 bg-zinc-950/50 rounded-lg border border-yellow-900/50">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Progresso da Operação Control</span>
            <div className="text-white font-black text-2xl flex items-baseline gap-1.5">
              {formataBRL(totalGeralOperacao)}
              <span className="text-sm text-yellow-400 font-medium">/ {formataBRL(META_OPERACAO)}</span>
            </div>
          </div>
          <span className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">
            {progressoXP.toFixed(1)}<span className="text-2xl">%</span>
          </span>
        </div>
        
        <div className="w-full bg-zinc-900 rounded-full h-4 mb-1 border-2 border-zinc-800 overflow-hidden relative">
          <div className="bg-yellow-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(250,204,21,0.6)] relative" style={{ width: `${progressoXP}%` }}>
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
        <p className="text-center text-xs text-zinc-600 font-medium uppercase tracking-wider">Acumulado das Equipes A & B</p>
      </div>

      {/* ÁREA DE CONFRONTO */}
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0 flex-1 relative mb-6">
        
        {/* EQUIPA A (AZUL) */}
        <div className="w-full md:flex-1 bg-blue-950/10 border border-blue-900/30 rounded-lg p-4 relative group">
          {liderEquipeA && <div className="absolute -top-6 -left-3 text-5xl animate-pulse drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] z-20">🏆</div>}
          <div className="flex justify-between items-end mb-2">
            <span className="font-black text-blue-400 text-lg uppercase tracking-wider">Equipe A</span>
            <span className="text-white font-bold text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{formataBRL(totalA)}</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 mb-3 border border-zinc-800">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.3)]" style={{ width: totalA > 0 ? `${(totalA/META_OPERACAO)*100}%` : '0%' }}></div>
          </div>
          {renderPodioSombrio(equipeA)}
        </div>

        {/* O "VS" CENTRAL */}
        <div className="flex flex-col items-center justify-center mx-4 my-2 md:my-0 h-full relative z-10">
          <div className="w-0.5 h-20 md:h-32 bg-zinc-800"></div>
          <div className="bg-zinc-950 border-2 border-zinc-700 rounded-full p-4 md:p-5 my-[-20px] shadow-[0_0_20px_rgba(0,0,0,0.8)]">
            <span className="text-4xl md:text-5xl font-black text-zinc-500 tracking-tighter italic">VS</span>
          </div>
          <div className="w-0.5 h-20 md:h-32 bg-zinc-800"></div>
        </div>

        {/* EQUIPA B (VERMELHA) */}
        <div className="w-full md:flex-1 bg-red-950/10 border border-red-900/30 rounded-lg p-4 relative group">
          {liderEquipeB && <div className="absolute -top-6 -right-3 text-5xl animate-pulse drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] z-20">🏆</div>}
          <div className="flex justify-between items-end mb-2 text-right">
            <span className="text-white font-bold text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{formataBRL(totalB)}</span>
            <span className="font-black text-red-400 text-lg uppercase tracking-wider">Equipe B</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 mb-3 border border-zinc-800">
            <div className="bg-red-500 h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(239,68,68,0.3)]" style={{ width: totalB > 0 ? `${(totalB/META_OPERACAO)*100}%` : '0%' }}></div>
          </div>
          {renderPodioSombrio(equipeB)}
        </div>

      </div>

      <div className="text-center text-zinc-600 text-xs mt-auto pt-3 border-t border-zinc-800 uppercase tracking-widest font-bold">
        Tempo Tático até o Fim da Operação: <span className="text-white text-sm font-black animate-pulse">{tempoRestante}</span>
      </div>

    </div>
  );
}