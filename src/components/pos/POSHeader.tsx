import { Link, useLocation } from 'react-router-dom';
import { ChefHat, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function POSHeader() {
  const location = useLocation();
  const isCashier = location.pathname === '/' || location.pathname === '/cashier';
  const isKitchen = location.pathname === '/kitchen';

  return (
    <header className="bg-card border-b border-border px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-xl">🍴</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Restaurant POS</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <nav className="flex gap-2">
          <Button
            asChild
            variant={isCashier ? 'default' : 'ghost'}
            size="lg"
            className={cn(!isCashier && 'text-muted-foreground')}
          >
            <Link to="/cashier">
              <CreditCard className="w-5 h-5" />
              Cashier
            </Link>
          </Button>
          <Button
            asChild
            variant={isKitchen ? 'default' : 'ghost'}
            size="lg"
            className={cn(!isKitchen && 'text-muted-foreground')}
          >
            <Link to="/kitchen">
              <ChefHat className="w-5 h-5" />
              Kitchen
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
