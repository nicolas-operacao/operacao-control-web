import { Navigate } from 'react-router-dom';

// Esse componente recebe uma tela "filha" (children), que no nosso caso será o Dashboard
export function PrivateRoute({ children }: { children: React.ReactNode }) {
  
  // Verifica se o usuário foi salvo na memória pelo Login
  const user = localStorage.getItem('user');

  // Se não tiver usuário logado, redireciona (Navigate) para a tela inicial
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Se tiver usuário logado, deixa a tela que estava dentro dele renderizar
  return children;
}