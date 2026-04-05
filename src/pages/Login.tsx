import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para a tela de Boas-vindas Tática
  const [showSuccess, setShowSuccess] = useState(false);
  const [userName, setUserName] = useState('');
  const [mensagemTatica, setMensagemTatica] = useState('');
  const [destino, setDestino] = useState('/vendas');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 🔥 Rota exata do seu sistema mantida
      const response = await api.post('/auth/login', { email, password });
      
      const { user, token } = response.data;
      
      // 1. BLINDAGEM: Limpa qualquer fantasma do usuário anterior
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      // 2. Salva o novo recruta
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      // 3. Destrava as requisições seguras
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Mostra a tela de sucesso imediatamente
      setUserName(user.name);
      setShowSuccess(true);
      setIsLoading(false);
      new Audio('https://actions.google.com/sounds/v1/cartoon/bell_ding.ogg').play().catch(() => {});

      // Busca ranking em paralelo para montar a mensagem tática (não bloqueia a tela)
      const normaliza = (eq: string) => String(eq || '').trim().toUpperCase();
      const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      api.get('/ranking').then(rankingRes => {
        const ranking: any[] = Array.isArray(rankingRes.data) ? rankingRes.data : (rankingRes.data.data || []);
        const totalA = ranking
          .filter(v => ['A', 'EQUIPE A'].includes(normaliza(v.equipe)))
          .reduce((acc: number, v: any) => acc + (Number(v.total_vendido) || 0), 0);
        const totalB = ranking
          .filter(v => ['B', 'EQUIPE B'].includes(normaliza(v.equipe)))
          .reduce((acc: number, v: any) => acc + (Number(v.total_vendido) || 0), 0);
        const delta = Math.abs(totalA - totalB);
        const liderA = totalA >= totalB;
        const equipeUsuario = normaliza(user.equipe || '');

        let msg = '';
        if (user.role === 'admin') {
          msg = `A Equipe ${liderA ? 'A' : 'B'} está na frente por ${fmt(delta)}`;
        } else {
          const minhaEquipe = equipeUsuario === 'B' ? 'B' : 'A';
          const estouGanhando = minhaEquipe === 'A' ? liderA : !liderA;
          if (delta === 0) {
            msg = 'As equipes estão empatadas. Cada venda conta!';
          } else if (estouGanhando) {
            msg = `Continue assim! Sua equipe está ${fmt(delta)} à frente da equipe adversária!`;
          } else {
            msg = `Bora guerreiro! Dá pra alcançar — vocês estão ${fmt(delta)} atrás. Parte pra cima!`;
          }
        }
        // Atualiza o localStorage com a mensagem pronta
        const payload = JSON.parse(localStorage.getItem('mensagem_tatica') || '{}');
        localStorage.setItem('mensagem_tatica', JSON.stringify({ ...payload, mensagem: msg }));
        setMensagemTatica(msg);
      }).catch(() => {
        setMensagemTatica('');
      });

      // Guarda a mensagem e equipe no localStorage para o modal na próxima tela
      localStorage.setItem('mensagem_tatica', JSON.stringify({
        mensagem: '',
        equipe: user.role === 'admin' ? 'admin' : (user.equipe || 'A'),
        role: user.role,
      }));

      // Redireciona após 2.5 segundos
      const destino = user.role === 'admin' ? '/dashboard' : user.role === 'suporte' ? '/liberacoes' : '/vendas';
      setTimeout(() => navigate(destino), 2500);

    } catch (err: any) {
      if (err.response) {
        setError(err.response.data.error || 'Acesso negado. Credenciais inválidas.');
      } else {
        setError('Erro ao conectar com o Comando Central.');
      }
      setIsLoading(false);
    }
  }

  // ==========================================
  // 🔥 FASE 2: TELA DE SUCESSO (ACESSO CONCEDIDO)
  // ==========================================
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden animate-in fade-in duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/10 via-zinc-950 to-zinc-950 z-0"></div>
        
        <div className="z-10 flex flex-col items-center">
          <div className="text-yellow-400 text-7xl mb-6 animate-bounce drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">🛡️</div>
          <h1 className="text-4xl font-black text-white uppercase tracking-widest mb-2 text-center drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
            Acesso Concedido
          </h1>
          <p className="text-zinc-400 uppercase tracking-widest text-sm text-center">
            Bem-vindo(a) à Base de Operações, <br/>
            <span className="text-yellow-400 font-black text-lg">{userName}</span>
          </p>

          <div className="w-64 h-1 bg-zinc-800 mt-10 rounded overflow-hidden shadow-inner relative">
            <div className="h-full bg-yellow-400 w-full animate-[pulse_1s_ease-in-out_infinite]"></div>
          </div>
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-4 font-bold animate-pulse">
            Sincronizando Sistema Tático...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">

      {/* Gradientes de fundo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-400/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-600/5 rounded-full blur-[80px]" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-zinc-700/20 rounded-full blur-[80px]" />
      </div>

      {/* Logo + título acima do card */}
      <div className="z-10 text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.4)] mb-4">
          <span className="text-4xl font-black text-black leading-none select-none">OC</span>
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-[0.2em]">Operação Control</h1>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Sistema Tático de Vendas</p>
      </div>

      {/* Card */}
      <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 p-8 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] w-full max-w-sm z-10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Linha decorativa topo */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

        {/* Overlay de loading */}
        {isLoading && (
          <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-200 rounded-2xl">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-yellow-400 rounded-full animate-spin shadow-[0_0_15px_rgba(250,204,21,0.4)] mb-3" />
            <p className="text-yellow-400 font-black text-xs uppercase tracking-widest animate-pulse">Autenticando...</p>
          </div>
        )}

        <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6 text-center">Acesso ao Comando</h2>

        {error && (
          <div className="bg-red-950/40 border border-red-500/40 p-3 rounded-xl mb-5 flex items-center gap-3 animate-in fade-in duration-200">
            <span className="text-red-400 text-base flex-shrink-0">⚠️</span>
            <p className="text-red-300 text-xs font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-yellow-400 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-yellow-400 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-700"
            />
          </div>

          <button
            type="submit"
            onMouseEnter={somHover}
            onClick={somClick}
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black py-3.5 rounded-xl mt-2 uppercase tracking-widest shadow-[0_0_20px_rgba(250,204,21,0.25)] hover:shadow-[0_0_30px_rgba(250,204,21,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Entrar ⚡
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-800/60 text-center">
          <p className="text-zinc-600 text-xs mb-1.5">Ainda não tem conta?</p>
          <Link to="/cadastro" className="text-yellow-400 hover:text-yellow-300 font-bold text-xs uppercase tracking-widest transition-colors">
            Alistamento →
          </Link>
        </div>
      </div>
    </div>
  );
}