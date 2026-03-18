import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

// Ensinamos o Front-end o que é um Produto
type Produto = {
  id: number;
  nome: string;
  valor: number;
};

export function Vendas() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Vendedor', id: '' };

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // NOVO: Estado para guardar a lista de produtos que vem do banco
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [productName, setProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [saleValue, setSaleValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // NOVO: Busca os produtos assim que a tela carrega
  useEffect(() => {
    async function fetchProdutos() {
      try {
        const response = await api.get('/products');
        setProdutos(response.data);
        
        // Já deixa o primeiro produto selecionado por padrão (se existir)
        if (response.data.length > 0) {
          setProductName(response.data[0].nome);
          setSaleValue(String(response.data[0].valor));
        }
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
      }
    }
    fetchProdutos();
  }, []);

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }

  // NOVO: A MÁGICA DO PREÇO AUTOMÁTICO
  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nomeSelecionado = e.target.value;
    setProductName(nomeSelecionado);

    // Procura o produto escolhido na lista para pegar o valor dele
    const produtoEscolhido = produtos.find(p => p.nome === nomeSelecionado);
    if (produtoEscolhido) {
      setSaleValue(String(produtoEscolhido.valor)); // Preenche o valor automaticamente!
    }
  }

  async function handleRegisterSale(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/sales', {
        seller_id: user.id,
        product_name: productName,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        payment_method: paymentMethod,
        sale_value: Number(saleValue)
      });

      alert('⚡ Venda registrada com sucesso!');
      
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      // Não limpamos o produto e valor para facilitar a próxima venda
      setIsModalOpen(false);
      
    } catch (error: any) {
      if (error.response) {
        alert('Erro ao registrar venda: ' + error.response.data.error);
      } else {
        alert('Erro ao conectar com o servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-4 border-b border-zinc-800 gap-4">
          <div>
            <h1 className="text-4xl font-black text-yellow-400 tracking-tight uppercase flex items-center gap-3">
              Operação Control <span className="text-2xl">⚡</span>
            </h1>
            <p className="text-zinc-400 mt-1">Bem-vindo(a) de volta, <span className="text-white font-bold">{user.name}</span></p>
          </div>
          <button 
            onClick={handleLogout} 
            className="border-2 border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-red-500 px-6 py-2 rounded font-bold transition-all duration-300 uppercase text-sm tracking-wider"
          >
            Desconectar
          </button>
        </div>

        {/* ÁREA DE REGISTRO E LISTA DE VENDAS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl mt-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white uppercase tracking-wide">Minhas Vendas Recentes</h3>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-black px-6 py-3 rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
            >
              + REGISTRAR VENDA
            </button>
          </div>

          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-10 text-center">
            <p className="text-zinc-500 text-lg">Você ainda não registrou nenhuma venda na sua lista.</p>
            <p className="text-yellow-400/80 mt-2 font-medium">O jogo já começou. Lance sua primeira venda!</p>
          </div>
        </div>

      </div>

      {/* ========================================= */}
      {/* MODAL DE REGISTRO DE VENDA DO VENDEDOR    */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-wider">🎯 Nova Venda</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRegisterSale} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Produto Vendido</label>
                  <select 
                    value={productName}
                    onChange={handleProductChange} // NOVO: Chama a mágica de preencher o preço
                    className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 transition-colors cursor-pointer"
                  >
                    {/* NOVO: Agora os produtos vêm direto do seu banco de dados! */}
                    {produtos.map(produto => (
                      <option key={produto.id} value={produto.nome}>
                        {produto.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Valor da Venda (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={saleValue}
                    onChange={(e) => setSaleValue(e.target.value)} // Permite que o vendedor altere o preço se tiver dado um desconto extra
                    className="w-full bg-zinc-950 border border-zinc-700 text-yellow-400 font-bold rounded p-3 focus:outline-none focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Nome do Cliente</label>
                  <input 
                    type="text" 
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">WhatsApp / Telefone</label>
                  <input 
                    type="text" 
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">E-mail do Cliente</label>
                <input 
                  type="email" 
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Ex: joao@email.com"
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Método de Pagamento</label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 transition-colors cursor-pointer"
                >
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito (até 12x)">Cartão de Crédito (até 12x)</option>
                  <option value="Crédito à vista">Crédito à vista</option>
                  <option value="Débito à vista">Débito à vista</option>
                  <option value="Boleto Parcelado">Boleto Parcelado (Requer Aprovação)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-black px-8 py-3 rounded transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 uppercase tracking-wider"
                >
                  {isLoading ? 'ENVIANDO...' : 'SALVAR VENDA'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}