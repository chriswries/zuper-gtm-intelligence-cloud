import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity } from "lucide-react";

const ActivityLog = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">All bot queries and responses</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Bot</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Query</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6}>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Bots will log queries here once they start responding.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ActivityLog;
