import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';

export function Cadastro() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('vendedor');
  
  // Estado para a escolha da equipe
  const [equipe, setEquipe] = useState('A'); 
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/users', {
        name,
        email,
        password,
        role,
        // Só manda a equipe se o cargo for vendedor, senão manda nulo
        equipe: role === 'vendedor' ? equipe : null 
      });

      alert('Alistamento realizado com sucesso! Se você for vendedor, aguarde a liberação do Comando (Admin).');
      navigate('/');
    } catch (error: any) {
      if (error.response) {
        alert(error.response.data.error);
      } else {
        alert('Erro ao conectar com o Comando Central.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    // Fundo da página: Zinc 950 (Sombrio)
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans relative">
      
      {/* Efeito de brilho neon verde de fundo tático */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Cartão de Cadastro: Zinc 900 com borda escura e sombra neon suave */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 w-full max-w-lg shadow-[0_0_60px_rgba(34,197,94,0.05)] relative z-10 overflow-hidden">
        
        {/* Detalhe tático de canto */}
        <div className="absolute top-0 left-0 w-16 h-16 bg-green-500/10 rounded-br-full border-b border-r border-green-500/30"></div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
            Alistamento <span className="text-green-400">Oficial</span>
          </h1>
          <p className="text-zinc-500 mt-2 text-sm font-medium uppercase tracking-widest">Crie sua conta na Operação Control</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-zinc-600 text-xs font-bold uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Soldado John Doe"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-zinc-800"
            />
          </div>

          <div>
            <label className="block text-zinc-600 text-xs font-bold uppercase tracking-widest mb-1.5 ml-1">E-mail Operacional</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: john@comando.com"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-zinc-800"
            />
          </div>

          <div>
            <label className="block text-zinc-600 text-xs font-bold uppercase tracking-widest mb-1.5 ml-1">Senha tática</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-zinc-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-zinc-800"
            />
          </div>

          <div>
            <label className="block text-zinc-600 text-xs font-bold uppercase tracking-widest mb-1.5 ml-1">Função na Operação</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-zinc-950 border border-green-700 text-green-400 rounded-lg p-3 focus:outline-none cursor-pointer font-bold uppercase text-xs tracking-wider shadow-[0_0_15px_rgba(34,197,94,0.1)]"
            >
              <option value="vendedor">Sou Vendedor (Soldado)</option>
              <option value="suporte">Sou Suporte (Estratégico)</option>
              <option value="admin">Sou Admin (Comando)</option>
            </select>
          </div>

          {/* A CAIXA DE ESCOLHA DA EQUIPE (Mantendo a inteligência) */}
          {role === 'vendedor' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-zinc-950 rounded-lg border border-zinc-800/50 mt-4">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1 text-center">Para qual lado você vai lutar?</label>
              <select
                value={equipe}
                onChange={(e) => setEquipe(e.target.value)}
                className={`w-full border-2 rounded-lg p-3 focus:outline-none cursor-pointer font-black uppercase text-sm tracking-wider transition-all duration-300 ${
                  equipe === 'A' 
                    ? 'border-blue-700 bg-blue-950/30 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                    : 'border-red-700 bg-red-950/30 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                }`}
              >
                <option value="A">Força A (Lado Azul 🔵)</option>
                <option value="B">Força B (Lado Vermelho 🔴)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            onMouseEnter={somHover}
            onClick={somClick}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-black font-black py-4 rounded-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 mt-6 shadow-lg shadow-green-600/20 uppercase tracking-wider text-sm disabled:cursor-not-allowed"
          >
            {isLoading ? 'Enviando Alistamento...' : 'Realizar Cadastro'}
          </button>

          <div className="text-center mt-8 pt-5 border-t border-zinc-800">
            <p className="text-zinc-600 text-sm">Já é um veterano?</p>
            <Link to="/" className="text-green-400 font-bold hover:text-green-300 transition-colors uppercase text-sm tracking-widest mt-2 block">
              Acesse sua Conta
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}