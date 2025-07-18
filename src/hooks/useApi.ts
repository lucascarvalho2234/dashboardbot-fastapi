import { useState, useEffect, useCallback } from 'react';
import { apiService, BotData, GatewayData, LogEntry, StatsData } from '../services/api';

export const useStats = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

export const useBots = () => {
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBots = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getBots();
      setBots(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar bots');
    } finally {
      setLoading(false);
    }
  }, []);

  const createBot = async (bot: Omit<BotData, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
    try {
      await apiService.createBot(bot);
      await fetchBots();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar bot');
    }
  };

  const updateBot = async (id: number, bot: Partial<BotData>) => {
    try {
      await apiService.updateBot(id, bot);
      await fetchBots();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar bot');
    }
  };

  const deleteBot = async (id: number) => {
    try {
      await apiService.deleteBot(id);
      await fetchBots();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir bot');
    }
  };

  const toggleBot = async (id: number) => {
    try {
      await apiService.toggleBot(id);
      await fetchBots();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao alterar status do bot');
    }
  };

  const restartBot = async (id: number) => {
    try {
      await apiService.restartBot(id);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao reiniciar bot');
    }
  };

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  return {
    bots,
    loading,
    error,
    refetch: fetchBots,
    createBot,
    updateBot,
    deleteBot,
    toggleBot,
    restartBot,
  };
};

export const useGateways = () => {
  const [gateways, setGateways] = useState<GatewayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGateways = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getGateways();
      setGateways(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar gateways');
    } finally {
      setLoading(false);
    }
  }, []);

  const createGateway = async (gateway: Omit<GatewayData, 'id' | 'created_at' | 'status'> & { api_key: string }) => {
    try {
      await apiService.createGateway(gateway);
      await fetchGateways();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar gateway');
    }
  };

  const updateGateway = async (id: number, gateway: Partial<GatewayData> & { api_key?: string }) => {
    try {
      await apiService.updateGateway(id, gateway);
      await fetchGateways();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar gateway');
    }
  };

  const deleteGateway = async (id: number) => {
    try {
      await apiService.deleteGateway(id);
      await fetchGateways();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir gateway');
    }
  };

  const testGateway = async (id: number) => {
    try {
      await apiService.testGateway(id);
      // Aguardar um pouco e recarregar para ver o resultado do teste
      setTimeout(() => {
        fetchGateways();
      }, 3000);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao testar gateway');
    }
  };

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  return {
    gateways,
    loading,
    error,
    refetch: fetchGateways,
    createGateway,
    updateGateway,
    deleteGateway,
    testGateway,
  };
};

export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getLogs();
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLogs = async () => {
    try {
      await apiService.clearLogs();
      await fetchLogs();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao limpar logs');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    clearLogs,
  };
};