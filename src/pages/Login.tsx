import { useState, FormEvent } from 'react';
import { api } from '../services/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent) {
    event.preventDefault(); // Evita que a página recarregue
    setError(''); // Limpa erros antigos

    try {
      // Tenta fazer o login batendo na nossa rota do back-end!
      const response = await api.post('/auth/login', { email, password });

      // Se der certo, mostra um alerta temporário
      alert('Bem-vindo ao Operação Control! ' + response.data.user.name);
      console.log(response.data);

    } catch (err: any) {
      // Se o back-end recusar (ex: "Conta pendente"), pegamos a mensagem exata
      if (err.response && err.response.data) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao conectar com o servidor.');
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px' }}>
      <h1>Operação Control</h1>
      <p>Faça login para acessar o sistema</p>

      {/* Se tiver erro, mostra uma caixinha vermelha */}
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
    </div>
  );
}