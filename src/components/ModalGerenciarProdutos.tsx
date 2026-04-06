import React, { useState } from 'react';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';
import { toast } from '../services/toast';

type Produto = {
  id: number;
  nome: string;
  valor: number;
};

interface ModalGerenciarProdutosProps {
  isOpen: boolean;
  onClose: () => void;
  produtos: Produto[];
  onAtualizarLista: () => void;
}

export function ModalGerenciarProdutos({ isOpen, onClose, produtos, onAtualizarLista }: ModalGerenciarProdutosProps) {
  // 🔥 Trazemos os estados do produto para cá, limpando o Dashboard!
  const [editandoProdutoId, setEditandoProdutoId] = useState<number | null>(null);
  const [novoProdutoNome, setNovoProdutoNome] = useState('');
  const [novoProdutoValor, setNovoProdutoValor] = useState('');

  if (!isOpen) return null;

  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  async function handleSalvarProduto(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editandoProdutoId) {
        await api.put(`/products/${editandoProdutoId}`, { nome: novoProdutoNome, valor: Number(novoProdutoValor) });
        toast.success('Produto atualizado!');
      } else {
        await api.post('/products', { nome: novoProdutoNome, valor: Number(novoProdutoValor) });
        toast.success('Produto cadastrado!');
      }
      setNovoProdutoNome('');
      setNovoProdutoValor('');
      setEditandoProdutoId(null);
      onAtualizarLista();
    } catch (error) {
      toast.error('Erro ao salvar produto.');
    }
  }

  function iniciarEdicaoProduto(produto: Produto) {
    setEditandoProdutoId(produto.id); 
    setNovoProdutoNome(produto.nome); 
    setNovoProdutoValor(String(produto.valor));
  }

  function cancelarEdicao() {
    setEditandoProdutoId(null); 
    setNovoProdutoNome(''); 
    setNovoProdutoValor('');
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90vh]">
        
        <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-2xl font-black text-blue-400 uppercase tracking-wider">📦 Arsenal de Produtos</h2>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white text-2xl font-bold leading-none">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSalvarProduto} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 mb-8">
            <h3 className="text-zinc-400 font-bold mb-4 uppercase text-sm tracking-wider">
              {editandoProdutoId ? '✏️ Editando Produto' : '➕ Adicionar Novo Produto'}
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-zinc-500 text-xs font-bold uppercase mb-1">Nome do Produto</label>
                <input type="text" required value={novoProdutoNome} onChange={(e) => setNovoProdutoNome(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded p-2 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-zinc-500 text-xs font-bold uppercase mb-1">Valor (R$)</label>
                <input type="number" step="0.01" required value={novoProdutoValor} onChange={(e) => setNovoProdutoValor(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded p-2 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-2">
                {editandoProdutoId && (
                  <button type="button" onMouseEnter={somHover} onClick={() => { somClick(); cancelarEdicao(); }} className="px-4 py-2 border border-zinc-600 text-zinc-400 rounded hover:bg-zinc-800 transition-colors">Cancelar</button>
                )}
                <button type="submit" onMouseEnter={somHover} onClick={somClick} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded whitespace-nowrap transition-colors">
                  {editandoProdutoId ? 'Salvar Edição' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </form>

          <h3 className="text-zinc-400 font-bold mb-4 uppercase text-sm tracking-wider">Produtos Cadastrados ({produtos.length})</h3>
          
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase bg-zinc-900">
                  <th className="p-3 font-bold">Produto</th>
                  <th className="p-3 font-bold text-right">Valor</th>
                  <th className="p-3 font-bold text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => (
                  <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-900 transition-colors">
                    <td className="p-3 font-bold text-white">{p.nome}</td>
                    <td className="p-3 text-right text-green-400 font-medium">{formataBRL(Number(p.valor))}</td>
                    <td className="p-3 text-center">
                      <button onMouseEnter={somHover} onClick={() => { somClick(); iniciarEdicaoProduto(p); }} className="text-blue-400 hover:text-blue-300 text-sm font-bold underline">Editar</button>
                    </td>
                  </tr>
                ))}
                {produtos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-zinc-500">Nenhum produto cadastrado ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}