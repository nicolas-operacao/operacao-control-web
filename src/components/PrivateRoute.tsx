import { Navigate } from 'react-router-dom';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/" replace />;

  const user = JSON.parse(userStr);
  // Suporte só acessa /liberacoes — qualquer outra rota privada redireciona
  if (user.role === 'suporte') return <Navigate to="/liberacoes" replace />;
  // Tráfego só acessa /trafego
  if (user.role === 'trafego') return <Navigate to="/trafego" replace />;

  return children;
}