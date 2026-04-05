import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ClipboardList, ChevronDown, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { useAuditLog, useAuditDistinct, type AuditFilters } from "@/hooks/useAuditLog";
import { useUsers } from "@/hooks/useUsers";
import { format } from "date-fns";

const AuditLog = () => {
  const [filters, setFilters] = useState<AuditFilters>({ page: 0 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useAuditLog(filters);
  const { data: distinct } = useAuditDistinct();
  const { data: users } = useUsers();

  const entries = data?.entries ?? [];
  const totalPages = Math.ceil((data?.totalCount ?? 0) / (data?.pageSize ?? 50));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const userMap = new Map(users?.map((u) => [u.id, u.display_name || u.email]) ?? []);

  const formatAction = (action: string) => {
    const parts = action.split(".");
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" › ");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all administrative changes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.actionType || "__all__"}
          onValueChange={(v) => setFilters((f) => ({ ...f, actionType: v === "__all__" ? undefined : v, page: 0 }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All actions</SelectItem>
            {distinct?.actionTypes.map((a) => (
              <SelectItem key={a} value={a}>{formatAction(a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.entityType || "__all__"}
          onValueChange={(v) => setFilters((f) => ({ ...f, entityType: v === "__all__" ? undefined : v, page: 0 }))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All entities</SelectItem>
            {distinct?.entityTypes.map((e) => (
              <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.userId || "__all__"}
          onValueChange={(v) => setFilters((f) => ({ ...f, userId: v === "__all__" ? undefined : v, page: 0 }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All users</SelectItem>
            {distinct?.userIds.map((uid) => (
              <SelectItem key={uid} value={uid}>{userMap.get(uid) ?? uid.slice(0, 8)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-[160px]"
          value={filters.dateFrom ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 0 }))}
          placeholder="From"
        />
        <Input
          type="date"
          className="w-[160px]"
          value={filters.dateTo ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 0 }))}
          placeholder="To"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !entries.length ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No audit entries yet.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Configuration changes will be logged here automatically.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const isExpanded = expanded.has(entry.id);
                return (
                  <>
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer"
                      onClick={() => toggle(entry.id)}
                    >
                      <TableCell className="w-8 pr-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.created_at), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {userMap.get(entry.user_id ?? "") ?? entry.user_id?.slice(0, 8) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {entry.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{entry.entity_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {entry.entity_id?.slice(0, 8) ?? "—"}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${entry.id}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {entry.before_state && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Before</p>
                                <pre className="text-xs bg-background rounded-md p-3 overflow-auto max-h-64 border">
                                  {JSON.stringify(entry.before_state, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.after_state && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">After</p>
                                <pre className="text-xs bg-background rounded-md p-3 overflow-auto max-h-64 border">
                                  {JSON.stringify(entry.after_state, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.details && (
                              <div className={!entry.before_state && !entry.after_state ? "" : "col-span-2"}>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Details</p>
                                <pre className="text-xs bg-background rounded-md p-3 overflow-auto max-h-64 border">
                                  {JSON.stringify(entry.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {filters.page + 1} of {totalPages} ({data?.totalCount} entries)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 0}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= totalPages - 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
