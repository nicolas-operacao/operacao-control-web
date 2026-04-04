import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

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

  // ==========================================
  // 🔥 FASE 1: TELA DE LOGIN TÁTICO
  // ==========================================
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Fundo da tela de Login com detalhe amarelo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/5 via-zinc-950 to-zinc-950 z-0"></div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 md:p-10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md z-10 relative overflow-hidden">
        
        {/* 🔥 TELA DE CARREGAMENTO (SPINNER) QUE COBRE O FORMULÁRIO */}
        {isLoading && (
          <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-200">
            <div className="w-14 h-14 border-4 border-zinc-800 border-t-yellow-400 rounded-full animate-spin shadow-[0_0_15px_rgba(250,204,21,0.5)] mb-4"></div>
            <h3 className="text-yellow-400 font-black tracking-widest text-xs uppercase animate-pulse">
              Autenticando...
            </h3>
            <p className="text-zinc-500 text-[9px] uppercase font-bold mt-2 tracking-widest">
              Verificando Servidor Seguro
            </p>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            Identificação <br/><span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]">Tática</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-3">
            Acesse o Comando Central | OP Control
          </p>
        </div>

        {/* ALERTA DE ERRO VISUAL (Substitui o window.alert feio) */}
        {error && (
          <div className="bg-red-950/30 border border-red-500/50 p-4 rounded-lg mb-6 flex items-center gap-3 animate-in shake">
            <span className="text-red-500 text-xl">⚠️</span>
            <p className="text-red-400 text-xs font-bold uppercase tracking-wide">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">
              E-mail Operacional
            </label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="nicolas@comando.com"
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg p-4 focus:outline-none focus:border-yellow-400 transition-colors" 
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">
              Senha de Acesso
            </label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg p-4 focus:outline-none focus:border-yellow-400 transition-colors" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-lg mt-4 uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            CONFIRMAR IDENTIDADE ⚡
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-xs mb-2">Ainda não faz parte da tropa?</p>
          {/* 🔥 Link de Cadastro mantido como /cadastro */}
          <Link to="/cadastro" className="text-yellow-400 font-bold text-xs uppercase tracking-widest hover:text-yellow-300 transition-colors">
            ALISTE-SE AQUI
          </Link>
        </div>
      </div>
    </div>
  );
}