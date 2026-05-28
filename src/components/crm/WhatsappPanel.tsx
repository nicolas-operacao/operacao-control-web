import { useState, useEffect, useCallback } from 'react';
import { crmApi } from '../../services/crm/crmApi';
import type { WaConta } from '../../services/crm/crmApi';
import { somClick, somHover } from '../../services/hudSounds';
import { toast } from '../../services/toast';

export function WhatsappPanel() {
  const [contas, setContas] = useState<WaConta[]>([]);
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState('');
  const [instanceNova, setInstanceNova] = useState('');
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [qrData, setQrData] = useState<Record<string, any>>({});
  const [pairingData, setPairingData] = useState<Record<string, string>>({});
  const [pairingPhone, setPairingPhone] = useState<Record<string, string>>({});
  const [pairingLoading, setPairingLoading] = useState<string | null>(null);
  const [verificando, setVerificando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try { setContas(await crmApi.whatsapp.contas()); } catch {}
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Polling de status das contas não conectadas
  useEffect(() => {
    const t = setInterval(() => {
      contas.filter(c => c.status !== 'open' && c.status !== 'connected').forEach(c => {
        crmApi.whatsapp.status(c.instance_name).then(s => {
          setContas(prev => prev.map(p => p.instance_name === c.instance_name ? { ...p, status: s.status, numero_telefone: s.numero || p.numero_telefone } : p));
        }).catch(() => {});
      });
    }, 8000);
    return () => clearInterval(t);
  }, [contas]);

  async function criarConta() {
    if (!nomeNova.trim() || !instanceNova.trim()) return toast.error('Preencha nome e identificador');
    setSalvandoConta(true);
    try {
      const data = await crmApi.whatsapp.criar({ nome: nomeNova, instance_name: instanceNova });
      setContas(prev => [...prev, data]);
      setNomeNova(''); setInstanceNova(''); setCriando(false);
      toast.success('Conta criada! Agora escaneie o QR Code.');
      carregarQR(data.instance_name);
    } catch (e: any) { toast.error(e.response?.data?.error || e.message || 'Erro ao criar conta'); }
    finally { setSalvandoConta(false); }
  }

  async function carregarQR(instanceName: string) {
    try {
      const data = await crmApi.whatsapp.qr(instanceName);
      setQrData(prev => ({ ...prev, [instanceName]: data }));
    } catch (e: any) { toast.error(e.message || 'Erro ao gerar QR Code'); }
  }

  async function solicitarPairingCode(instanceName: string) {
    const phone = pairingPhone[instanceName]?.trim();
    if (!phone) return toast.error('Digite o número de telefone');
    setPairingLoading(instanceName);
    try {
      const data = await crmApi.whatsapp.pairingCode(instanceName, phone);
      const code = data?.pairingCode || data?.code || JSON.stringify(data);
      setPairingData(prev => ({ ...prev, [instanceName]: code }));
      setQrData(prev => { const n = { ...prev }; delete n[instanceName]; return n; });
    } catch (e: any) { toast.error(e.response?.data?.error || e.message || 'Erro ao gerar código'); }
    finally { setPairingLoading(null); }
  }

  async function verificarStatus(instanceName: string) {
    setVerificando(instanceName);
    try {
      const s = await crmApi.whatsapp.status(instanceName);
      setContas(prev => prev.map(c => c.instance_name === instanceName ? { ...c, status: s.status, numero_telefone: s.numero || c.numero_telefone } : c));
      if (s.status === 'open' || s.status === 'connected') {
        toast.success('Conectado!');
        setQrData(prev => { const n = { ...prev }; delete n[instanceName]; return n; });
      }
    } catch { toast.error('Erro ao verificar status'); }
    finally { setVerificando(null); }
  }

  async function desconectar(instanceName: string) {
    if (!confirm('Desconectar esta conta WhatsApp?')) return;
    try {
      await crmApi.whatsapp.desconectar(instanceName);
      carregar(); toast.success('Conta desconectada');
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }

  async function deletar(instanceName: string) {
    if (!confirm('Remover permanentemente esta conta?')) return;
    try {
      await crmApi.whatsapp.deletar(instanceName);
      carregar(); toast.success('Conta removida');
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }

  const isOnline = (s: string) => s === 'open' || s === 'connected';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-black text-base uppercase tracking-widest">📱 Contas WhatsApp</h3>
          <p className="text-zinc-600 text-xs mt-0.5">{contas.filter(c => isOnline(c.status)).length} de {contas.length} conectadas</p>
        </div>
        <button onMouseEnter={somHover} onClick={() => { somClick(); setCriando(v => !v); }}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-all">
          + Adicionar
        </button>
      </div>

      {/* Setup guide */}
      <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4 text-xs text-blue-300 space-y-1">
        <p className="font-black text-blue-400 uppercase tracking-wider">⚙️ Configuração necessária</p>
        <p>Para usar o WhatsApp, adicione as variáveis de ambiente no Railway:</p>
        <code className="block bg-zinc-950 rounded px-3 py-2 text-green-400 font-mono text-[10px] mt-2">
          EVOLUTION_API_URL=https://sua-evolution-api.railway.app<br/>
          EVOLUTION_API_KEY=sua-chave-aqui
        </code>
        <a href="https://github.com/EvolutionAPI/evolution-api" target="_blank" rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline">→ Como instalar a Evolution API</a>
      </div>

      {/* Form nova conta */}
      {criando && (
        <div className="bg-zinc-950/60 border border-zinc-700 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
          <p className="text-zinc-400 text-xs font-black uppercase tracking-wider">Nova conta WhatsApp</p>
          <div>
            <label className="block text-zinc-600 text-[10px] font-black uppercase mb-1">Nome exibido</label>
            <input value={nomeNova} onChange={e => setNomeNova(e.target.value)} placeholder="Ex: João Vendedor"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-green-500 text-white rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-zinc-600 text-[10px] font-black uppercase mb-1">Identificador único (sem espaços)</label>
            <input value={instanceNova} onChange={e => setInstanceNova(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="ex: joao_vendedor_1"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-green-500 text-white rounded-lg px-3 py-2 text-sm outline-none font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { somClick(); criarConta(); }} disabled={salvandoConta}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black py-2.5 rounded-lg text-sm uppercase tracking-widest transition-all">
              {salvandoConta ? 'Criando...' : 'Criar Conta'}
            </button>
            <button onClick={() => { somClick(); setCriando(false); }}
              className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black rounded-lg transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de contas */}
      {contas.length === 0 ? (
        <div className="text-center py-12 text-zinc-700 italic">Nenhuma conta configurada.</div>
      ) : (
        <div className="space-y-3">
          {contas.map(conta => (
            <div key={conta.id} className={`rounded-xl border p-4 transition-all ${isOnline(conta.status) ? 'border-green-800/50 bg-green-950/10' : 'border-zinc-800 bg-zinc-950/40'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline(conta.status) ? 'bg-green-500' : conta.status === 'qr_pending' ? 'bg-yellow-500 animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="text-white font-black text-sm">{conta.nome}</span>
                  </div>
                  {conta.numero_telefone && <p className="text-green-400 text-xs mt-0.5">{conta.numero_telefone}</p>}
                  {conta.responsavel_nome && <p className="text-zinc-600 text-[10px] mt-0.5">{conta.responsavel_nome}</p>}
                  <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded mt-1 ${isOnline(conta.status) ? 'bg-green-900/50 text-green-400' : conta.status === 'qr_pending' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {isOnline(conta.status) ? '✓ Conectado' : conta.status === 'qr_pending' ? '⟳ Aguardando QR' : 'Desconectado'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onMouseEnter={somHover} onClick={() => { somClick(); verificarStatus(conta.instance_name); }} disabled={verificando === conta.instance_name}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-all text-xs" title="Verificar status">
                    {verificando === conta.instance_name ? '⟳' : '↻'}
                  </button>
                  {!isOnline(conta.status) && (<>
                    <button onMouseEnter={somHover} onClick={() => { somClick(); carregarQR(conta.instance_name); setPairingData(prev => { const n = { ...prev }; delete n[conta.instance_name]; return n; }); }}
                      className="px-2.5 py-1.5 bg-green-900/40 hover:bg-green-800 text-green-400 text-[10px] font-black rounded-lg transition-all">
                      QR Code
                    </button>
                    <button onMouseEnter={somHover} onClick={() => { somClick(); setQrData(prev => { const n = { ...prev }; delete n[conta.instance_name]; return n; }); setPairingData(prev => { const n = { ...prev }; delete n[conta.instance_name]; return n; }); setPairingPhone(prev => ({ ...prev, [conta.instance_name]: prev[conta.instance_name] || '' })); }}
                      className="px-2.5 py-1.5 bg-blue-900/40 hover:bg-blue-800 text-blue-400 text-[10px] font-black rounded-lg transition-all">
                      Código
                    </button>
                  </>)}
                  {isOnline(conta.status) && (
                    <button onMouseEnter={somHover} onClick={() => { somClick(); desconectar(conta.instance_name); }}
                      className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900 text-red-400 text-[10px] font-black rounded-lg transition-all">
                      Desconectar
                    </button>
                  )}
                  <button onMouseEnter={somHover} onClick={() => { somClick(); deletar(conta.instance_name); }}
                    className="p-1.5 bg-zinc-800 hover:bg-red-950/60 text-zinc-600 hover:text-red-400 rounded-lg transition-all" title="Remover">
                    🗑️
                  </button>
                </div>
              </div>

              {/* QR Code */}
              {qrData[conta.instance_name] && (
                <div className="mt-4 flex flex-col items-center gap-3 bg-white rounded-xl p-4">
                  {qrData[conta.instance_name].base64 ? (
                    <img src={qrData[conta.instance_name].base64} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                  ) : (
                    <p className="text-zinc-800 text-sm text-center">
                      {qrData[conta.instance_name].code || JSON.stringify(qrData[conta.instance_name])}
                    </p>
                  )}
                  <p className="text-zinc-600 text-xs text-center">Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
                  <button onClick={() => { somClick(); verificarStatus(conta.instance_name); }}
                    className="px-4 py-2 bg-green-600 text-white font-black text-xs rounded-lg uppercase tracking-widest">
                    ✓ Já escaneei — verificar conexão
                  </button>
                </div>
              )}

              {/* Pairing Code (conexão por número de telefone) */}
              {conta.instance_name in pairingPhone && !qrData[conta.instance_name] && (
                <div className="mt-4 bg-zinc-950/80 border border-blue-800/40 rounded-xl p-4 space-y-3">
                  <p className="text-blue-400 font-black text-xs uppercase tracking-wider">📱 Conectar pelo número</p>
                  <p className="text-zinc-500 text-xs">Digite o número do celular que será vinculado (com DDD, sem o 55):</p>
                  {!pairingData[conta.instance_name] ? (<>
                    <div className="flex gap-2">
                      <input
                        value={pairingPhone[conta.instance_name] || ''}
                        onChange={e => setPairingPhone(prev => ({ ...prev, [conta.instance_name]: e.target.value }))}
                        placeholder="Ex: 11999998888"
                        className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-blue-500 text-white rounded-lg px-3 py-2 text-sm outline-none font-mono"
                      />
                      <button onClick={() => { somClick(); solicitarPairingCode(conta.instance_name); }} disabled={pairingLoading === conta.instance_name}
                        className="px-4 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-black text-xs rounded-lg uppercase tracking-widest transition-all">
                        {pairingLoading === conta.instance_name ? '...' : 'Gerar'}
                      </button>
                    </div>
                  </>) : (<>
                    <div className="text-center bg-zinc-900 rounded-xl py-5 px-4">
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Seu código de vinculação</p>
                      <p className="text-4xl font-black text-white tracking-[0.3em] font-mono">{pairingData[conta.instance_name]}</p>
                    </div>
                    <div className="bg-blue-950/30 border border-blue-800/30 rounded-lg p-3 text-xs text-blue-300 space-y-1">
                      <p className="font-black">Como usar:</p>
                      <p>1. Abra o WhatsApp no celular</p>
                      <p>2. Toque em <strong>⋮ Menu → Dispositivos vinculados</strong></p>
                      <p>3. Toque em <strong>Vincular dispositivo</strong></p>
                      <p>4. Na tela seguinte toque em <strong>"Vincular com número de telefone"</strong></p>
                      <p>5. Digite o código acima</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { somClick(); verificarStatus(conta.instance_name); }}
                        className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-600 text-white font-black text-xs rounded-lg uppercase tracking-widest">
                        ✓ Já digitei — verificar conexão
                      </button>
                      <button onClick={() => { somClick(); setPairingData(prev => { const n = { ...prev }; delete n[conta.instance_name]; return n; }); }}
                        className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-black rounded-lg transition-all">
                        Novo código
                      </button>
                    </div>
                  </>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
