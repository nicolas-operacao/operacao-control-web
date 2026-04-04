import { useNavigate } from 'react-router-dom';
import { TabelaRecrutasPendentes } from '../components/TabelaRecrutasPendentes';
import { BotaoHUD } from '../components/BotaoHUD';

export function Liberacoes() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center pb-4 border-b border-zinc-800 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-purple-400 uppercase tracking-wider flex items-center gap-3">
              🛠️ Liberação de Combos
            </h1>
            <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">Aprovação de produtos especiais</p>
          </div>
          <div className="flex gap-3">
            <BotaoHUD variant="ghost" onClick={() => navigate('/dashboard')}>
              ← Voltar
            </BotaoHUD>
            <BotaoHUD variant="danger" onClick={handleLogout}>
              Sair
            </BotaoHUD>
          </div>
        </div>

        {/* ÁREA PRINCIPAL */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">🚨 Liberações Pendentes</h2>
          <TabelaRecrutasPendentes />
        </div>

      </div>
    </div>
  );
}
