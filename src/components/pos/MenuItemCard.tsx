import { MenuItem } from '@/types/pos';
import { Button } from '@/components/ui/button';

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  return (
    <Button
      variant="menu"
      size="menu"
      onClick={() => onAdd(item)}
      className="items-start justify-start text-left"
    >
      <span className="text-2xl">{item.emoji}</span>
      <span className="font-medium text-sm leading-tight">{item.name}</span>
      <span className="text-primary font-semibold">₱{item.price.toFixed(2)}</span>
    </Button>
  );
}
