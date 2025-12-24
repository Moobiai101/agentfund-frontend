import { useEffect, useState } from 'react'
import { adminApi, type PositionData } from '../../lib/api'
import { AlertCircle, RefreshCw, XCircle } from 'lucide-react'

export function PositionsTable() {
    const [positions, setPositions] = useState<PositionData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [actionLoading, setActionLoading] = useState<string | null>(null) // Symbol being closed

    const fetchPositions = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await adminApi.getOpenPositions()
            // Convert positions dict to array
            setPositions(Object.values(data.positions))
        } catch (err) {
            setError('Failed to load positions')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPositions()
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchPositions, 10000)
        return () => clearInterval(interval)
    }, [])

    const handleClosePosition = async (symbol: string) => {
        if (!window.confirm(`Are you sure you want to FORCE CLOSE the position for ${symbol}?`)) {
            return
        }

        setActionLoading(symbol)
        try {
            await adminApi.closePosition(symbol)
            // Optimistically remove from list or just refetch? 
            // Refetching is safer as backend confirms close initiation
            await fetchPositions()
        } catch (err) {
            console.error('Failed to close position', err)
            alert('Failed to initiate close for ' + symbol)
        } finally {
            setActionLoading(null)
        }
    }

    if (loading && positions.length === 0) {
        return <div className="p-4 text-slate-400">Loading open positions...</div>
    }

    return (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-100">Live Positions Override</h2>
                <button
                    onClick={fetchPositions}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="Refresh Positions"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {positions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                    No open positions found.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                <th className="pb-3 px-2">Instrument</th>
                                <th className="pb-3 px-2">Side</th>
                                <th className="pb-3 px-2">Qty</th>
                                <th className="pb-3 px-2">Avg Price</th>
                                <th className="pb-3 px-2">Entry Time</th>
                                <th className="pb-3 px-2">P&L %</th>
                                <th className="pb-3 px-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {positions.map((pos) => (
                                <tr key={pos.instrument} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3 px-2 font-medium text-slate-200">{pos.instrument}</td>
                                    <td className={`py-3 px-2 font-medium ${pos.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                                        {pos.direction}
                                    </td>
                                    <td className="py-3 px-2 text-slate-300">{pos.quantity}</td>
                                    <td className="py-3 px-2 text-slate-300">₹{pos.avg_price.toFixed(2)}</td>
                                    <td className="py-3 px-2 text-slate-400 text-sm">
                                        {new Date(pos.entry_time).toLocaleTimeString()}
                                    </td>
                                    <td className={`py-3 px-2 font-bold ${pos.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {pos.pnl_pct >= 0 ? '+' : ''}{pos.pnl_pct.toFixed(2)}%
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <button
                                            onClick={() => handleClosePosition(pos.instrument)}
                                            disabled={actionLoading === pos.instrument}
                                            className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800/50 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 ml-auto disabled:opacity-50"
                                        >
                                            <XCircle size={14} />
                                            {actionLoading === pos.instrument ? 'Closing...' : 'Force Exit'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
