import { useNavigate } from 'react-router-dom';

export function Liberacoes() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Liberação de Combos e Upgrades 🛠️</h1>
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}>Sair</button>
      </div>
      <hr />
      <p>Aqui o suporte fará as aprovações de produtos especiais.</p>
    </div>
  );
}