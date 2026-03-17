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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <h1>Criar Conta</h1>
      <p>Cadastre-se para acessar o Operação Control</p>

      {error && <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px' }}>{error}</div>}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
        <input 
          type="text" 
          placeholder="Seu nome completo" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
          style={{ padding: '10px' }} 
        />
        
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
          placeholder="Crie sua senha" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px' }} 
        />

        {/* NOVO: Caixa de seleção para o cargo */}
        <select 
          value={role} 
          onChange={(e) => setRole(e.target.value)} 
          style={{ padding: '10px', backgroundColor: 'white', cursor: 'pointer' }}
        >
          <option value="vendedor">Sou Vendedor</option>
          <option value="suporte">Sou do Suporte</option>
        </select>

        <button type="submit" style={{ padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          Cadastrar
        </button>
      </form>

      <p style={{ marginTop: '20px' }}>
        Já tem uma conta? <Link to="/" style={{ color: '#007bff' }}>Faça login aqui</Link>
      </p>
    </div>
  );
}