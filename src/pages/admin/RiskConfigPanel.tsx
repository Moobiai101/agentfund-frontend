import { useState } from 'react'
import { adminApi, type RiskConfig } from '../../lib/api'
// Button import removed
// Assuming I don't have a component library ready yet or I should just use raw Tailwind. Use raw Tailwind for now.

export function RiskConfigPanel() {
    const [config, setConfig] = useState<RiskConfig>({
        max_position_size_pct: 40,
        max_sector_exposure_pct: 50,
        max_open_positions: 3,
        max_daily_loss_pct: 10,
        max_trade_loss_pct: 5,
        max_drawdown_pct: 20,
        drawdown_reduction_pct: 50,
        margin_buffer_pct: 20,
        no_trade_before: "09:20",
        no_trade_after: "15:15",
        // defaults
    })

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target
        setConfig(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            await adminApi.updateRiskConfig(config)
            setMessage('Configuration updated successfully')
        } catch (err) {
            setMessage('Failed to update configuration')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Dynamic Risk Configuration</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Max Position Size (%)</label>
                        <input
                            type="number"
                            name="max_position_size_pct"
                            value={config.max_position_size_pct}
                            onChange={handleChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Max Open Positions</label>
                        <input
                            type="number"
                            name="max_open_positions"
                            value={config.max_open_positions}
                            onChange={handleChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Max Daily Loss (%)</label>
                        <input
                            type="number"
                            name="max_daily_loss_pct"
                            value={config.max_daily_loss_pct}
                            onChange={handleChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Max Drawdown (%)</label>
                        <input
                            type="number"
                            name="max_drawdown_pct"
                            value={config.max_drawdown_pct}
                            onChange={handleChange}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Updating...' : 'Update Risk Limits'}
                    </button>
                    {message && <span className={`ml-4 text-sm ${message.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>{message}</span>}
                </div>
            </form>
        </div>
    )
}
