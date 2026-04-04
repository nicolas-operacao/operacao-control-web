import { useState, useCallback } from 'react';
import { api } from '../services/api';

// Exportamos o tipo "Venda" daqui para todo o sistema usar
export type Venda = {
  id: string;
  product_name: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  payment_method?: string;
  sale_value: number;
  status: string;
  created_at: string;
  seller_name?: string;
  seller_id?: string | number;
  edit_status?: string;
  edit_reason?: string;
  edit_data?: any;
};

export function useVendas() {
  const [todasVendas, setTodasVendas] = useState<Venda[]>([]);
  const [vendasHoje, setVendasHoje] = useState(0);
  const [vendasSemana, setVendasSemana] = useState(0);
  const [vendasMes, setVendasMes] = useState(0);
  const [qtdHoje, setQtdHoje] = useState(0);
  const [qtdSemana, setQtdSemana] = useState(0);
  const [qtdMes, setQtdMes] = useState(0);

  // O "cérebro" de buscar as vendas agora mora aqui, isolado!
  const fetchVendas = useCallback(async () => {
    try {
      const response = await api.get('/sales');
      const data = response.data;
      setTodasVendas(data);

      const vendasAprovadas = data.filter((v: Venda) => v.status === 'aprovada');
      const hojeData = new Date(); hojeData.setHours(0, 0, 0, 0);
      const inicioSemana = new Date(hojeData); inicioSemana.setDate(hojeData.getDate() - hojeData.getDay()); 
      const inicioMes = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1); 

      let tHoje = 0, tSemana = 0, tMes = 0, qHoje = 0, qSemana = 0, qMes = 0;
      
      vendasAprovadas.forEach((v: Venda) => {
        const dataVenda = new Date(v.created_at); 
        const valor = Number(v.sale_value);
        
        if (dataVenda >= inicioMes) { tMes += valor; qMes++; }
        if (dataVenda >= inicioSemana) { tSemana += valor; qSemana++; }
        if (dataVenda >= hojeData) { tHoje += valor; qHoje++; }
      });
      
      setVendasHoje(tHoje); 
      setVendasSemana(tSemana); 
      setVendasMes(tMes); 
      setQtdHoje(qHoje); 
      setQtdSemana(qSemana); 
      setQtdMes(qMes);
    } catch (error) {
      console.error('🚨 Erro ao buscar vendas no Hook:', error);
    }
  }, []);

  return {
    todasVendas,
    vendasHoje,
    vendasSemana,
    vendasMes,
    qtdHoje,
    qtdSemana,
    qtdMes,
    fetchVendas
  };
}