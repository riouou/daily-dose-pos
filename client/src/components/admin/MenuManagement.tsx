
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, ArrowUp, ArrowDown, Minus, Copy } from "lucide-react";
import { useMenuStore } from '@/store/menuStore';
import { MenuItem, FlavorSection } from '@/types/pos';
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
    const [currentItem, setCurrentItem] = useState<Partial<MenuItem>>({ name: '', price: 0, category: 'Basic', emoji: '', flavors: [], type: 'food' });
    const [priceInput, setPriceInput] = useState('');
    const [flavorInput, setFlavorInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isMultiFlavor, setIsMultiFlavor] = useState(false);
    const [isCategorizedFlavors, setIsCategorizedFlavors] = useState(false);

    // Categorized Flavor State
    const [newSectionName, setNewSectionName] = useState('');
    const [sectionOptionInputs, setSectionOptionInputs] = useState<Record<string, string>>({});

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
        const currentFlavors = Array.isArray(currentItem.flavors) && typeof currentItem.flavors[0] === 'string'
            ? currentItem.flavors as string[]
            : [];

        if (!currentFlavors.includes(flavorInput.trim())) {
            setCurrentItem({ ...currentItem, flavors: [...currentFlavors, flavorInput.trim()] });
        }
        setFlavorInput('');
    };

    const handleRemoveFlavor = (flavor: string) => {
        const currentFlavors = currentItem.flavors as string[] || [];
        setCurrentItem({ ...currentItem, flavors: currentFlavors.filter(f => f !== flavor) });
    };

    // Flavor Section Handlers
    const handleAddSection = () => {
        if (!newSectionName.trim()) return;
        const sections = (currentItem.flavors as FlavorSection[]) || [];
        setCurrentItem({
            ...currentItem,
            flavors: [...sections, { name: newSectionName.trim(), options: [], max: 1 }]
        });
        setNewSectionName('');
    };

    const handleRemoveSection = (index: number) => {
        const sections = (currentItem.flavors as FlavorSection[]) || [];
        const newSections = [...sections];
        newSections.splice(index, 1);
        setCurrentItem({ ...currentItem, flavors: newSections });
    };

    const handleAddSectionOption = (sectionIndex: number) => {
        const sections = (currentItem.flavors as FlavorSection[]) || [];
        const section = sections[sectionIndex];
        const input = sectionOptionInputs[sectionIndex] || '';

        if (!input.trim()) return;

        const newSections = [...sections];
        if (!newSections[sectionIndex].options.includes(input.trim())) {
            newSections[sectionIndex].options.push(input.trim());
        }

        setCurrentItem({ ...currentItem, flavors: newSections });
        setSectionOptionInputs({ ...sectionOptionInputs, [sectionIndex]: '' });
    };

    const handleRemoveSectionOption = (sectionIndex: number, option: string) => {
        const sections = (currentItem.flavors as FlavorSection[]) || [];
        const newSections = [...sections];
        newSections[sectionIndex].options = newSections[sectionIndex].options.filter(o => o !== option);
        setCurrentItem({ ...currentItem, flavors: newSections });
    };

    const handleSectionMaxChange = (sectionIndex: number, max: number) => {
        const sections = (currentItem.flavors as FlavorSection[]) || [];
        const newSections = [...sections];
        newSections[sectionIndex].max = max;
        setCurrentItem({ ...currentItem, flavors: newSections });
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
        setIsCategorizedFlavors(false);
        setIsItemDialogOpen(true);
    };

    const openEditDialog = (item: MenuItem) => {
        setCurrentItem({ ...item });
        setPriceInput(item.price.toString());
        setIsEditing(true);
        setIsMultiFlavor((item.maxFlavors || 1) > 1);

        // Detect if using sections
        const hasSections = Array.isArray(item.flavors) && item.flavors.length > 0 && typeof item.flavors[0] !== 'string';
        setIsCategorizedFlavors(hasSections);

        setIsItemDialogOpen(true);
    };

    const handleDuplicateItem = (item: MenuItem) => {
        // Create a copy but reset ID and append (Copy) to name
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...itemWithoutId } = item;

        setCurrentItem({
            ...itemWithoutId,
            name: `${item.name} (Copy)`
        });
        setPriceInput(item.price.toString());

        // We are NOT editing an existing item, we are creating a new one based on an old one
        setIsEditing(false);
        setIsMultiFlavor((item.maxFlavors || 1) > 1);

        // Detect if using sections
        const hasSections = Array.isArray(item.flavors) && item.flavors.length > 0 && typeof item.flavors[0] !== 'string';
        setIsCategorizedFlavors(hasSections);

        setIsItemDialogOpen(true);
    };

    const resetItemForm = () => {
        // Safe default: use first category or 'Basic' fallback
        const defaultCategory = categories.length > 0 ? categories[0] : 'Basic';
        setCurrentItem({ name: '', price: 0, category: defaultCategory, emoji: '', flavors: [], type: 'food' });
        setPriceInput('');
        setFlavorInput('');
        setNewSectionName('');
        setSectionOptionInputs({});
        setIsCategorizedFlavors(false);
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
                                                <Button variant="ghost" size="icon" onClick={() => handleDuplicateItem(item)} aria-label={`Duplicate ${item.name}`}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
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
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">
                                Type
                            </Label>
                            <Select
                                value={currentItem.type || 'food'}
                                onValueChange={(val) => setCurrentItem({ ...currentItem, type: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="food">Food</SelectItem>
                                    <SelectItem value="drink">Drink</SelectItem>
                                </SelectContent>
                            </Select>
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
                                            // @ts-expect-error: Input value is string, temporarily assignment before validation handles it
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

                    {/* Flavors Section */}
                    <div className="space-y-4 py-4 border-t border-border/40">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="categorizedFlavors" className="flex flex-col gap-1 cursor-pointer">
                                <span className="text-sm font-medium">Categorized Flavors (Combos)</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                    Organize flavors into groups (e.g. Chicken, Fries)
                                </span>
                            </Label>
                            <Switch
                                id="categorizedFlavors"
                                checked={isCategorizedFlavors}
                                onCheckedChange={(checked) => {
                                    // Reset flavors when switching modes to avoid type conflicts
                                    if (currentItem.flavors && currentItem.flavors.length > 0) {
                                        if (!confirm('Switching modes will clear current flavors. Continue?')) return;
                                    }
                                    setIsCategorizedFlavors(checked);
                                    setCurrentItem({ ...currentItem, flavors: [] });
                                }}
                            />
                        </div>

                        {isCategorizedFlavors ? (
                            <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                {/* Add New Section */}
                                <div className="flex gap-2">
                                    <Input
                                        value={newSectionName}
                                        onChange={(e) => setNewSectionName(e.target.value)}
                                        placeholder="New Category Name (e.g. Chicken Flavor)"
                                    />
                                    <Button type="button" onClick={handleAddSection} variant="secondary">
                                        Add Category
                                    </Button>
                                </div>

                                {/* List Categories */}
                                <div className="space-y-4">
                                    {(currentItem.flavors as FlavorSection[])?.map((section, idx) => (
                                        <div key={idx} className="border rounded-md p-3 space-y-3 bg-secondary/10">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{section.name}</span>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground bg-background px-1 py-0.5 rounded border">
                                                        <span className="mr-1">Max:</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5"
                                                            disabled={(section.max || 1) <= 1}
                                                            onClick={() => handleSectionMaxChange(idx, Math.max(1, (section.max || 1) - 1))}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <span className="w-4 text-center font-medium text-foreground">{section.max || 1}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5"
                                                            onClick={() => handleSectionMaxChange(idx, (section.max || 1) + 1)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveSection(idx)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Add Options to Category */}
                                            <div className="flex gap-2">
                                                <Input
                                                    className="h-8 text-sm"
                                                    value={sectionOptionInputs[idx] || ''}
                                                    onChange={(e) => setSectionOptionInputs({ ...sectionOptionInputs, [idx]: e.target.value })}
                                                    placeholder={`Add ${section.name} option...`}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddSectionOption(idx);
                                                        }
                                                    }}
                                                />
                                                <Button type="button" size="sm" onClick={() => handleAddSectionOption(idx)} variant="outline">
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {/* Options List */}
                                            <div className="flex flex-wrap gap-2">
                                                {section.options.map((opt) => (
                                                    <div key={opt} className="flex items-center gap-1 bg-background border px-2 py-1 rounded-md text-xs">
                                                        <span>{opt}</span>
                                                        <button
                                                            onClick={() => handleRemoveSectionOption(idx, opt)}
                                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                <Label className="text-left">Simple Flavors</Label>
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
                                    {(Array.isArray(currentItem.flavors) && typeof currentItem.flavors[0] === 'string'
                                        ? currentItem.flavors as string[]
                                        : []
                                    ).map((flavor) => (
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
                        )}
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
