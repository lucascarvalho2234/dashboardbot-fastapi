import React, { useState, useEffect } from 'react';
import { NotificationProvider, useNotification } from './components/NotificationProvider';
import { useStats, useBots, useGateways, useLogs } from './hooks/useApi';
import { BotData, GatewayData } from './services/api';
import { 
  LayoutDashboard, 
  Bot, 
  CreditCard, 
  Users, 
  LogOut, 
  Sun, 
  Moon, 
  Plus, 
  Edit3, 
  RefreshCw, 
  Trash2, 
  X,
  DollarSign,
  ShoppingCart,
  CheckCircle,
  PlugZap,
  Play,
  Pause,
  Terminal,
  FileText,
  Settings
} from 'lucide-react';

type Section = 'dashboard' | 'bots' | 'gateways' | 'users' | 'logs';

function AppContent() {
  const { showNotification } = useNotification();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  
  // Hooks da API
  const { stats, loading: statsLoading, refetch: refetchStats } = useStats();
  const { 
    bots, 
    loading: botsLoading, 
    createBot, 
    updateBot, 
    deleteBot, 
    toggleBot, 
    restartBot 
  } = useBots();
  const { 
    gateways, 
    loading: gatewaysLoading, 
    createGateway, 
    updateGateway, 
    deleteGateway, 
    testGateway 
  } = useGateways();
  const { logs, loading: logsLoading, clearLogs } = useLogs();
  
  // Modal states
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<BotData | null>(null);
  const [editingGateway, setEditingGateway] = useState<GatewayData | null>(null);
  
  // Bot form states
  const [botName, setBotName] = useState('');
  const [botToken, setBotToken] = useState('');
  const [botCode, setBotCode] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'code'>('config');
  
  // Gateway form states
  const [gatewayName, setGatewayName] = useState('');
  const [gatewayType, setGatewayType] = useState('BTCPay Server');
  const [gatewayUrl, setGatewayUrl] = useState('');
  const [gatewayKey, setGatewayKey] = useState('');

  // Bot functions
  const openBotModal = (bot?: BotData) => {
    if (bot) {
      setEditingBot(bot);
      setBotName(bot.name);
      setBotToken(bot.token);
      setBotCode(bot.code || '');
    } else {
      setEditingBot(null);
      setBotName('');
      setBotToken('');
      setBotCode('');
    }
    setActiveTab('config');
    setIsBotModalOpen(true);
  };

  const saveBotData = async () => {
    if (!botName.trim() || !botToken.trim()) {
      showNotification('error', 'Nome e token do bot são obrigatórios');
      return;
    }

    const botData = {
      name: botName,
      token: botToken,
      code: botCode,
      gateway_id: undefined // Implementar seleção de gateway se necessário
    };

    try {
      if (editingBot) {
        await updateBot(editingBot.id, botData);
        showNotification('success', `Bot "${botName}" atualizado com sucesso`);
      } else {
        await createBot(botData);
        showNotification('success', `Bot "${botName}" criado com sucesso`);
      }
      setIsBotModalOpen(false);
      refetchStats();
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Erro ao salvar bot');
    }
  };

  const toggleBotStatus = async (botId: number) => {
    try {
      await toggleBot(botId);
      const bot = bots.find(b => b.id === botId);
      showNotification('success', `Bot "${bot?.name}" ${bot?.is_active ? 'desativado' : 'ativado'}`);
      refetchStats();
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Erro ao alterar status do bot');
    }
  };

  const handleDeleteBot = async (botId: number) => {
    const bot = bots.find(b => b.id === botId);
    if (bot && window.confirm(`Excluir o bot "${bot.name}"?`)) {
      try {
        await deleteBot(botId);
        showNotification('success', `Bot "${bot.name}" excluído com sucesso`);
        refetchStats();
      } catch (error) {
        showNotification('error', error instanceof Error ? error.message : 'Erro ao excluir bot');
      }
    }
  };

  const handleRestartBot = async (botId: number) => {
    const bot = bots.find(b => b.id === botId);
    if (bot) {
      try {
        await restartBot(botId);
        showNotification('info', `Reinício do bot "${bot.name}" iniciado`);
      } catch (error) {
        showNotification('error', error instanceof Error ? error.message : 'Erro ao reiniciar bot');
      }
    }
  };

  // Gateway functions
  const openGatewayModal = (gateway?: GatewayData) => {
    if (gateway) {
      setEditingGateway(gateway);
      setGatewayName(gateway.name);
      setGatewayType(gateway.type);
      setGatewayUrl(gateway.api_url);
      setGatewayKey(''); // Não mostrar a chave por segurança
    } else {
      setEditingGateway(null);
      setGatewayName('');
      setGatewayType('BTCPay Server');
      setGatewayUrl('');
      setGatewayKey('');
    }
    setIsGatewayModalOpen(true);
  };

  const saveGatewayData = async () => {
    if (!gatewayName.trim() || !gatewayUrl.trim() || !gatewayKey.trim()) {
      showNotification('error', 'Todos os campos do gateway são obrigatórios');
      return;
    }

    const gatewayData = {
      name: gatewayName,
      type: gatewayType,
      api_url: gatewayUrl,
      api_key: gatewayKey
    };

    try {
      if (editingGateway) {
        await updateGateway(editingGateway.id, gatewayData);
        showNotification('success', `Gateway "${gatewayName}" atualizado com sucesso`);
      } else {
        await createGateway(gatewayData);
        showNotification('success', `Gateway "${gatewayName}" criado com sucesso`);
      }
      setIsGatewayModalOpen(false);
      refetchStats();
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Erro ao salvar gateway');
    }
  };

  const testGatewayConnection = async (gatewayId: number) => {
    const gateway = gateways.find(g => g.id === gatewayId);
    if (gateway) {
      try {
        await testGateway(gatewayId);
        showNotification('info', `Teste de conexão com gateway "${gateway.name}" iniciado`);
        refetchStats();
      } catch (error) {
        showNotification('error', error instanceof Error ? error.message : 'Erro ao testar gateway');
      }
    }
  };

  const handleDeleteGateway = async (gatewayId: number) => {
    const gateway = gateways.find(g => g.id === gatewayId);
    if (gateway && window.confirm(`Excluir o gateway "${gateway.name}"?`)) {
      try {
        await deleteGateway(gatewayId);
        showNotification('success', `Gateway "${gateway.name}" excluído com sucesso`);
        refetchStats();
      } catch (error) {
        showNotification('error', error instanceof Error ? error.message : 'Erro ao excluir gateway');
      }
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('Limpar todos os logs?')) {
      try {
        await clearLogs();
        showNotification('success', 'Logs limpos com sucesso');
      } catch (error) {
        showNotification('error', error instanceof Error ? error.message : 'Erro ao limpar logs');
      }
    }
  };

  // File upload handler
  const handleCodeFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.py')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBotCode(e.target?.result as string);
        showNotification('success', `Arquivo "${file.name}" carregado com sucesso`);
      };
      reader.readAsText(file);
    } else {
      showNotification('error', 'Por favor, selecione um arquivo Python (.py)');
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'dashboard': return 'Dashboard';
      case 'bots': return 'Meus Bots';
      case 'gateways': return 'Gateways';
      case 'users': return 'Usuários';
      case 'logs': return 'Logs do Sistema';
      default: return 'Dashboard';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'success': return 'text-green-600 dark:text-green-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getLogLevelBg = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 dark:bg-red-900/20';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'success': return 'bg-green-100 dark:bg-green-900/20';
      default: return 'bg-blue-100 dark:bg-blue-900/20';
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-teal-600 dark:text-teal-500">FarmMoneyRich</h1>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'bots', icon: Bot, label: 'Meus Bots' },
              { id: 'gateways', icon: CreditCard, label: 'Gateways' },
              { id: 'logs', icon: Terminal, label: 'Logs' },
              { id: 'users', icon: Users, label: 'Usuários' }
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id as Section)}
                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === id
                    ? 'bg-teal-50 dark:bg-gray-700 text-teal-600 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>
          
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
            <button className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white rounded-lg">
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0">
            <h2 className="text-xl font-semibold">{getSectionTitle()}</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="relative">
                <img 
                  className="h-9 w-9 rounded-full object-cover" 
                  src="https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop" 
                  alt="Avatar do usuário" 
                />
                <span className="absolute right-0 bottom-0 h-2.5 w-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Dashboard Section */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Receita Total</p>
                        <p className="text-2xl font-bold">
                          {statsLoading ? '...' : `R$ ${stats?.total_revenue?.toFixed(2) || '0,00'}`}
                        </p>
                      </div>
                      <div className="p-2.5 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                        <DollarSign className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transações</p>
                        <p className="text-2xl font-bold">
                          {statsLoading ? '...' : stats?.total_transactions || '0'}
                        </p>
                      </div>
                      <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bots Ativos</p>
                        <p className="text-2xl font-bold">
                          {statsLoading ? '...' : `${stats?.active_bots || 0} / ${stats?.total_bots || 0}`}
                        </p>
                      </div>
                      <div className="p-2.5 bg-green-100 dark:bg-green-900/50 rounded-lg">
                        <Bot className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gateways Conectados</p>
                        <p className="text-2xl font-bold">
                          {statsLoading ? '...' : `${stats?.connected_gateways || 0} / ${stats?.total_gateways || 0}`}
                        </p>
                      </div>
                      <div className="p-2.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
                  <h3 className="text-lg font-semibold mb-4">Logs Recentes</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {logsLoading ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">Carregando logs...</p>
                    ) : logs.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">Nenhum log disponível</p>
                    ) : (
                      logs.slice(0, 5).map(log => (
                      <div key={log.id} className={`p-3 rounded-lg ${getLogLevelBg(log.level)}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${getLogLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{log.message}</p>
                      </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bots Section */}
            {activeSection === 'bots' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Gerenciamento de Bots</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {botsLoading ? 'Carregando...' : `Bots hospedados: ${bots.length} de 5`}
                    </p>
                  </div>
                  <button
                    onClick={() => openBotModal()}
                    className="flex items-center bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Novo Bot
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {botsLoading ? (
                    <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">
                      Carregando bots...
                    </p>
                  ) : bots.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">
                      Nenhum bot encontrado. Adicione um novo para começar.
                    </p>
                  ) : (
                    bots.map(bot => (
                      <div key={bot.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow flex flex-col">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-semibold text-lg mr-2">{bot.name}</h4>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={bot.is_active}
                                onChange={() => toggleBotStatus(bot.id)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                            </label>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Token: <span className="font-mono">{bot.token.substring(0, 4)}...{bot.token.slice(-4)}</span>
                          </p>
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              bot.is_active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {bot.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-6 flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openBotModal(bot)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit3 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRestartBot(bot.id)}
                            className="p-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700"
                          >
                            <RefreshCw className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBot(bot.id)}
                            className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-gray-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Gateways Section */}
            {activeSection === 'gateways' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Gerenciamento de Gateways</h3>
                  <button
                    onClick={() => openGatewayModal()}
                    className="flex items-center bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Novo Gateway
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gatewaysLoading ? (
                    <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">
                      Carregando gateways...
                    </p>
                  ) : gateways.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">
                      Nenhum gateway encontrado. Adicione um novo para começar.
                    </p>
                  ) : (
                    gateways.map(gateway => (
                      <div key={gateway.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow flex flex-col">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-lg mr-2">{gateway.name}</h4>
                            <span className={`flex items-center text-sm px-2.5 py-0.5 rounded-full ${
                              gateway.status === 'Conectado'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                : gateway.status === 'Testando'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                            }`}>
                              <span className={`w-2 h-2 mr-2 rounded-full ${
                                gateway.status === 'Conectado' ? 'bg-green-500' :
                                gateway.status === 'Testando' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></span>
                              {gateway.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{gateway.type}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{gateway.api_url}</p>
                        </div>
                        
                        <div className="mt-6 flex items-center justify-end space-x-2">
                          <button
                            onClick={() => testGatewayConnection(gateway.id)}
                            className="p-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700"
                            disabled={gateway.status === 'Testando'}
                          >
                            <PlugZap className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openGatewayModal(gateway)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit3 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGateway(gateway.id)}
                            className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-gray-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Logs Section */}
            {activeSection === 'logs' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Logs do Sistema</h3>
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-colors"
                  >
                    <Trash2 className="h-5 w-5 mr-2" />
                    Limpar Logs
                  </button>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-4">
                      <Terminal className="h-5 w-5 text-gray-500" />
                      <span className="font-medium">Console de Logs</span>
                      <span className="text-sm text-gray-500">
                        ({logsLoading ? '...' : logs.length} entradas)
                      </span>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {logsLoading ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Carregando logs...</p>
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum log disponível</p>
                        <p className="text-sm">Os logs aparecerão aqui conforme as ações forem executadas</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-2">
                        {logs.map(log => (
                          <div key={log.id} className={`p-3 rounded-lg border-l-4 ${
                            log.level === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                            log.level === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                            log.level === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                            'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                  log.level === 'error' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
                                  log.level === 'warning' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                                  log.level === 'success' ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' :
                                  'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                }`}>
                                  {log.level.toUpperCase()}
                                </span>
                                {log.botId && (
                                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                                    Bot: {bots.find(b => b.id === log.bot_id)?.name || log.bot_id}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm mt-2 font-mono">{log.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Users Section */}
            {activeSection === 'users' && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
                <h3 className="text-lg font-semibold mb-4">Gerenciamento de Usuários</h3>
                <p className="text-gray-500 dark:text-gray-400">Funcionalidade em desenvolvimento.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bot Modal */}
      {isBotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold">
                {editingBot ? 'Editar Bot' : 'Adicionar Novo Bot'}
              </h3>
              <button
                onClick={() => setIsBotModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6">
                  <button
                    onClick={() => setActiveTab('config')}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'config'
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Configuração
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'code'
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Código
                  </button>
                </nav>
              </div>
              
              {activeTab === 'config' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome do Bot
                    </label>
                    <input
                      type="text"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder="Ex: Bot de Vendas"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Token do Telegram
                    </label>
                    <input
                      type="text"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="Cole o token obtido no @BotFather"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
              )}
              
              {activeTab === 'code' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Carregar arquivo (.py)
                    </label>
                    <input
                      type="file"
                      accept=".py"
                      onChange={handleCodeFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-gray-700 dark:file:text-teal-300 dark:hover:file:bg-gray-600"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Editor de Código
                    </label>
                    <textarea
                      value={botCode}
                      onChange={(e) => setBotCode(e.target.value)}
                      className="w-full bg-gray-900 text-white font-mono text-sm p-4 rounded-lg h-96 focus:ring-teal-500 focus:border-teal-500 resize-none"
                      placeholder="# Cole seu código Python aqui ou carregue um arquivo...
import telebot
from telebot import types

# Exemplo de bot básico
bot = telebot.TeleBot('SEU_TOKEN_AQUI')

@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.reply_to(message, 'Olá! Eu sou seu bot!')

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, message.text)

if __name__ == '__main__':
    bot.polling()"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end p-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsBotModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveBotData}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-lg shadow transition-colors"
                >
                  Salvar Bot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Modal */}
      {isGatewayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold">
                {editingGateway ? 'Editar Gateway' : 'Adicionar Novo Gateway'}
              </h3>
              <button
                onClick={() => setIsGatewayModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Gateway
                </label>
                <input
                  type="text"
                  value={gatewayName}
                  onChange={(e) => setGatewayName(e.target.value)}
                  placeholder="Ex: Meu Servidor Principal"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo
                </label>
                <select
                  value={gatewayType}
                  onChange={(e) => setGatewayType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                >
                  <option>BTCPay Server</option>
                  <option>Stripe</option>
                  <option>PayPal</option>
                  <option>Mercado Pago</option>
                  <option>Outro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL da API
                </label>
                <input
                  type="url"
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  placeholder="https://api.meugateway.com"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chave da API (API Key)
                </label>
                <input
                  type="password"
                  value={gatewayKey}
                  onChange={(e) => setGatewayKey(e.target.value)}
                  placeholder="••••••••••••••••••••"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end p-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveGatewayData}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-5 rounded-lg shadow transition-colors"
                >
                  Salvar Gateway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;