import { MenuItem, Category } from '@/types/pos';

export const categories: Category[] = ['All', 'Basic'];

export const menuItems: MenuItem[] = [
  // Appetizers -> Basic
  { id: '1', name: 'Americano [AM]', price: 79, category: 'Basic', emoji: '' },
  { id: '2', name: 'Cappucino [CP]', price: 89, category: 'Basic', emoji: '' },
  { id: '3', name: 'FLAT WHITE [FW]', price: 89, category: 'Basic', emoji: '' },
];
