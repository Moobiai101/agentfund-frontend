import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, type BacktestRunSummary, type AvailableStrategy } from '../../../lib/api'
import {
    Play, RefreshCw, Calendar,
    Brain, FileText, CheckCircle2, XCircle,
    Clock, Loader2, ArrowRight
} from 'lucide-react'

export default function BacktestDashboard() {
    const navigate = useNavigate()
    const [runs, setRuns] = useState<BacktestRunSummary[]>([])
    const [strategies, setStrategies] = useState<AvailableStrategy[]>([])
    const [loading, setLoading] = useState(true)
    const [starting, setStarting] = useState(false)

    // Form State
    const [startDate, setStartDate] = useState(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    )
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split('T')[0]
    )
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>([])
    const [learningEnabled, setLearningEnabled] = useState(true)

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchRuns, 5000)
        return () => clearInterval(interval)
    }, [])

    async function fetchData() {
        try {
            const [runsData, strategiesData] = await Promise.all([
                adminApi.getBacktestRuns(20),
                adminApi.getAvailableStrategies()
            ])

            setRuns(runsData.runs || [])
            setStrategies(strategiesData.strategies || [])

            // auto-select first strategy if available
            if (strategiesData.strategies?.length > 0 && selectedStrategies.length === 0) {
                setSelectedStrategies([strategiesData.strategies[0].id])
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchRuns() {
        try {
            const runsData = await adminApi.getBacktestRuns(20)
            setRuns(runsData.runs || [])
        } catch (err) {
            console.error(err)
        }
    }

    async function handleStartBacktest(e: React.FormEvent) {
        e.preventDefault()
        setStarting(true)
        try {
            await adminApi.startBacktest({
                start_date: startDate,
                end_date: endDate,
                strategies: selectedStrategies,
                learning_enabled: learningEnabled
            })
            // Refresh runs
            await fetchRuns()
        } catch (err) {
            alert('Failed to start backtest: ' + err)
        } finally {
            setStarting(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-emerald-400 bg-emerald-900/20 border-emerald-900/50'
            case 'failed': return 'text-red-400 bg-red-900/20 border-red-900/50'
            case 'running': return 'text-blue-400 bg-blue-900/20 border-blue-900/50 animate-pulse'
            default: return 'text-slate-400 bg-slate-800 border-slate-700'
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto min-h-[calc(100vh-3.5rem)] flex flex-col gap-6">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Backtest Engine</h1>
                    <p className="text-slate-400 max-w-2xl">
                        Simulate strategy performance over historical market data with full agent-based behavior including learning and evolution.
                    </p>
                </div>
                <button onClick={() => fetchData()} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                {/* Configuration Panel */}
                <div className="xl:col-span-4 bg-slate-900/50 border border-slate-800 rounded-lg p-5 sticky top-20">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                        <Play className="w-5 h-5 text-emerald-500" />
                        <h2 className="font-semibold text-lg text-slate-200">New Simulation</h2>
                    </div>

                    <form onSubmit={handleStartBacktest} className="space-y-6">

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-400">Date Range</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-xs text-slate-500 mb-1">Start Date</span>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-black border border-slate-800 rounded py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-xs text-slate-500 mb-1">End Date</span>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-black border border-slate-800 rounded py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-400">Strategies</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-black border border-slate-800 rounded p-2">
                                {strategies.length > 0 ? strategies.map(s => (
                                    <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-slate-900 rounded cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={selectedStrategies.includes(s.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedStrategies([...selectedStrategies, s.id])
                                                else setSelectedStrategies(selectedStrategies.filter(id => id !== s.id))
                                            }}
                                            className="w-4 h-4 bg-transparent border-slate-600 rounded text-emerald-500 focus:ring-0 checked:bg-emerald-500"
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm font-mono text-slate-300 group-hover:text-emerald-400 transition-colors">{s.id}</div>
                                            <div className="text-[10px] text-slate-500">{s.source} • Ready</div>
                                        </div>
                                    </label>
                                )) : (
                                    <div className="text-center py-4 text-xs text-slate-600">No strategies found</div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-t border-slate-800">
                            <div className="flex items-center gap-2">
                                <Brain className={`w-4 h-4 ${learningEnabled ? 'text-purple-400' : 'text-slate-600'}`} />
                                <span className="text-sm text-slate-300">Enable Learning</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setLearningEnabled(!learningEnabled)}
                                className={`w-10 h-5 rounded-full relative transition-colors ${learningEnabled ? 'bg-purple-900/50' : 'bg-slate-800'}`}
                            >
                                <span className={`absolute top-1 w-3 h-3 rounded-full transition-all ${learningEnabled ? 'left-6 bg-purple-400' : 'left-1 bg-slate-500'}`} />
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={starting || selectedStrategies.length === 0}
                            className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold tracking-wide flex items-center justify-center gap-2 transition-all"
                        >
                            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                            START SIMULATION
                        </button>

                    </form>
                </div>

                {/* Runs List */}
                <div className="xl:col-span-8 space-y-4">
                    <h2 className="px-1 text-lg font-semibold text-slate-200">Recent Runs</h2>

                    {loading ? (
                        <div className="text-center py-12 text-slate-600">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                            Loading history...
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-12 text-center text-slate-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No backtest runs found. Start one to see results.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {runs.map(run => (
                                <div
                                    key={run.run_id}
                                    onClick={() => navigate(`/admin/backtest/${run.run_id}`)}
                                    className="bg-black border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2 rounded border mt-1 ${getStatusColor(run.status)}`}>
                                                {run.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                                    run.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                                                        run.status === 'failed' ? <XCircle className="w-5 h-5" /> :
                                                            <Clock className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-emerald-500 font-semibold">{run.run_id}</span>
                                                    {run.learning_enabled && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-900/50 flex items-center gap-1">
                                                            <Brain className="w-3 h-3" /> LEARNING
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-400 flex items-center gap-3">
                                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {run.start_date} → {run.end_date}</span>
                                                    <span className="text-slate-600">•</span>
                                                    <span>{run.strategies.length} strategies</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">RUN STATUS</div>
                                                <div className={`text-sm font-bold uppercase ${run.status === 'completed' ? 'text-emerald-400' :
                                                    run.status === 'failed' ? 'text-red-400' :
                                                        'text-blue-400'
                                                    }`}>{run.status}</div>
                                            </div>

                                            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-500 transform group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>

                                    {/* Error message for failed runs */}
                                    {run.status === 'failed' && run.error && (
                                        <div className="mt-3 p-3 bg-red-900/20 border border-red-900/50 rounded text-sm">
                                            <div className="flex items-start gap-2 text-red-400">
                                                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                                <span className="font-mono text-xs break-all">{run.error}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Progress bar for running */}
                                    {run.status === 'running' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
                                            <div className="h-full bg-blue-500 animate-pulse w-1/2"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
