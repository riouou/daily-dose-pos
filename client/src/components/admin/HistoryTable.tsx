
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { History, ChevronRight, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { HistoryItem } from "@/types/pos";

interface HistoryTableProps {
    history: HistoryItem[];
    onViewHistory: (filename: string) => void;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function HistoryTable({ history, onViewHistory, page, totalPages, onPageChange }: HistoryTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-6 w-6" />
                    History Archive
                </CardTitle>
                <CardDescription>Click on a row to view the daily sales report.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Opened At</TableHead>
                                <TableHead>Closed At</TableHead>
                                <TableHead>Total Orders</TableHead>
                                <TableHead className="text-right">Total Sales</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No history found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((item) => (
                                    <TableRow
                                        key={item.filename}
                                        className={`transition-colors ${item.isExpired ? 'opacity-60 cursor-not-allowed bg-muted/30' : 'cursor-pointer hover:bg-muted/50'}`}
                                        onClick={() => !item.isExpired && onViewHistory(item.filename)}
                                    >
                                        <TableCell className="font-medium">
                                            {format(new Date(item.date), 'PP')}
                                        </TableCell>
                                        <TableCell>
                                            {item.openedAt ? format(new Date(item.openedAt), 'p') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(item.closedAt), 'p')}
                                        </TableCell>
                                        <TableCell>{item.totalOrders}</TableCell>
                                        <TableCell className="text-right font-medium text-success">
                                            ₱{item.totalSales.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {item.isExpired ? (
                                                <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded">EXPIRED</span>
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            {totalPages > 1 && (
                <CardFooter className="flex items-center justify-between border-t p-4">
                    <div className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
