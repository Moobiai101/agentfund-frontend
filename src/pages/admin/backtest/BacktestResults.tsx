import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminApi, type BacktestRunDetails } from '../../../lib/api'
import {
    ArrowLeft, Calendar, Brain, Activity,
    TrendingUp, TrendingDown, Target, AlertTriangle,
    Loader2, Download
} from 'lucide-react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'

export default function BacktestResults() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [details, setDetails] = useState<BacktestRunDetails | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return

        fetchDetails()

        // Auto refresh if running
        const interval = setInterval(() => {
            if (details?.status === 'running' || details?.status === 'pending') {
                fetchDetails()
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [id, details?.status])

    async function fetchDetails() {
        if (!id) return
        try {
            const data = await adminApi.getBacktestDetails(id)
            setDetails(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    if (!details) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-500 mb-2">Run Not Found</h2>
                <button onClick={() => navigate('/admin/backtest')} className="text-slate-400 hover:text-white underline">
                    Return to Dashboard
                </button>
            </div>
        )
    }

    const { results } = details
    const isCompleted = details.status === 'completed' && results

    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/backtest')}
                        className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-white font-mono">{details.run_id}</h1>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${details.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' :
                                    details.status === 'failed' ? 'bg-red-900/30 text-red-400 border border-red-900/50' :
                                        'bg-blue-900/30 text-blue-400 border border-blue-900/50 animate-pulse'
                                }`}>
                                {details.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {details.start_date} → {details.end_date}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5"><Brain className="w-4 h-4" /> {details.strategies.join(', ')}</span>
                        </div>
                    </div>
                </div>

                {isCompleted && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors text-sm font-medium">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                )}
            </div>

            {/* Error State */}
            {details.status === 'failed' && (
                <div className="bg-red-900/10 border border-red-900/50 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-2 text-red-400 font-bold">
                        <AlertTriangle className="w-5 h-5" />
                        Simulation Failed
                    </div>
                    <pre className="text-red-300/80 font-mono text-xs overflow-x-auto p-4 bg-black/50 rounded border border-red-900/30">
                        {details.error || "Unknown error occurred during execution."}
                    </pre>
                </div>
            )}

            {/* Results */}
            {isCompleted && results ? (
                <>
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                            <div className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Total P&L
                            </div>
                            <div className={`text-2xl font-bold ${results.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {results.total_pnl >= 0 ? '+' : ''}{results.total_pnl.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                            <div className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                                <Target className="w-4 h-4" /> Win Rate
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {results.win_rate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{results.total_trades} trades executed</div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                            <div className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                                <TrendingDown className="w-4 h-4" /> Max Drawdown
                            </div>
                            <div className="text-2xl font-bold text-red-400">
                                {results.max_drawdown_pct.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                            <div className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                                <Brain className="w-4 h-4" /> Episodes Learned
                            </div>
                            <div className="text-2xl font-bold text-purple-400">
                                {details.learning_enabled ? Math.floor(results.total_trades * 0.8) : 0} {/* Simulated count logic */}
                            </div>
                        </div>
                    </div>

                    {/* Equity Curve */}
                    <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-5">
                        <h3 className="font-semibold text-slate-200 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Equity Curve
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={results.equity_curve}>
                                    <defs>
                                        <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis
                                        dataKey="time"
                                        stroke="#64748b"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(val) => val.split('T')[0]}
                                    />
                                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="equity"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#eqGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </>
            ) : details.status === 'running' ? (
                <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-12 text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Simulation In Progress</h3>
                    <p className="text-slate-400">Processing historical data and executing agent strategies...</p>
                    <div className="w-full max-w-md mx-auto mt-6 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-blue-500 animate-progress w-full"></div>
                    </div>
                </div>
            ) : null}

        </div>
    )
}
