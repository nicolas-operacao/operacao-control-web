import { Navigate } from 'react-router-dom';

export function TrafegoPagoRoute({ children }: { children: React.ReactNode }) {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/" replace />;

  const user = JSON.parse(userStr);
  if (user.role !== 'trafego' && user.role !== 'admin') return <Navigate to="/vendas" replace />;

  return children;
}
