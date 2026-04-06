import { Navigate } from 'react-router-dom';

export function SuporteRoute({ children }: { children: React.ReactNode }) {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/" replace />;

  const user = JSON.parse(userStr);
  if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
  if (user.role !== 'suporte') return <Navigate to="/vendas" replace />;

  return children;
}
