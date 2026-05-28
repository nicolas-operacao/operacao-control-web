import { useState } from 'react';
import { crmApi } from '../../services/crm/crmApi';
import { somClick, somHover } from '../../services/hudSounds';
import { toast } from '../../services/toast';

const ORIGENS = ['Manual', 'Instagram', 'Facebook', 'WhatsApp', 'Indicação', 'Site', 'Google Ads', 'Outro'];

interface Props {
  onClose: () => void;
  onCriado: () => void;
}

export function NovoLeadModal({ onClose, onCriado }: Props) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [produto, setProduto] = useState('');
  const [valor, setValor] = useState('');
  const [origem, setOrigem] = useState('Manual');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return toast.error('Nome é obrigatório');
    setSalvando(true);
    try {
      await crmApi.leads.create({
        nome, telefone, email,
        produto_interesse: produto,
        valor_estimado: valor ? Number(valor) : 0,
        origem, observacoes: obs,
      });
      toast.success('Lead criado!');
      onCriado();
      onClose();
    } catch { toast.error('Erro ao criar lead'); }
    finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-black text-lg uppercase tracking-widest">🎯 Novo Lead</h2>
          <button onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
        </div>
        <form onSubmit={salvar} className="p-5 space-y-3">
          <div>
            <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Nome do lead"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Telefone / WhatsApp</label>
              <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Produto de interesse</label>
              <input value={produto} onChange={e => setProduto(e.target.value)} placeholder="Ex: PRF Gold"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Valor estimado R$</label>
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Origem</label>
            <select value={origem} onChange={e => setOrigem(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2.5 text-sm outline-none">
              {ORIGENS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Contexto inicial, como chegou até você..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2 text-sm outline-none resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={salvando} onMouseEnter={somHover}
              className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest transition-all">
              {salvando ? 'Criando...' : '+ Criar Lead'}
            </button>
            <button type="button" onClick={() => { somClick(); onClose(); }}
              className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black rounded-xl transition-all">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
