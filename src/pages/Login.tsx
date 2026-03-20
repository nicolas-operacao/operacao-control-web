import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { user, token } = response.data;
      
      // 1. BLINDAGEM: Limpa qualquer fantasma do usuário anterior
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      // 2. Salva o novo recruta
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      alert(`Bem-vindo, ${user.name}! Identificação confirmada.`);
      
      // 🔥 3. O NOVO GUARDA DE TRÂNSITO: Separa Admin, Suporte e Vendedor
      if (user.role === 'admin') {
        navigate('/dashboard'); // Comandante vai para o painel de controle
      } else if (user.role === 'suporte') {
        navigate('/liberacoes'); // Equipe de Suporte vai para a tela de aprovações/reembolsos
      } else {
        navigate('/vendas'); // Soldado vai para a área de lançamento de vendas
      }

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

      {/* Cartão de Login: Zinc 900 com borda escura e sombra neon suave */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 w-full max-w-md shadow-[0_0_60px_rgba(34,197,94,0.05)] relative z-10 overflow-hidden">
        
        {/* Detalhe tático de canto */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full border-b border-l border-green-500/30"></div>

        <div className="text-center mb-10">
          {/* Título com neon verde */}
          <h1 className="text-3xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
            Identificação <span className="text-green-400">Tática</span>
          </h1>
          <p className="text-zinc-500 mt-2 text-sm font-medium uppercase tracking-widest">Acesse o Comando Central <span className='text-zinc-700'>| OP Control</span></p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-zinc-600 text-xs font-bold uppercase tracking-widest mb-1.5 ml-1">E-mail Operacional</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: nicolas@comando.com"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3.5 text-zinc-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="block text-zinc-600 text-xs font-bold uppercase tracking-widest mb-1.5 ml-1">Senha de Acesso</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3.5 text-zinc-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-zinc-700"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-black font-black py-4 rounded-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 mt-4 shadow-lg shadow-green-600/20 uppercase tracking-wider text-sm disabled:cursor-not-allowed"
          >
            {isLoading ? 'Autenticando credenciais...' : 'Confirmar Identidade'}
          </button>

          <div className="text-center mt-10 pt-5 border-t border-zinc-800">
            <p className="text-zinc-600 text-sm">Ainda não faz parte da tropa?</p>
            <Link to="/cadastro" className="text-green-400 font-bold hover:text-green-300 transition-colors uppercase text-sm tracking-widest mt-2 block">
              Aliste-se Aqui
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}