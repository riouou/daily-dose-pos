
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, ArrowUp, ArrowDown } from "lucide-react";
import { useMenuStore } from '@/store/menuStore';
import { MenuItem } from '@/types/pos';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

export function MenuManagement() {
    const { items: menuItems, categories, addMenuItem, updateMenuItem, deleteMenuItem, addCategory, deleteCategory, reorderCategories } = useMenuStore();
    const [newCategory, setNewCategory] = useState('');
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<MenuItem>>({ name: '', price: 0, category: 'Basic', emoji: '', flavors: [] });
    const [priceInput, setPriceInput] = useState('');
    const [flavorInput, setFlavorInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isMultiFlavor, setIsMultiFlavor] = useState(false);

    // Alert Dialog States
    const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;
        addCategory(newCategory.trim());
        setNewCategory('');
    };

    const handleAddFlavor = () => {
        if (!flavorInput.trim()) return;
        const currentFlavors = currentItem.flavors || [];
        if (!currentFlavors.includes(flavorInput.trim())) {
            setCurrentItem({ ...currentItem, flavors: [...currentFlavors, flavorInput.trim()] });
        }
        setFlavorInput('');
    };

    const handleRemoveFlavor = (flavor: string) => {
        const currentFlavors = currentItem.flavors || [];
        setCurrentItem({ ...currentItem, flavors: currentFlavors.filter(f => f !== flavor) });
    };

    const moveCategory = (index: number, direction: 'up' | 'down') => {
        const newCategories = [...categories];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < newCategories.length) {
            // Swap
            [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
            // Update store/server
            reorderCategories(newCategories);
        }
    };

    const handleSaveItem = async () => {
        const price = parseFloat(priceInput);
        if (!currentItem.name || isNaN(price) || !currentItem.category) {
            toast.error('Please fill in all required fields');
            return;
        }

        const itemToSave = { ...currentItem, price };

        if (isEditing && currentItem.id) {
            await updateMenuItem(currentItem.id, itemToSave);
        } else {
            await addMenuItem(itemToSave as Omit<MenuItem, 'id'>);
        }
        setIsItemDialogOpen(false);
        resetItemForm();
    };

    const openAddDialog = () => {
        resetItemForm();
        setPriceInput('');
        setIsEditing(false);
        setIsMultiFlavor(false);
        setIsItemDialogOpen(true);
    };

    const openEditDialog = (item: MenuItem) => {
        setCurrentItem({ ...item });
        setPriceInput(item.price.toString());
        setIsEditing(true);
        setIsMultiFlavor((item.maxFlavors || 1) > 1);
        setIsItemDialogOpen(true);
    };

    const resetItemForm = () => {
        // Safe default: use first category or 'Basic' fallback
        const defaultCategory = categories.length > 0 ? categories[0] : 'Basic';
        setCurrentItem({ name: '', price: 0, category: defaultCategory, emoji: '', flavors: [] });
        setPriceInput('');
        setFlavorInput('');
    };

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* Categories Column */}
            <Card className="md:col-span-1">
                <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Manage menu categories</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="New Category"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <Button size="icon" onClick={handleAddCategory} aria-label="Add Category">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {categories.map((cat, index) => (
                            <div key={cat} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md group">
                                <span className="font-medium text-sm">{cat}</span>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={index === 0}
                                        onClick={() => moveCategory(index, 'up')}
                                        title="Move Up"
                                    >
                                        <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={index === categories.length - 1}
                                        onClick={() => moveCategory(index, 'down')}
                                        title="Move Down"
                                    >
                                        <ArrowDown className="h-3 w-3" />
                                    </Button>
                                    {cat !== 'All' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:bg-destructive/10 ml-1"
                                            onClick={() => setCategoryToDelete(cat)}
                                            aria-label={`Delete ${cat} category`}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Items Column */}
            <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Menu Items</CardTitle>
                        <CardDescription>Add, edit, or remove items</CardDescription>
                    </div>
                    <Button onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {menuItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <span className="mr-2">{item.emoji}</span>
                                            {item.name}
                                        </TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} aria-label={`Edit ${item.name}`}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({ id: item.id, name: item.name })} aria-label={`Delete ${item.name}`}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {menuItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            No items found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Item Dialog */}
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? 'Update the details of the menu item.' : 'Create a new menu item for the POS.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={currentItem.name}
                                onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                                className="col-span-3"
                                placeholder="e.g. Iced Latte"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">
                                Price (₱)
                            </Label>
                            <Input
                                id="price"
                                type="number"
                                value={priceInput}
                                onChange={(e) => setPriceInput(e.target.value)}
                                className="col-span-3"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">
                                Category
                            </Label>
                            <Select
                                value={currentItem.category}
                                onValueChange={(val) => setCurrentItem({ ...currentItem, category: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="emoji" className="text-right">
                                Emoji
                            </Label>
                            <Input
                                id="emoji"
                                value={currentItem.emoji || ''}
                                onChange={(e) => setCurrentItem({ ...currentItem, emoji: e.target.value })}
                                className="col-span-3"
                                placeholder="e.g. ☕"
                            />
                        </div>
                    </div>

                    {/* Max Flavors Configuration */}
                    <div className="space-y-4 py-4 border-t border-border/40">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="multiFlavors" className="flex flex-col gap-1 cursor-pointer">
                                <span className="text-sm font-medium">Allow Multiple Flavors</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                    Customers can select more than one flavor
                                </span>
                            </Label>
                            <Switch
                                id="multiFlavors"
                                checked={isMultiFlavor}
                                onCheckedChange={(checked) => {
                                    setIsMultiFlavor(checked);
                                    if (checked && (currentItem.maxFlavors || 1) < 2) {
                                        setCurrentItem({ ...currentItem, maxFlavors: 2 });
                                    } else if (!checked) {
                                        setCurrentItem({ ...currentItem, maxFlavors: 1 });
                                    }
                                }}
                            />
                        </div>

                        {isMultiFlavor && (
                            <div className="flex items-center justify-between gap-4 pl-1 animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="maxFlavorCount" className="text-sm font-medium">
                                        Max Selection Limit
                                    </Label>
                                    <span className="text-xs text-muted-foreground">
                                        How many flavors can they pick?
                                    </span>
                                </div>
                                <Input
                                    id="maxFlavorCount"
                                    type="number"
                                    min="2"
                                    max="10"
                                    value={currentItem.maxFlavors || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            // @ts-ignore
                                            setCurrentItem({ ...currentItem, maxFlavors: '' });
                                            return;
                                        }
                                        const num = parseInt(val);
                                        if (!isNaN(num)) {
                                            setCurrentItem({ ...currentItem, maxFlavors: num });
                                        }
                                    }}
                                    onBlur={() => {
                                        const val = currentItem.maxFlavors;
                                        if (!val || typeof val !== 'number' || val < 2) {
                                            setCurrentItem({ ...currentItem, maxFlavors: 2 });
                                        }
                                    }}
                                    className="w-24 text-right"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-left">Flavors (Optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={flavorInput}
                                onChange={(e) => setFlavorInput(e.target.value)}
                                placeholder="Add flavor (e.g. Vanilla)"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddFlavor();
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleAddFlavor} size="icon">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {currentItem.flavors?.map((flavor) => (
                                <div key={flavor} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                                    <span>{flavor}</span>
                                    <button
                                        onClick={() => handleRemoveFlavor(flavor)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveItem}>Save Changes</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Category Alert */}
            <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-medium text-foreground">{categoryToDelete}</span>?
                            This might affect items assigned to this category.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (categoryToDelete) deleteCategory(categoryToDelete);
                                setCategoryToDelete(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Item Alert */}
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-medium text-foreground">{itemToDelete?.name}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (itemToDelete) deleteMenuItem(itemToDelete.id);
                                setItemToDelete(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
