import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';
import { toast } from '../services/toast';

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

      toast.success('Alistamento realizado! Se for vendedor, aguarde aprovação do Admin.');
      navigate('/');
    } catch (error: any) {
      if (error.response) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Erro ao conectar com o servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">

      {/* Gradientes de fundo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-[80px]" />
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]">
          <span className="text-xs font-black text-black">OC</span>
        </div>
        <span className="text-zinc-400 text-xs font-black uppercase tracking-widest">Operação Control</span>
      </div>

      <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-8 w-full max-w-md z-10 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Linha decorativa topo */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />

        <div className="text-center mb-7">
          <h1 className="text-2xl font-black text-white uppercase tracking-widest">Alistamento</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Crie sua conta na Operação Control</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Nome Completo</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva"
              className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-green-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-700" />
          </div>

          <div>
            <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
              className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-green-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-700" />
          </div>

          <div>
            <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Senha</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
              className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-green-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-700" />
          </div>

          <div>
            <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Função</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-green-500 text-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer transition-colors">
              <option value="vendedor">Vendedor (Soldado)</option>
              <option value="suporte">Suporte (Estratégico)</option>
              <option value="admin">Admin (Comando)</option>
            </select>
          </div>

          {role === 'vendedor' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
              <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest text-center">Escolha sua equipe</label>
              <div className="grid grid-cols-2 gap-2">
                {(['A', 'B'] as const).map(eq => (
                  <button key={eq} type="button" onClick={() => setEquipe(eq)}
                    className={`py-3 rounded-xl font-black uppercase text-sm tracking-wider transition-all border-2 ${
                      equipe === eq
                        ? eq === 'A' ? 'border-blue-500 bg-blue-950/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-red-500 bg-red-950/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'border-zinc-700 text-zinc-600 hover:border-zinc-600'
                    }`}>
                    {eq === 'A' ? '🔵 Equipe A' : '🔴 Equipe B'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" onMouseEnter={somHover} onClick={somClick} disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-400 active:scale-95 text-black font-black py-3.5 rounded-xl mt-2 uppercase tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            {isLoading ? 'Enviando...' : 'Realizar Cadastro →'}
          </button>

          <div className="text-center pt-4 border-t border-zinc-800/60">
            <p className="text-zinc-600 text-xs mb-1.5">Já tem conta?</p>
            <Link to="/" className="text-yellow-400 hover:text-yellow-300 font-bold text-xs uppercase tracking-widest transition-colors">
              Fazer Login →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}