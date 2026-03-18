import { useNavigate } from 'react-router-dom';
import { TabelaRecrutasPendentes } from '../components/TabelaRecrutasPendentes';

export function RecrutasAdmin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* CABEÇALHO ADMINISTRATIVO */}
        <div className="flex flex-col md:flex-row justify-between items-center pb-4 border-b border-zinc-800 gap-4">
          <h1 className="text-3xl md:text-4xl font-black text-purple-500 uppercase tracking-wider flex items-center gap-3">
            Gestão de Tropa <span className="text-zinc-500 text-lg md:text-xl ml-2 font-bold">(Admin)</span>
          </h1>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="border-2 border-purple-700 text-purple-300 hover:border-purple-500 hover:text-purple-500 px-6 py-2 rounded font-bold transition-all duration-300 uppercase text-sm tracking-wider"
          >
            Voltar ao Comando
          </button>
        </div>

        {/* ÁREA DE FOCO: Tabela de Recrutas Pendentes */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">🚨 Liberações Pendentes</h2>
          <TabelaRecrutasPendentes />
        </div>

      </div>
    </div>
  );
}