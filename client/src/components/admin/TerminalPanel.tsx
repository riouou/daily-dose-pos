
import { useState, useRef, useEffect } from 'react';
import { Terminal, Send, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { socket } from '@/lib/socket';
import { API_URL } from '@/lib/config';
import { OrderStore } from '@/store/orderStore';

interface LogMessage {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
}

export function TerminalPanel() {
    const [input, setInput] = useState('');
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isProcessing, setIsProcessing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    useEffect(() => {
        socket.on('console:log', (data: { message: string, type: 'info' | 'success' | 'warning' | 'error' }) => {
            addLog(data.message, data.type);
        });

        return () => {
            socket.off('console:log');
        };
    }, []);

    const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        setLogs(prev => [...prev, { message, type, timestamp: Date.now() }]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInput(history[history.length - 1 - newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(history[history.length - 1 - newIndex]);
            } else {
                setHistoryIndex(-1);
                setInput('');
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            executeCommand();
        }
    };

    const executeCommand = async () => {
        if (!input.trim() || isProcessing) return;

        const cmd = input.trim();
        setInput('');
        setHistory(prev => [...prev, cmd]);
        setHistoryIndex(-1);
        setIsProcessing(true);

        addLog(`> ${cmd}`, 'info');

        const [command, ...args] = cmd.split(' ');

        if (command === 'clear') {
            setLogs([]);
            setIsProcessing(false);
            return;
        }

        // Client-side Local Storage Flush
        if (command === 'flush-local') {
            addLog('Clearing local storage and reloading...', 'warning');
            localStorage.removeItem('order-storage'); // Zustand persist key
            // Also explicitly clear store state
            useOrderStore.setState({ orders: [], currentOrder: [], offlineQueue: [], pendingUpdates: {} });

            setTimeout(() => {
                window.location.reload();
            }, 1000);
            return;
        }

        // Client-side Stress Test
        if (command === 'stress') {
            const count = parseInt(args[0]) || 50;
            const delay = parseInt(args[1]) || 50;
            addLog(`Starting stress test: ${count} requests, ${delay}ms delay...`, 'warning');

            let success = 0;
            let fail = 0;
            const startTime = Date.now();

            for (let i = 0; i < count; i++) {
                // Mix fetching orders and menu to simulate real traffic
                const endpoint = i % 2 === 0 ? '/api/orders' : '/api/menu';
                const url = `${API_URL}${endpoint}`;

                fetch(url)
                    .then(res => {
                        if (res.ok) success++;
                        else fail++;
                    })
                    .catch(() => fail++);

                // Throttle slightly
                await new Promise(r => setTimeout(r, delay));
            }

            const taken = (Date.now() - startTime) / 1000;
            addLog(`Stress test complete in ${taken.toFixed(2)}s.`, 'success');
            addLog(`Success: ${success}, Failed: ${fail}`, fail > 0 ? 'error' : 'success');
            setIsProcessing(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, args })
            });
            const data = await res.json();

            if (Array.isArray(data)) {
                data.forEach(log => addLog(log.message, log.type));
            } else {
                addLog(JSON.stringify(data), 'info');
            }

        } catch (err) {
            addLog(`Failed to execute command: ${err}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden font-mono min-h-[600px]">
            {/* Terminal Body */}
            <div className="flex flex-col flex-1 h-full">
                {/* Output Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1 text-sm scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    <div className="text-zinc-500 italic mb-2">Welcome to Daily Dose Admin Console. Type 'help' for commands.</div>
                    {logs.map((log, i) => (
                        <div key={i} className={cn(
                            "break-all",
                            log.type === 'error' ? "text-red-400" :
                                log.type === 'warning' ? "text-yellow-400" :
                                    log.type === 'success' ? "text-green-400" :
                                        "text-zinc-300"
                        )}>
                            <span className="opacity-50 mr-2 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            {log.message}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-2 bg-zinc-900 border-t border-white/10 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-green-500" />
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-600 font-mono text-sm h-full"
                        placeholder="Type a command..."
                        autoFocus
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-zinc-400 hover:text-white"
                        onClick={executeCommand}
                        disabled={isProcessing}
                    >
                        <Send className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
