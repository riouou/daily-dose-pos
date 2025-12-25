import { Button } from '@/components/ui/button';
import { Category } from '@/types/pos';

import { categories } from '@/data/menuData';

interface CategoryTabsProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <Button
          key={category}
          variant={activeCategory === category ? 'categoryActive' : 'category'}
          size="touch"
          onClick={() => onCategoryChange(category)}
          className="shrink-0"
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
