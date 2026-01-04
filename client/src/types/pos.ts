export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji?: string;
  flavors?: string[];
  maxFlavors?: number;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  selectedFlavor?: string; // @deprecated
  selectedFlavors?: string[];
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  createdAt: Date;
  timestamp?: string | number | Date; // Legacy support
  tableNumber?: number;
  beeperNumber?: number;
  paymentMethod?: 'Cash' | 'GCash' | 'Bank Transfer' | 'Pay Later' | string;
  paymentStatus?: 'paid' | 'pending';
  amountTendered?: number;
  changeAmount?: number;
}

export type Category = 'All' | 'Basic' | string;

export interface HistoryItem {
  filename: string;
  date: string;
  openedAt?: string;
  closedAt: string;
  totalOrders: number;
  totalSales: number;
}

export interface AnalyticsData {
  topItems: { name: string; quantity: number; sales: number }[];
  dailyTotals: { date: string; sales: number; orders: number }[];
  hourlyStats: { hour: number; label: string; orders: number }[];
}

export interface DetailedHistory {
  date: string;
  closedAt: string;
  totalOrders: number;
  totalSales: number;
  orders: Order[];
}
