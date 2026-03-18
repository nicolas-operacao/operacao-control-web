import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://operacao-control-api.onrender.com',
});

// Intercepta a requisição ANTES dela sair do front-end
api.interceptors.request.use((config) => {
  // Pega o crachá da memória
  const token = localStorage.getItem('token');

  // Se o crachá existir, anexa ele no cabeçalho no formato padrão da internet (Bearer)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});