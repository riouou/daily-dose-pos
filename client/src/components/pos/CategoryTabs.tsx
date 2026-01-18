import { cn } from '@/lib/utils';
import { Category } from '@/types/pos';
import { useMenuStore } from '@/store/menuStore';

interface CategoryTabsProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  const { categories } = useMenuStore();

  return (
    <div className="flex flex-wrap gap-2 pb-4 pt-2 px-1">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={cn(
            "relative px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 select-none",
            "border border-transparent",
            activeCategory === category
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border-border/50"
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
