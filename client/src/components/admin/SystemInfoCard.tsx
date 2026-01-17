
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface SystemInfoCardProps {
    lastClosed?: string;
    status: 'OPEN' | 'CLOSED';
    maintenance?: boolean;
    isTest?: boolean;
}

export function SystemInfoCard({ lastClosed, status, maintenance, isTest }: SystemInfoCardProps) {
    let statusText = 'Online';
    let statusColor = 'text-success font-medium';

    if (maintenance) {
        statusText = 'Maintenance Mode';
        statusColor = 'text-warning font-bold';
    } else if (isTest) {
        statusText = 'Test Mode';
        statusColor = 'text-blue-500 font-bold';
    } else if (status === 'CLOSED') {
        statusText = 'Closed';
        statusColor = 'text-muted-foreground font-medium';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Info</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Server Status:</span>
                        <span className={statusColor}>
                            {statusText}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Data Storage:</span>
                        <span className="font-mono">PostgreSQL</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Last Closed:</span>
                        <span className="font-medium">
                            {lastClosed
                                ? format(new Date(lastClosed), 'PPP p')
                                : 'Never'}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
