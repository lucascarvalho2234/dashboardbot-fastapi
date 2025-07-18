// Serviço para comunicação com a API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface BotData {
  id: number;
  name: string;
  token: string;
  code?: string;
  is_active: boolean;
  gateway_id?: number;
  created_at: string;
  updated_at: string;
}

export interface GatewayData {
  id: number;
  name: string;
  type: string;
  api_url: string;
  status: 'Conectado' | 'Erro' | 'Testando';
  created_at: string;
}

export interface LogEntry {
  id: number;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  bot_id?: number;
  timestamp: string;
}

export interface StatsData {
  total_revenue: number;
  total_transactions: number;
  active_bots: number;
  total_bots: number;
  connected_gateways: number;
  total_gateways: number;
  success_rate: number;
}

class ApiService {
  private baseURL = '/api';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na API:', error);
      throw error;
    }
  }

  // Estatísticas
  async getStats(): Promise<StatsData> {
    return this.request<StatsData>('/stats');
  }

  // Bots
  async getBots(): Promise<BotData[]> {
    return this.request<BotData[]>('/bots');
  }

  async createBot(bot: Omit<BotData, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<BotData> {
    return this.request<BotData>('/bots', {
      method: 'POST',
      body: JSON.stringify(bot),
    });
  }

  async updateBot(id: number, bot: Partial<BotData>): Promise<BotData> {
    return this.request<BotData>(`/bots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bot),
    });
  }

  async deleteBot(id: number): Promise<void> {
    await this.request(`/bots/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleBot(id: number): Promise<void> {
    await this.request(`/bots/${id}/toggle`, {
      method: 'POST',
    });
  }

  async restartBot(id: number): Promise<void> {
    await this.request(`/bots/${id}/restart`, {
      method: 'POST',
    });
  }

  // Gateways
  async getGateways(): Promise<GatewayData[]> {
    return this.request<GatewayData[]>('/gateways');
  }

  async createGateway(gateway: Omit<GatewayData, 'id' | 'created_at' | 'status'> & { api_key: string }): Promise<GatewayData> {
    return this.request<GatewayData>('/gateways', {
      method: 'POST',
      body: JSON.stringify(gateway),
    });
  }

  async updateGateway(id: number, gateway: Partial<GatewayData> & { api_key?: string }): Promise<GatewayData> {
    return this.request<GatewayData>(`/gateways/${id}`, {
      method: 'PUT',
      body: JSON.stringify(gateway),
    });
  }

  async deleteGateway(id: number): Promise<void> {
    await this.request(`/gateways/${id}`, {
      method: 'DELETE',
    });
  }

  async testGateway(id: number): Promise<void> {
    await this.request(`/gateways/${id}/test`, {
      method: 'POST',
    });
  }

  // Logs
  async getLogs(limit: number = 100): Promise<LogEntry[]> {
    return this.request<LogEntry[]>(`/logs?limit=${limit}`);
  }

  async createLog(log: Omit<LogEntry, 'id' | 'timestamp'>): Promise<LogEntry> {
    return this.request<LogEntry>('/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  async clearLogs(): Promise<void> {
    await this.request('/logs', {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }
}

export const apiService = new ApiService();