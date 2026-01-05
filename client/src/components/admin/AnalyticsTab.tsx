
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar, DollarSign, ShoppingBag, Clock, Award } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { AnalyticsData } from "@/types/pos";

interface AnalyticsTabProps {
    analytics: AnalyticsData;
    period: 'today' | 'week' | 'month';
    setPeriod: (val: 'today' | 'week' | 'month') => void;
}

export function AnalyticsTab({ analytics, period, setPeriod }: AnalyticsTabProps) {
    // Calculate Summary Stats
    const totalSales = analytics.dailyTotals.reduce((acc, curr) => acc + curr.sales, 0);
    const totalOrders = analytics.dailyTotals.reduce((acc, curr) => acc + curr.orders, 0);
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const topItem = analytics.topItems[0];

    // Format currency
    const formatCurrency = (val: number) => `₱${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getPeriodText = () => {
        if (period === 'today') return 'today';
        if (period === 'week') return 'the last 7 days';
        return 'the last 30 days';
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-4 rounded-xl border shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Business Analytics</h2>
                        <p className="text-sm text-muted-foreground hidden sm:block">
                            Performance metrics for {getPeriodText()}
                        </p>
                    </div>
                </div>
                <Select value={period} onValueChange={(val: 'today' | 'week' | 'month') => setPeriod(val)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Revenue"
                    value={formatCurrency(totalSales)}
                    icon={DollarSign}
                    trend="Start strong"
                    color="text-emerald-500"
                />
                <StatsCard
                    title="Total Orders"
                    value={totalOrders.toString()}
                    icon={ShoppingBag}
                    trend="Keep pushing"
                    color="text-blue-500"
                />
                <StatsCard
                    title="Avg Order Value"
                    value={formatCurrency(avgOrderValue)}
                    icon={TrendingUp}
                    trend="Per transaction"
                    color="text-violet-500"
                />
                <StatsCard
                    title="Best Seller"
                    value={topItem ? topItem.name : "N/A"}
                    subValue={topItem ? `${topItem.quantity} sold` : ""}
                    icon={Award}
                    trend="Top item"
                    color="text-amber-500"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Revenue Trend Area Chart */}
                <Card className="col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle>Revenue Trend</CardTitle>
                        <CardDescription>Daily sales performance over time</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] md:h-[350px]">
                        {analytics.dailyTotals.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.dailyTotals} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(str) => {
                                            const d = new Date(str);
                                            return `${d.getMonth() + 1}/${d.getDate()}`;
                                        }}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `₱${val}`}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value: number) => [formatCurrency(value), 'Sales']}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorSales)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No sales data found.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Peak Hours Bar Chart */}
                <Card className="col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            Peak Business Hours
                        </CardTitle>
                        <CardDescription>Busiest times of the day</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] md:h-[300px]">
                        {analytics.hourlyStats && analytics.hourlyStats.some(h => h.orders > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.hourlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        formatter={(value: number) => [value, 'Orders']}
                                        labelFormatter={(label) => `${label}:00`}
                                    />
                                    <Bar dataKey="orders" fill="hsl(var(--sky-500, #0ea5e9))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/20 rounded-lg">
                                Not enough data for peak hours
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Products List */}
                <Card className="col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-muted-foreground" />
                            Top Products
                        </CardTitle>
                        <CardDescription>Best performing menu items</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <div className="min-w-[400px]">
                                <div className="border-t">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead>Item</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                                <TableHead className="text-right">Sales</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {analytics.topItems.slice(0, 5).map((item, idx) => (
                                                <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                                                    <TableCell className="font-medium flex items-center gap-2">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-muted-foreground'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        {item.name}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{formatCurrency(item.sales)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {analytics.topItems.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center h-48 text-muted-foreground">
                                                        No product data yet.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Simple internal component for KPI Display
function StatsCard({ title, value, subValue, icon: Icon, trend, color }: { title: string, value: string, subValue?: string, icon: React.ElementType, trend: string, color: string }) {
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {subValue && <div className="text-sm font-semibold mt-1">{subValue}</div>}
                <p className="text-xs text-muted-foreground mt-1">
                    {trend}
                </p>
            </CardContent>
        </Card>
    );
}
