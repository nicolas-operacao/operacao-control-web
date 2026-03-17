import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export function Login() {
  // Essa é a linha que estava faltando para o erro sumir!
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <h1>Operação Control</h1>
      <p>Faça login para acessar o sistema</p>

      {error && <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px' }}>{error}</div>}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px' }}
        />
        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          Entrar
        </button>
      </form>

      <p style={{ marginTop: '20px' }}>
        Não tem uma conta? <Link to="/cadastro" style={{ color: '#007bff' }}>Cadastre-se aqui</Link>
      </p>
    </div>
  );
}