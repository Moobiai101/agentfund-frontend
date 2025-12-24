import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Terminal } from 'lucide-react'

// Types matching Backend MessageBus
interface AgentMessage {
    id: string
    timestamp: string
    source: string
    type: string
    channel: string
    payload: any
    priority: number
}

const LogLevelColor = {
    INFO: 'text-slate-400',
    WARN: 'text-amber-400',
    ERROR: 'text-red-400',
    TRADE: 'text-emerald-400',
    RISK: 'text-orange-400',
    SYSTEM: 'text-blue-400',
}



export function LiveAgentFeed() {
    const { session } = useAuth()
    const [messages, setMessages] = useState<AgentMessage[]>([])
    const [connected, setConnected] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const [autoScroll, setAutoScroll] = useState(true)

    // WebSocket Connection Logic
    useEffect(() => {
        if (!session?.access_token) return

        const connect = () => {
            // Determine WS URL (auto-switch dev/prod)
            const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            // NOTE: Cloudflare functions proxy /api/* but WS usually needs direct backend connection or specific routing
            // For now, assuming direct backend connection for WS if local, or same origin if behind proxy
            // If using standard Cloudflare Workers, WS is supported.
            // Adjust this URL to match your Railway/Backend URL directly if needed
            // For local dev with Cloudflare pages running on 8788 and backend on 8000:
            const wsUrl = isDev
                ? `ws://127.0.0.1:8000/ws/admin/events?token=${session.access_token}`
                : `wss://agentfund-production.up.railway.app/ws/admin/events?token=${session.access_token}`

            console.log('Connecting to WS:', wsUrl)
            const ws = new WebSocket(wsUrl)

            ws.onopen = () => {
                setConnected(true)
                addSystemMessage('Connected to Agent Stream')
            }

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data)
                    setMessages(prev => [...prev.slice(-99), msg]) // Keep last 100
                } catch (e) {
                    console.error('Failed to parse msg', e)
                }
            }

            ws.onclose = () => {
                setConnected(false)
                addSystemMessage('Disconnected. Reconnecting...')
                setTimeout(connect, 3000)
            }

            wsRef.current = ws
        }

        connect()

        return () => {
            wsRef.current?.close()
        }
    }, [session])

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, autoScroll])

    const addSystemMessage = (text: string) => {
        const msg: AgentMessage = {
            id: Math.random().toString(),
            timestamp: new Date().toISOString(),
            source: 'System',
            type: 'system.local',
            channel: 'system',
            payload: { message: text },
            priority: 1
        }
        setMessages(prev => [...prev, msg])
    }

    const getMessageColor = (msg: AgentMessage) => {
        if (msg.priority >= 3) return LogLevelColor.ERROR
        if (msg.channel.includes('risk')) return LogLevelColor.RISK
        if (msg.channel.includes('trade') || msg.channel.includes('order')) return LogLevelColor.TRADE
        if (msg.priority === 2) return LogLevelColor.WARN
        if (msg.source === 'System') return LogLevelColor.SYSTEM
        return LogLevelColor.INFO
    }

    return (
        <div className="flex flex-col h-full bg-black/40 border border-slate-800 rounded-lg overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-mono font-medium text-slate-300">LIVE AGENT FEED</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-[10px] text-slate-500 uppercase">{connected ? 'Live' : 'Offline'}</span>
                    </div>
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`text-[10px] px-2 py-0.5 rounded border ${autoScroll ? 'border-emerald-500/30 text-emerald-500' : 'border-slate-700 text-slate-500'}`}
                    >
                        {autoScroll ? 'SCROLL ON' : 'PAUSED'}
                    </button>
                </div>
            </div>

            {/* Terminal Window */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-slate-600 italic">Waiting for agent activity...</div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3 hover:bg-slate-800/20 p-1 rounded transition-colors group">
                        <span className="text-slate-600 shrink-0 select-none">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>

                        <div className="flex-1 break-all">
                            <span className={`font-bold mr-2 ${getMessageColor(msg)}`}>
                                [{msg.source.toUpperCase()}]
                            </span>
                            {/* Intelligent Payload Rendering */}
                            <span className="text-slate-300">
                                {msg.payload?.message || msg.payload?.description || msg.payload?.reason || JSON.stringify(msg.payload)}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    )
}
