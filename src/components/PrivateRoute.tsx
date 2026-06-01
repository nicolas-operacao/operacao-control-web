import { Navigate, useLocation } from 'react-router-dom';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const userStr = localStorage.getItem('user');
  const location = useLocation();

  if (!userStr) return <Navigate to="/" replace />;

  const user = JSON.parse(userStr);

  // Suporte pode acessar /liberacoes e /crm — qualquer outra rota privada redireciona
  if (user.role === 'suporte' && !location.pathname.startsWith('/crm')) {
    return <Navigate to="/liberacoes" replace />;
  }
  // Tráfego pode acessar /trafego e /crm
  if (user.role === 'trafego' && !location.pathname.startsWith('/crm')) {
    return <Navigate to="/trafego" replace />;
  }

  return children;
}
