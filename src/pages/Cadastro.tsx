import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export function Cadastro() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // NOVO: Estado para guardar o cargo escolhido (já começa no vendedor por padrão)
  const [role, setRole] = useState('vendedor'); 
  const [error, setError] = useState('');

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      // NOVO: Agora enviamos o 'role' (cargo) para o back-end junto com os outros dados
      await api.post('/users', { name, email, password, role });
      
      alert('Cadastro realizado com sucesso! Aguarde o administrador aprovar seu acesso.');
      navigate('/');
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao conectar com o servidor.');
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">Criar Conta</h1>
        <p className="text-gray-600 text-center mb-8">Cadastre-se para acessar o Operação Control</p>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-5">
          <input 
            type="text" 
            placeholder="Seu nome completo" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            className="border border-gray-300 rounded p-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          
          <input 
            type="email" 
            placeholder="Seu e-mail" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="border border-gray-300 rounded p-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          
          <input 
            type="password" 
            placeholder="Crie sua senha" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="border border-gray-300 rounded p-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)} 
            className="border border-gray-300 rounded p-3 text-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="vendedor">Sou Vendedor</option>
            <option value="suporte">Sou do Suporte</option>
          </select>

          <button type="submit" className="bg-green-600 text-white font-semibold rounded p-3 text-lg hover:bg-green-700 transition duration-200">
            Realizar Cadastro
          </button>
        </form>

        <p className="mt-8 text-center text-gray-700">
          Já tem uma conta? <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">Faça login aqui</Link>
        </p>
      </div>
    </div>
  );
}