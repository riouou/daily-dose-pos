import { useState } from 'react';
import { POSHeader } from '@/components/pos/POSHeader';
import { MenuItemCard } from '@/components/pos/MenuItemCard';
import { OrderPanel } from '@/components/pos/OrderPanel';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { menuItems } from '@/data/menuData';
import { Category } from '@/types/pos';
import { useOrderStore } from '@/store/orderStore';

export default function CashierPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const { addToOrder } = useOrderStore();

  const filteredItems =
    activeCategory === 'All'
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <POSHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <div className="flex-1 overflow-auto mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} onAdd={addToOrder} />
              ))}
            </div>
          </div>
        </div>

        {/* Order Panel */}
        <div className="w-80 lg:w-96 p-4 border-l border-border bg-secondary/30">
          <OrderPanel />
        </div>
      </div>
    </div>
  );
}
