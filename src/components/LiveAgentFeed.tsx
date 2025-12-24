import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../lib/api'
import { Terminal } from 'lucide-react'

interface AgentEvent {
    id: string
    timestamp: string
    timestamp_unix: number
    source: string
    type: string
    summary: string
    details: Record<string, unknown>
}

const SourceColors: Record<string, string> = {
    RiskAgent: 'text-orange-400',
    Orchestrator: 'text-purple-400',
    MetaLearner: 'text-blue-400',
    Scanner: 'text-cyan-400',
    Pattern: 'text-yellow-400',
    Execution: 'text-emerald-400',
    Memory: 'text-pink-400',
    Reflection: 'text-indigo-400',
    System: 'text-slate-400',
}

export function LiveAgentFeed() {
    const [events, setEvents] = useState<AgentEvent[]>([])
    const [connected, setConnected] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const [autoScroll, setAutoScroll] = useState(true)

    // Polling logic - fetches events every 2 seconds via Cloudflare proxy (secure)
    useEffect(() => {
        let mounted = true
        let sinceTimestamp = 0

        const fetchEvents = async () => {
            try {
                const response = await adminApi.getAgentEvents(sinceTimestamp, 50)
                if (!mounted) return

                setConnected(true)

                if (response.events && response.events.length > 0) {
                    setEvents(prev => {
                        // Merge new events, dedupe by id, keep last 100
                        const merged = [...response.events, ...prev]
                        const seen = new Set<string>()
                        const deduped = merged.filter(e => {
                            if (seen.has(e.id)) return false
                            seen.add(e.id)
                            return true
                        })
                        return deduped.slice(0, 100)
                    })

                    // Update since timestamp for next poll
                    sinceTimestamp = response.server_time || Date.now() / 1000
                }
            } catch (error) {
                console.error('Failed to fetch events:', error)
                setConnected(false)
            }
        }

        // Initial fetch
        fetchEvents()

        // Poll every 2 seconds
        const interval = setInterval(fetchEvents, 2000)

        return () => {
            mounted = false
            clearInterval(interval)
        }
    }, [])

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [events, autoScroll])

    const getSourceColor = (source: string) => {
        for (const [key, color] of Object.entries(SourceColors)) {
            if (source.toLowerCase().includes(key.toLowerCase())) {
                return color
            }
        }
        return 'text-slate-400'
    }

    return (
        <div className="flex flex-col h-full bg-black/40 border border-slate-800 rounded-lg overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-mono font-medium text-slate-300">AGENT INSIGHTS</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-[10px] text-slate-500 uppercase">{connected ? 'Connected' : 'Offline'}</span>
                    </div>
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`text-[10px] px-2 py-0.5 rounded border ${autoScroll ? 'border-emerald-500/30 text-emerald-500' : 'border-slate-700 text-slate-500'}`}
                    >
                        {autoScroll ? 'AUTO' : 'PAUSED'}
                    </button>
                </div>
            </div>

            {/* Event Feed */}
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 custom-scrollbar">
                {events.length === 0 && (
                    <div className="text-slate-600 italic text-center py-8">Waiting for agent activity...</div>
                )}

                {events.map((event) => (
                    <div key={event.id} className="flex gap-2 hover:bg-slate-800/30 p-1.5 rounded transition-colors group">
                        <span className="text-slate-600 shrink-0 select-none w-16">
                            {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>

                        <span className={`font-bold shrink-0 w-24 truncate ${getSourceColor(event.source)}`}>
                            {event.source}
                        </span>

                        <span className="text-slate-300 flex-1">
                            {event.summary}
                        </span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    )
}
