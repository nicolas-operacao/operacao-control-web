import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      
      const loggedUser = response.data.user; // Pegamos os dados do usuário
      
      localStorage.setItem('user', JSON.stringify(loggedUser));
      localStorage.setItem('token', response.data.token);
      
      alert('Bem-vindo ao Operação Control! ' + loggedUser.name);
      
      // A MÁGICA ACONTECE AQUI: Redireciona de acordo com o cargo!
      if (loggedUser.role === 'admin') {
        navigate('/dashboard');
      } else if (loggedUser.role === 'suporte') {
        navigate('/liberacoes');
      } else {
        // Se for vendedor (ou qualquer outro), vai para as vendas
        navigate('/vendas'); 
      }
      
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao conectar com o servidor. Tente novamente.');
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">Operação Control</h1>
        <p className="text-gray-600 text-center mb-8">Faça login para acessar o sistema</p>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-300 rounded p-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border border-gray-300 rounded p-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white font-semibold rounded p-3 text-lg hover:bg-blue-700 transition duration-200"
          >
            Entrar
          </button>
        </form>

        <p className="mt-8 text-center text-gray-700">
          Não tem uma conta?{' '}
          <Link to="/cadastro" className="text-blue-600 hover:text-blue-800 font-medium">
            Cadastre-se aqui
          </Link>
        </p>
      </div>
    </div>
  );
}