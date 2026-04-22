import { Navigate } from 'react-router-dom';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/" replace />;

  const user = JSON.parse(userStr);
  if (user.role === 'suporte') return <Navigate to="/liberacoes" replace />;
  if (user.role === 'trafego') return <Navigate to="/trafego" replace />;
  if (user.role !== 'admin') return <Navigate to="/vendas" replace />;

  return children;
}
