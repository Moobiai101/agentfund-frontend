import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ApiOptions {
    authenticated?: boolean
}

async function getHeaders(authenticated: boolean): Promise<HeadersInit> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }

    if (authenticated) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`
        }
    }

    return headers
}

export async function apiGet<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: await getHeaders(options.authenticated ?? false),
    })

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

export async function apiPost<T>(endpoint: string, body: unknown, options: ApiOptions = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: await getHeaders(options.authenticated ?? true),
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

// Public API (no auth required)
export const publicApi = {
    getPerformance: () => apiGet<PerformanceData>('/performance'),
    getStats: () => apiGet<StatsData>('/stats'),
    getTrades: (limit = 10) => apiGet<TradesData>(`/trades?limit=${limit}`),
}

// Admin API (auth required)
export const adminApi = {
    getSystemHealth: () => apiGet('/admin/system/health', { authenticated: true }),
    getEvolutionProposals: () => apiGet('/admin/evolution/proposals', { authenticated: true }),
    approveEvolution: (id: string) => apiPost(`/admin/evolution/approve/${id}`, {}, { authenticated: true }),
    rejectEvolution: (id: string) => apiPost(`/admin/evolution/reject/${id}`, {}, { authenticated: true }),
    pauseTrading: () => apiPost('/admin/trading/pause', {}, { authenticated: true }),
    resumeTrading: () => apiPost('/admin/trading/resume', {}, { authenticated: true }),
    emergencyHalt: () => apiPost('/admin/trading/halt', {}, { authenticated: true }),
    getAuditLogs: (limit = 50) => apiGet(`/admin/audit/recent?limit=${limit}`, { authenticated: true }),
    updateRiskConfig: (config: RiskConfig) => apiPost('/admin/risk/config', config, { authenticated: true }),
    closePosition: (symbol: string) => apiPost(`/admin/positions/${symbol}/close`, {}, { authenticated: true }),
    getOpenPositions: () => apiGet<OpenPositionsResponse>('/admin/positions', { authenticated: true }),
}

export interface OpenPositionsResponse {
    positions: Record<string, PositionData>
    count: number
}

export interface PositionData {
    instrument: string
    quantity: number
    avg_price: number
    direction: string
    strategy_id: string
    pnl_pct: number
    entry_time: string
}

export interface RiskConfig {
    max_position_size_pct?: number
    max_sector_exposure_pct?: number
    max_open_positions?: number
    max_daily_loss_pct?: number
    max_trade_loss_pct?: number
    max_drawdown_pct?: number
    drawdown_reduction_pct?: number
    max_correlation?: number
    margin_buffer_pct?: number
    no_trade_before?: string
    no_trade_after?: string
    no_trade_on_expiry_last_hour?: boolean
}

// Types
export interface PerformanceData {
    total_return_pct: number
    win_rate: number
    total_trades: number
    episodes_learned: number
    last_updated: string
}

export interface StatsData {
    strategies: StrategyStats[]
    total_strategies: number
}

export interface StrategyStats {
    strategy_id: string
    win_rate: number
    total_trades: number
    avg_pnl: number
}

export interface TradesData {
    trades: TradeRecord[]
    total: number
}

export interface TradeRecord {
    trade_id: string
    instrument: string
    direction: string
    pnl_percent: number
    outcome: string
    timestamp: string
}
