import { useState } from 'react';
import { POSHeader } from '@/components/pos/POSHeader';
import { MenuItemCard } from '@/components/pos/MenuItemCard';
import { OrderPanel } from '@/components/pos/OrderPanel';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { menuItems } from '@/data/menuData';
import { Category } from '@/types/pos';
import { useOrderStore } from '@/store/orderStore';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

export default function CashierPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const { addToOrder, currentOrder } = useOrderStore();

  const filteredItems =
    activeCategory === 'All'
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  const totalItems = currentOrder.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <POSHeader />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <div className="flex-1 overflow-auto mt-4 pb-20 lg:pb-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} onAdd={addToOrder} />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Order Panel */}
        <div className="hidden lg:block w-96 p-4 border-l border-border bg-secondary/30 h-full">
          <OrderPanel />
        </div>

        {/* Mobile Order Button & Sheet */}
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="lg" className="rounded-full h-14 w-14 shadow-lg relative">
                <ShoppingCart className="h-6 w-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-background">
                    {totalItems}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[90%] sm:w-[400px] p-0 flex flex-col h-[100dvh]">
              <SheetTitle className="sr-only">Current Order</SheetTitle>
              <div className="flex-1 w-full pt-10 pb-4 px-4">
                <OrderPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
