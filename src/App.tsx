import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Cadastro } from './pages/Cadastro';
import { Vendas } from './pages/Vendas';
import { Suporte } from './pages/Suporte';
import { RecrutasAdmin } from './pages/RecrutasAdmin';
import { Perfil } from './pages/Perfil';
import { Arsenal } from './pages/Arsenal';
import { PrivateRoute } from './components/PrivateRoute';
import { ToastContainer } from './components/ToastContainer';

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Rotas Públicas (Qualquer um acessa) */}
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        
        {/* Rotas Privadas (Só entra com Crachá / Login) */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/vendas" element={<PrivateRoute><Vendas /></PrivateRoute>} />
        <Route path="/liberacoes" element={<PrivateRoute><Suporte /></PrivateRoute>} />
        <Route path="/admin/recrutas" element={<PrivateRoute><RecrutasAdmin /></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
        <Route path="/arsenal" element={<PrivateRoute><Arsenal /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}