import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useOrderStore } from '@/store/orderStore';
import { useMenuStore } from '@/store/menuStore';
import { toast } from 'sonner';
import { Store, BarChart3, Terminal, LayoutDashboard } from 'lucide-react';
import { CurrentSessionCard } from '@/components/admin/CurrentSessionCard';
import { SystemInfoCard } from '@/components/admin/SystemInfoCard';
import { HistoryTable } from '@/components/admin/HistoryTable';
// Static import for critical "Overview" components is fine
import { HistoryDialog } from '@/components/admin/HistoryDialog';
import { AnalyticsData, HistoryItem, DetailedHistory } from '@/types/pos';
import { socket } from '@/lib/socket';
import { API_URL } from '@/lib/config';

// Lazy Load Heavy Tabs
const AnalyticsTab = lazy(() => import('@/components/admin/AnalyticsTab').then(module => ({ default: module.AnalyticsTab })));
const MenuManagement = lazy(() => import('@/components/admin/MenuManagement').then(module => ({ default: module.MenuManagement })));
const TerminalPanel = lazy(() => import('@/components/admin/TerminalPanel').then(module => ({ default: module.TerminalPanel })));

const TabLoader = () => (
    <div className="flex items-center justify-center h-64 w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
);

export default function AdminDashboard() {
    // Stores
    const { fetchOrders } = useOrderStore();
    const { fetchMenu } = useMenuStore();

    // Local State
    const [stats, setStats] = useState({ orders: 0, sales: 0 });
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [selectedHistory, setSelectedHistory] = useState<DetailedHistory | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({ topItems: [], dailyTotals: [], hourlyStats: [] });
    // const [analytics, setAnalytics] = useState<AnalyticsData | null>(null); // Unused
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
    const [isLoadingClose, setIsLoadingClose] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<'OPEN' | 'CLOSED'>('CLOSED');

    // Fetch Data Functions
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/status`);
            if (res.ok) {
                const data = await res.json();
                setSessionStatus(data.status);
            }
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    }, []);

    const fetchHistory = useCallback(async (page = 1) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/history?page=${page}&limit=10`);
            if (!res.ok) throw new Error('Failed to fetch history');
            const data = await res.json();

            if (data.items && data.meta) {
                setHistory(data.items);
                setHistoryPage(data.meta.page);
                setHistoryTotalPages(data.meta.totalPages);
            } else {
                // Fallback for legacy array response (if waiting for deploy)
                // setHistory(data);
                if (Array.isArray(data)) setHistory(data);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            toast.error('Could not load history');
        }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/analytics?period=${period}`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            const data = await res.json();
            setAnalyticsData(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Could not load analytics');
        }
    }, [period]);

    // Initial Load & Socket Listeners
    useEffect(() => {
        fetchStatus();
        fetchHistory(1);
        // Defer analytics fetch until tab needed? Or just prefetch? Prefetch is fine.
        fetchAnalytics();
        fetchMenu();
        fetchOrders(); // Initial fetch

        socket.on('order:update', () => {
            fetchOrders();
            fetchAnalytics();
        });

        socket.on('order:new', () => {
            fetchOrders();
            fetchAnalytics();
        });

        return () => {
            socket.off('order:update');
            socket.off('order:new');
        };
    }, [fetchStatus, fetchHistory, fetchAnalytics, fetchMenu, fetchOrders]);

    // Live Stats Calculation (derived from orderStore)
    // We use the store's active orders to calculate current session stats
    const activeOrders = useOrderStore(state => state.orders);

    useEffect(() => {
        // Calculate stats from active orders for the "Current Session"
        const sessionStats = activeOrders.reduce((acc, order) => {
            if (order.status !== 'cancelled') {
                acc.orders += 1;
                acc.sales += order.total;
            }
            return acc;
        }, { orders: 0, sales: 0 });
        setStats(sessionStats);
    }, [activeOrders]);


    // Handlers
    const handleOpenDay = async () => {
        setIsLoadingClose(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/open-day`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to open session');

            toast.success('Session Opened');
            fetchStatus();
        } catch (error) {
            console.error('Error opening day:', error);
            toast.error('Failed to open session');
        } finally {
            setIsLoadingClose(false);
        }
    };

    const handleCloseDay = async () => {
        setIsLoadingClose(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/close-day`, {
                method: 'POST'
            });

            if (!res.ok) throw new Error('Failed to close day');

            const result = await res.json();
            toast.success(`Session closed! Archived ${result.summary.date}`);

            // Refresh data
            fetchStatus();
            fetchHistory(1);
            fetchAnalytics();
            useOrderStore.getState().fetchOrders(); // Clear active orders locally
            setStats({ orders: 0, sales: 0 });

        } catch (error) {
            console.error('Error closing day:', error);
            toast.error('Failed to close session');
        } finally {
            setIsLoadingClose(false);
        }
    };

    const handleViewHistory = async (filename: string) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/history/${filename}`);
            if (!res.ok) throw new Error('Failed to fetch history details');

            const data = await res.json();
            setSelectedHistory(data);
            setIsHistoryOpen(true);
        } catch (error) {
            console.error('Error fetching history detail:', error);
            toast.error('Could not load history details');
        }
    };

    const lastClosed = history.length > 0 ? history[0].closedAt : undefined;

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
                    <LayoutDashboard className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    Admin Dashboard
                </h1>
                <Link to="/">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Store className="w-4 h-4" />
                        Back to POS
                    </Button>
                </Link>
            </div>

            <Tabs defaultValue="overview" className="space-y-8">
                <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="menu">Menu</TabsTrigger>
                    <TabsTrigger value="developer" className="gap-2">
                        <Terminal className="w-4 h-4" />
                        Developer
                    </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Current Session Stats */}
                        <div className="md:col-span-2">
                            <CurrentSessionCard
                                stats={stats}
                                isLoading={isLoadingClose}
                                status={sessionStatus}
                                onCloseDay={handleCloseDay}
                                onOpenDay={handleOpenDay}
                                onViewReceipts={() => {
                                    const sessionData: DetailedHistory = {
                                        date: new Date().toISOString(),
                                        openedAt: new Date().toISOString(),
                                        closedAt: new Date().toISOString(), // Acting as "now"
                                        totalOrders: stats.orders,
                                        totalSales: stats.sales,
                                        orders: activeOrders,
                                        // Live session doesn't expire yet
                                        expiresAt: new Date(Date.now() + 86400000).toISOString(),
                                        isExpired: false
                                    };
                                    setSelectedHistory(sessionData);
                                    setIsHistoryOpen(true);
                                }}
                            />
                        </div>

                        {/* System Status */}
                        <SystemInfoCard lastClosed={lastClosed} status={sessionStatus} />
                    </div>

                    {/* History Table */}
                    <HistoryTable
                        history={history}
                        onViewHistory={handleViewHistory}
                        page={historyPage}
                        totalPages={historyTotalPages}
                        onPageChange={fetchHistory}
                    />
                </TabsContent>

                {/* ANALYTICS TAB */}
                <TabsContent value="analytics">
                    <Suspense fallback={<TabLoader />}>
                        <AnalyticsTab
                            analytics={analyticsData}
                            period={period}
                            setPeriod={setPeriod}
                        />
                    </Suspense>
                </TabsContent>

                {/* MENU TAB */}
                <TabsContent value="menu">
                    <Suspense fallback={<TabLoader />}>
                        <MenuManagement />
                    </Suspense>
                </TabsContent>

                {/* DEVELOPER TAB */}
                <TabsContent value="developer">
                    <Suspense fallback={<TabLoader />}>
                        <TerminalPanel />
                    </Suspense>
                </TabsContent>
            </Tabs>

            {/* History Details Dialog */}
            <HistoryDialog
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                data={selectedHistory}
            />
        </div>
    );
}
