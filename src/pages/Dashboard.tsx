import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

type User = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);

  useEffect(() => {
    async function fetchPending() {
      try {
        const response = await api.get('/admin/pending');
        setPendingUsers(response.data);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    }
    fetchPending();
  }, []);

  async function handleApprove(id: string) {
    try {
      await api.patch(`/admin/${id}/approve`);
      alert('Usuário aprovado com sucesso!');
      setPendingUsers(pendingUsers.filter(user => user.id !== id));
    } catch (error) {
      alert('Erro ao aprovar usuário.');
    }
  }

  function handleLogout() {
    localStorage.removeItem('user');
    navigate('/');
  }

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Painel do Administrador</h1>
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}>
          Sair
        </button>
      </div>
      <hr style={{ margin: '20px 0' }} />
      <h2>Vendedores Aguardando Aprovação</h2>
      
      {pendingUsers.length === 0 ? (
        <p style={{ color: '#666' }}>Não há nenhum usuário pendente no momento.</p>
      ) : (
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px' }}>Nome</th>
              <th style={{ padding: '10px' }}>E-mail</th>
              <th style={{ padding: '10px' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{user.name}</td>
                <td style={{ padding: '10px' }}>{user.email}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => handleApprove(user.id)} style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Aprovar Acesso
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}