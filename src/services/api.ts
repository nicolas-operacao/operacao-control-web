import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
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