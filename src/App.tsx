import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Cadastro } from './pages/Cadastro';
import { Vendas } from './pages/Vendas';
import { Suporte } from './pages/Suporte';
import { RecrutasAdmin } from './pages/RecrutasAdmin';
import { Perfil } from './pages/Perfil';
import { Arsenal } from './pages/Arsenal';
import { Comparativo } from './pages/Comparativo';
import { PrivateRoute } from './components/PrivateRoute';
import { AdminRoute } from './components/AdminRoute';
import { SuporteRoute } from './components/SuporteRoute';
import { ToastContainer } from './components/ToastContainer';
import { SomPoller } from './components/SomPoller';

const MUSIC_VIDEO_ID = '7IFvoaH44Is';

// Iframe persistente fora do Router — nunca desmonta durante navegação
function GlobalMusic() {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function handler(e: Event) {
      const { action } = (e as CustomEvent<{ action: string }>).detail;
      if (!ref.current) return;
      if (action === 'start') {
        ref.current.src = `https://www.youtube.com/embed/${MUSIC_VIDEO_ID}?autoplay=1&controls=0&loop=1&playlist=${MUSIC_VIDEO_ID}&modestbranding=1`;
      } else if (action === 'stop') {
        ref.current.src = '';
      }
    }
    window.addEventListener('operacao:music', handler);
    return () => window.removeEventListener('operacao:music', handler);
  }, []);

  return (
    <iframe
      ref={ref}
      src=""
      allow="autoplay"
      style={{ position: 'fixed', width: 0, height: 0, opacity: 0, pointerEvents: 'none', border: 'none' }}
      title="music-global"
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <GlobalMusic />
      <ToastContainer />
      <SomPoller />
      <Routes>
        {/* Rotas Públicas (Qualquer um acessa) */}
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        
        {/* Rotas Privadas (Só entra com Crachá / Login) */}
        <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/admin/recrutas" element={<AdminRoute><RecrutasAdmin /></AdminRoute>} />
        <Route path="/vendas" element={<PrivateRoute><Vendas /></PrivateRoute>} />
        <Route path="/liberacoes" element={<SuporteRoute><Suporte /></SuporteRoute>} />
        <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
        <Route path="/arsenal" element={<PrivateRoute><Arsenal /></PrivateRoute>} />
        <Route path="/comparativo" element={<AdminRoute><Comparativo /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}