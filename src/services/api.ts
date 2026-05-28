import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://operacao-control-production.up.railway.app',
  timeout: 30000,
});

// Intercepta a requisição ANTES dela sair do front-end
api.interceptors.request.use((config) => {
  // Pega o crachá da memória do navegador
  const token = localStorage.getItem('token');

  // Se o crachá existir e a estrutura de cabeçalhos estiver pronta, anexa o token
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});