export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji?: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'new' | 'preparing' | 'ready';
  createdAt: Date;
  tableNumber?: number;
}

export type Category = 'All' | 'Basic';
