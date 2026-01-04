import { Link, useLocation } from 'react-router-dom';
import { ChefHat, CreditCard, Lock, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReadyOrdersSheet } from './ReadyOrdersSheet';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { useThemeStore } from '@/store/themeStore';

export function POSHeader() {
  const location = useLocation();
  const isCashier = location.pathname === '/' || location.pathname === '/cashier';
  const isKitchen = location.pathname === '/kitchen';
  const { theme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="bg-card border-b border-border px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center">
            <img src="/daily-dose-logo.jpg" alt="Daily Dose Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Daily Dose</h1>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground mr-1">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <ConnectionStatus />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCashier && <ReadyOrdersSheet />}

          <nav className="flex gap-2">
            <Button
              asChild
              variant={isCashier ? 'default' : 'ghost'}
              size="lg"
              className={cn(!isCashier && 'text-muted-foreground')}
            >
              <Link to="/cashier" className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <span className="hidden sm:inline">Cashier</span>
              </Link>
            </Button>
            <Button
              asChild
              variant={isKitchen ? 'default' : 'ghost'}
              size="lg"
              className={cn(!isKitchen && 'text-muted-foreground')}
            >
              <Link to="/kitchen" className="flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                <span className="hidden sm:inline">Kitchen</span>
              </Link>
            </Button>

            {/* Admin Button - Discreet */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="text-muted-foreground/50 hover:text-foreground"
            >
              <Link to="/admin">
                <Lock className="w-4 h-4" />
                <span className="sr-only">Admin</span>
              </Link>
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
