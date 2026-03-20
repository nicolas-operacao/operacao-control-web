import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GuerraEquipes } from '../components/GuerraEquipes'; 

type Produto = {
  id: number;
  nome: string;
  valor: number;
};

// 🔥 CRACHÁ BLINDADO CONTRA ERROS DO TYPESCRIPT
type Venda = {
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
  edit_status?: string; 
  edit_reason?: string;
  edit_data?: any;
};

export function Dashboard() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Admin', id: '' };

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isModalProdutoOpen, setIsModalProdutoOpen] = useState(false);
  const [editandoProdutoId, setEditandoProdutoId] = useState<number | null>(null);
  const [novoProdutoNome, setNovoProdutoNome] = useState('');
  const [novoProdutoValor, setNovoProdutoValor] = useState('');

  const [isModalVendaOpen, setIsModalVendaOpen] = useState(false);
  const hoje = new Date().toISOString().split('T')[0];
  const [saleDate, setSaleDate] = useState(hoje);

  const [productName, setProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [saleValue, setSaleValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [vendasHoje, setVendasHoje] = useState(0);
  const [vendasSemana, setVendasSemana] = useState(0);
  const [vendasMes, setVendasMes] = useState(0);
  const META_MENSAL = 400000;

  const [todasVendas, setTodasVendas] = useState<Venda[]>([]);
  
  // 🔥 ADICIONADO: Visão 'vendedor' e Estado do Vendedor Selecionado
  const [visaoAtiva, setVisaoAtiva] = useState<'hoje' | 'semana' | 'mes' | 'vendedor' | null>(null);
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>('');

  useEffect(() => {
    fetchProdutos();
    fetchVendasPlacar();
  }, []);

  async function fetchProdutos() {
    try {
      const response = await api.get('/products');
      setProdutos(response.data);
      if (response.data.length > 0) {
        setProductName(response.data[0].nome);
        setSaleValue(String(response.data[0].valor));
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  }

  async function fetchVendasPlacar() {
    try {
      const response = await api.get('/sales');
      setTodasVendas(response.data);

      const vendasAprovadas = response.data.filter((v: Venda) => v.status === 'aprovada');

      const hojeData = new Date();
      hojeData.setHours(0, 0, 0, 0);

      const inicioSemana = new Date(hojeData);
      inicioSemana.setDate(hojeData.getDate() - hojeData.getDay()); 

      const inicioMes = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1); 

      let totalHoje = 0;
      let totalSemana = 0;
      let totalMes = 0;

      vendasAprovadas.forEach((v: Venda) => {
        const dataVenda = new Date(v.created_at);
        const valor = Number(v.sale_value);

        if (dataVenda >= inicioMes) totalMes += valor;
        if (dataVenda >= inicioSemana) totalSemana += valor;
        if (dataVenda >= hojeData) totalHoje += valor;
      });

      setVendasHoje(totalHoje);
      setVendasSemana(totalSemana);
      setVendasMes(totalMes);

    } catch (error) {
      console.error('Erro ao calcular placar:', error);
    }
  }

  // 🔥 APROVAR OU REJEITAR EDIÇÃO DO VENDEDOR (ADMIN)
  async function handleAprovarEdicao(id: string) {
    if(!window.confirm("Deseja APROVAR esta correção? Os dados da venda serão alterados.")) return;
    try {
      await api.post(`/sales/${id}/approve-edit`);
      alert("✅ Edição aprovada e aplicada com sucesso!");
      fetchVendasPlacar();
    } catch (error) {
      alert("Erro ao aprovar edição.");
    }
  }

  async function handleRejeitarEdicao(id: string) {
    if(!window.confirm("Deseja REJEITAR esta correção? O vendedor será notificado.")) return;
    try {
      await api.post(`/sales/${id}/reject-edit`);
      alert("❌ Edição rejeitada.");
      fetchVendasPlacar();
    } catch (error) {
      alert("Erro ao rejeitar edição.");
    }
  }

  // 🔥 LIBERAR VENDA PENDENTE (AMARELO)
  async function handleAprovarVenda(id: string) {
    if(!window.confirm("Deseja LIBERAR esta venda? Ela entrará imediatamente no placar do soldado.")) return;
    try {
      await api.post(`/sales/${id}/approve`);
      alert("✅ Venda liberada com sucesso!");
      fetchVendasPlacar();
    } catch (error) {
      alert("Erro ao liberar venda.");
    }
  }

  async function handleDeleteVenda(id: string) {
    const confirmacao = window.confirm("⚠️ ATENÇÃO COMANDANTE!\nTem certeza que deseja apagar esta venda permanentemente? Essa ação não pode ser desfeita.");
    if (confirmacao) {
      try {
        await api.delete(`/sales/${id}`);
        alert('💥 Venda eliminada com sucesso!');
        fetchVendasPlacar();
      } catch (error) {
        alert('🚨 Erro ao tentar excluir a venda. Verifique a conexão com o servidor.');
      }
    }
  }

  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nomeSelecionado = e.target.value;
    setProductName(nomeSelecionado);
    const produtoEscolhido = produtos.find(p => p.nome === nomeSelecionado);
    if (produtoEscolhido) setSaleValue(String(produtoEscolhido.valor));
  }

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault();
    alert(`Buscando vendas de ${dataInicio} até ${dataFim}!`);
  }

  async function handleSalvarProduto(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editandoProdutoId) {
        await api.put(`/products/${editandoProdutoId}`, { nome: novoProdutoNome, valor: Number(novoProdutoValor) });
        alert('Produto atualizado!');
      } else {
        await api.post('/products', { nome: novoProdutoNome, valor: Number(novoProdutoValor) });
        alert('Produto cadastrado!');
      }
      setNovoProdutoNome(''); setNovoProdutoValor(''); setEditandoProdutoId(null);
      fetchProdutos();
    } catch (error) {
      alert('Erro ao salvar produto.');
    }
  }

  function iniciarEdicaoProduto(produto: Produto) {
    setEditandoProdutoId(produto.id); setNovoProdutoNome(produto.nome); setNovoProdutoValor(String(produto.valor));
  }

  function cancelarEdicao() {
    setEditandoProdutoId(null); setNovoProdutoNome(''); setNovoProdutoValor('');
  }

  async function handleRegisterSale(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/sales', {
        seller_id: user.id, product_name: productName, customer_name: customerName,
        customer_email: customerEmail, customer_phone: customerPhone, payment_method: paymentMethod,
        sale_value: Number(saleValue), sale_date: saleDate
      });
      alert('⚡ Venda registrada com sucesso!');
      setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setSaleDate(hoje); setIsModalVendaOpen(false);
      fetchVendasPlacar(); 
    } catch (error: any) {
      alert('Erro ao registrar venda.');
    } finally {
      setIsLoading(false);
    }
  }

  // 🔥 LÓGICA DE FILTRAGEM DA TABELA (AGORA COM VISÃO DE VENDEDOR)
  const vendasTabela = todasVendas.filter(v => {
    if (!visaoAtiva || !v.created_at) return false;

    // Se a visão for por Vendedor, ignora as datas e mostra TODAS as vendas dele
    if (visaoAtiva === 'vendedor') {
      return v.seller_name === vendedorSelecionado;
    }

    const dataVenda = new Date(v.created_at);
    const hojeData = new Date();
    hojeData.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(hojeData);
    inicioSemana.setDate(hojeData.getDate() - hojeData.getDay());
    const inicioMes = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1);

    if (visaoAtiva === 'hoje') return dataVenda >= hojeData;
    if (visaoAtiva === 'semana') return dataVenda >= inicioSemana;
    if (visaoAtiva === 'mes') return dataVenda >= inicioMes;
    return false;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Separa os pedidos de edição para o Admin aprovar
  const edicoesPendentes = todasVendas.filter(v => v.edit_status === 'pendente');

  // Vendas Aguardando Liberação
  const vendasPendentes = todasVendas.filter(v => v.status === 'pendente_liberacao' || v.status === 'pendente_boleto' || v.status === 'pendente');

  const progressoMeta = Math.min((vendasMes / META_MENSAL) * 100, 100);
  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 🔥 Cria a lista de vendedores únicos para o Select
  const vendedoresUnicos = Array.from(new Set(todasVendas.map(v => v.seller_name).filter(nome => nome && nome !== 'Desconhecido'))).sort();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center pb-4 border-b border-zinc-800 gap-4">
          <h1 className="text-3xl md:text-4xl font-black text-yellow-400 uppercase tracking-wider flex items-center gap-3">
            Operação Control <span className="text-zinc-500 text-lg md:text-xl ml-2 font-bold">(Admin)</span>
          </h1>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => navigate('/liberacoes')} className="bg-purple-600 hover:bg-purple-700 text-white font-black px-4 py-2 rounded transition-all shadow-[0_0_10px_rgba(147,51,234,0.3)] uppercase text-xs tracking-wider border border-purple-500">
              🛡️ Suporte
            </button>
            <button onClick={() => navigate('/admin/recrutas')} className="border-2 border-purple-700 text-purple-300 hover:border-purple-500 hover:text-purple-500 px-4 py-2 rounded font-bold transition-all uppercase text-xs tracking-wider shadow-[0_0_10px_rgba(147,51,234,0.2)]">
              ⚠️ Recrutas Pendentes
            </button>
            <button onClick={() => setIsModalProdutoOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] uppercase text-xs tracking-wider border border-blue-500">
              ⚙️ Produtos
            </button>
            <button onClick={() => setIsModalVendaOpen(true)} className="bg-yellow-400 hover:bg-yellow-500 text-black font-black px-6 py-2 rounded transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(250,204,21,0.3)] uppercase text-sm tracking-wider">
              + REGISTRAR VENDA
            </button>
            <button onClick={handleLogout} className="border-2 border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-red-500 px-6 py-2 rounded font-bold transition-all duration-300 uppercase text-sm tracking-wider">
              Sair
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🔥 PAINEL DE AVISOS TÁTICOS (EDIÇÕES E LIBERAÇÕES)        */}
        {/* ========================================================= */}
        
        <div className="space-y-4">
          
          {/* AVISO 1: EDIÇÕES PENDENTES (AZUL) */}
          {edicoesPendentes.length > 0 && (
            <div className="bg-blue-900/10 border border-blue-500/30 rounded-xl p-6 shadow-2xl animate-in fade-in">
              <h2 className="text-xl font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                🔄 Solicitações de Correção Pendentes ({edicoesPendentes.length})
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {edicoesPendentes.map(venda => (
                  <div key={venda.id} className="bg-zinc-950 border border-blue-500/20 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Vendedor: <span className="text-white">{venda.seller_name}</span></p>
                      <p className="text-zinc-300 text-sm mt-1">
                        Cliente: <span className="font-bold text-white">{venda.customer_name}</span> | 
                        Valor Atual: <span className="text-green-400">{formataBRL(Number(venda.sale_value))}</span>
                      </p>
                      <div className="mt-3 bg-red-950/30 border border-red-500/20 p-3 rounded">
                        <p className="text-red-400 text-[10px] font-black uppercase mb-1">Motivo do Erro:</p>
                        <p className="text-zinc-300 text-sm italic">"{venda.edit_reason}"</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => handleRejeitarEdicao(venda.id)} className="flex-1 md:flex-none border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-colors">
                        Rejeitar
                      </button>
                      <button onClick={() => handleAprovarEdicao(venda.id)} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-black text-xs uppercase tracking-widest shadow-lg transition-colors">
                        Aprovar Correção
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AVISO 2: VENDAS AGUARDANDO LIBERAÇÃO (AMARELO) */}
          {vendasPendentes.length > 0 && (
            <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-xl p-6 shadow-2xl animate-in fade-in">
              <h2 className="text-xl font-black text-yellow-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                ⚠️ Vendas Aguardando Liberação ({vendasPendentes.length})
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {vendasPendentes.map(venda => (
                  <div key={venda.id} className="bg-zinc-950 border border-yellow-500/20 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Vendedor: <span className="text-white">{venda.seller_name}</span></p>
                      <p className="text-zinc-300 text-sm mt-1">
                        Cliente: <span className="font-bold text-white">{venda.customer_name}</span> | 
                        Produto: <span className="font-bold text-yellow-400">{venda.product_name}</span>
                      </p>
                      <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">
                        Valor: {formataBRL(Number(venda.sale_value))} | Pagamento: {venda.payment_method}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => handleDeleteVenda(venda.id)} className="flex-1 md:flex-none border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-colors">
                        Excluir Venda
                      </button>
                      <button onClick={() => handleAprovarVenda(venda.id)} className="flex-1 md:flex-none bg-green-600 hover:bg-green-500 text-black px-6 py-2 rounded font-black text-xs uppercase tracking-widest shadow-lg transition-colors">
                        Liberar Venda
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* 🔥 AQUI ESTÁ A NOVA FUNCIONALIDADE! FILTROS TÁTICOS + BUSCA POR SOLDADO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col lg:flex-row items-end gap-6">
          
          {/* O NOVO CAMPO DE SELECIONAR SOLDADO */}
          <div className="w-full lg:flex-1">
            <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 text-yellow-400">
              🎯 Caçar Soldado (Ver Toda a Ficha)
            </label>
            <select 
              value={vendedorSelecionado} 
              onChange={(e) => {
                const nome = e.target.value;
                setVendedorSelecionado(nome);
                if (nome) setVisaoAtiva('vendedor');
                else setVisaoAtiva(null);
              }}
              className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 cursor-pointer transition-colors"
            >
              <option value="">Selecione um soldado...</option>
              {vendedoresUnicos.map(nome => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-auto flex flex-col md:flex-row items-end gap-4 border-t lg:border-t-0 lg:border-l border-zinc-800 pt-4 lg:pt-0 lg:pl-6">
            <div className="w-full md:w-auto">
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Data Inicial</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 transition-colors [color-scheme:dark]" />
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Data Final</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 transition-colors [color-scheme:dark]" />
            </div>
            <button onClick={handleFiltrar} className="w-full md:w-auto bg-zinc-800 hover:bg-yellow-400 hover:text-black text-white font-black py-3 px-8 rounded transition-all duration-300 uppercase tracking-widest border border-zinc-700 hover:border-yellow-400">
              Filtrar Batalha
            </button>
          </div>
        </div>

        {/* PLACAR GLOBAL GAMIFICADO */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div onClick={() => { setVisaoAtiva('hoje'); setVendedorSelecionado(''); }} className={`bg-zinc-900 border-l-4 p-6 rounded-lg shadow-2xl relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-[1.02] group ${visaoAtiva === 'hoje' ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-yellow-400 hover:border-yellow-300'}`}>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-yellow-400 text-[10px] font-black uppercase tracking-widest">Ver Lista 👁️</div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Vendas Hoje</p>
            <h2 className="text-3xl font-black text-white">{formataBRL(vendasHoje)}</h2>
          </div>
          <div onClick={() => { setVisaoAtiva('semana'); setVendedorSelecionado(''); }} className={`bg-zinc-900 border-l-4 p-6 rounded-lg shadow-2xl relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-[1.02] group ${visaoAtiva === 'semana' ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-yellow-400 hover:border-yellow-300'}`}>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-yellow-400 text-[10px] font-black uppercase tracking-widest">Ver Lista 👁️</div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Esta Semana</p>
            <h2 className="text-3xl font-black text-white">{formataBRL(vendasSemana)}</h2>
          </div>
          <div onClick={() => { setVisaoAtiva('mes'); setVendedorSelecionado(''); }} className={`bg-zinc-900 border-l-4 p-6 rounded-lg shadow-2xl relative overflow-hidden md:col-span-2 cursor-pointer transform transition-all duration-200 hover:scale-[1.02] group ${visaoAtiva === 'mes' ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-yellow-400 hover:border-yellow-300'}`}>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-yellow-400 text-[10px] font-black uppercase tracking-widest">Ver Lista 👁️</div>
            <div className="absolute top-0 right-0 p-4 opacity-5 text-yellow-400 text-8xl">🎯</div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Acumulado do Mês</p>
            <div className="flex justify-between items-end">
              <h2 className="text-4xl font-black text-white">{formataBRL(vendasMes)}</h2>
              <span className="text-zinc-500 text-sm font-bold mb-1">Meta: {formataBRL(META_MENSAL)}</span>
            </div>
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-4 mt-4 overflow-hidden">
              <div className="bg-yellow-400 h-4 rounded-full relative transition-all duration-1000 ease-out" style={{ width: `${progressoMeta}%` }}>
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-right text-yellow-400/50 text-xs mt-1 font-bold">{progressoMeta.toFixed(1)}% alcançado</p>
          </div>
        </div>

        {/* TABELA DETALHADA (AO CLICAR NO PLACAR OU SELECIONAR VENDEDOR) */}
        {visaoAtiva && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
              <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="text-yellow-400">⚡</span> Detalhamento: 
                {visaoAtiva === 'hoje' ? ' Vendas de Hoje' : 
                 visaoAtiva === 'semana' ? ' Vendas da Semana' : 
                 visaoAtiva === 'mes' ? ' Acumulado do Mês' : 
                 visaoAtiva === 'vendedor' ? ` Ficha Completa: ${vendedorSelecionado}` : ''}
              </h3>
              <button onClick={() => { setVisaoAtiva(null); setVendedorSelecionado(''); }} className="text-zinc-500 hover:text-red-500 font-bold uppercase text-xs transition-colors px-3 py-1 border border-zinc-800 rounded hover:border-red-500">
                FECHAR X
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest">
                    <th className="pb-4 font-black">Data</th>
                    <th className="pb-4 font-black">Soldado</th>
                    <th className="pb-4 font-black">Cliente</th>
                    <th className="pb-4 font-black">Produto</th>
                    <th className="pb-4 font-black text-right">Valor</th>
                    <th className="pb-4 font-black text-center">Status</th>
                    <th className="pb-4 font-black text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {vendasTabela.length > 0 ? vendasTabela.map(venda => (
                    <tr key={venda.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors">
                      <td className="py-4 text-zinc-400 whitespace-nowrap">{venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR') : '--'}</td>
                      <td className="py-4 font-black text-blue-400 uppercase tracking-wider">{venda.seller_name || 'Desconhecido'}</td>
                      <td className="py-4 text-zinc-200 font-medium">{venda.customer_name}</td>
                      <td className="py-4 text-zinc-400 text-xs">{venda.product_name}</td>
                      <td className="py-4 text-green-400 font-black text-right whitespace-nowrap">{formataBRL(Number(venda.sale_value))}</td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${venda.status === 'aprovada' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                          {venda.status === 'aprovada' ? 'Aprovada' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <button onClick={() => handleDeleteVenda(venda.id)} className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded transition-colors" title="Excluir Venda">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest italic">
                        Nenhuma venda registrada neste período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="w-full">
          <GuerraEquipes />
        </div>
      </div>

      {/* ========================================= */}
      {/* MODAL DE VENDAS DO ADMIN                  */}
      {/* ========================================= */}
      {isModalVendaOpen && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
           
           <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-center">
             <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-wider">🎯 Venda do Comando</h2>
             <button onClick={() => setIsModalVendaOpen(false)} className="text-zinc-500 hover:text-white text-2xl font-bold leading-none">&times;</button>
           </div>

           <form onSubmit={handleRegisterSale} className="p-6 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Produto Vendido</label>
                 <select value={productName} onChange={handleProductChange} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 cursor-pointer">
                   {produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                   {produtos.length === 0 && <option value="">Cadastre produtos primeiro...</option>}
                 </select>
               </div>
               <div>
                 <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Valor da Venda (R$)</label>
                 <input type="number" step="0.01" required value={saleValue} onChange={(e) => setSaleValue(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-yellow-400 font-bold rounded p-3 focus:outline-none focus:border-yellow-400"/>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Nome do Cliente</label>
                 <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400"/>
               </div>
               <div>
                 <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Telefone</label>
                 <input type="text" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400"/>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">E-mail do Cliente</label>
                 <input type="email" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400"/>
               </div>
               <div>
                 <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Data da Venda</label>
                 <input type="date" required value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 cursor-pointer [color-scheme:dark]"/>
               </div>
             </div>

             <div>
               <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Método de Pagamento</label>
               <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 cursor-pointer">
                 <option value="PIX">PIX</option>
                 <option value="Cartão de Crédito (até 12x)">Cartão de Crédito (até 12x)</option>
                 <option value="Crédito à vista">Crédito à vista</option>
                 <option value="Débito à vista">Débito à vista</option>
                 <option value="Boleto Parcelado">Boleto Parcelado</option>
               </select>
             </div>

             <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800 mt-6">
               <button type="button" onClick={() => setIsModalVendaOpen(false)} className="px-6 py-3 font-bold text-zinc-400 hover:text-white transition-colors">CANCELAR</button>
               <button type="submit" disabled={isLoading} className="bg-yellow-400 hover:bg-yellow-500 text-black font-black px-8 py-3 rounded uppercase tracking-wider transition-transform hover:scale-105 active:scale-95 disabled:opacity-50">
                 {isLoading ? 'ENVIANDO...' : 'SALVAR VENDA'}
               </button>
             </div>
           </form>
         </div>
       </div>
      )}

      {/* ========================================= */}
      {/* MODAL DE GERENCIAR PRODUTOS               */}
      {/* ========================================= */}
      {isModalProdutoOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-2xl font-black text-blue-400 uppercase tracking-wider">📦 Arsenal de Produtos</h2>
              <button onClick={() => setIsModalProdutoOpen(false)} className="text-zinc-500 hover:text-white text-2xl font-bold leading-none">&times;</button>
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
                      <button type="button" onClick={cancelarEdicao} className="px-4 py-2 border border-zinc-600 text-zinc-400 rounded hover:bg-zinc-800 transition-colors">Cancelar</button>
                    )}
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded whitespace-nowrap transition-colors">
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
                          <button onClick={() => iniciarEdicaoProduto(p)} className="text-blue-400 hover:text-blue-300 text-sm font-bold underline">Editar</button>
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
      )}

    </div>
  );
}