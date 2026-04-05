import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Activity, CalendarIcon, ChevronDown, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useActivityLog, type ActivityFilters } from "@/hooks/useActivityLog";
import { useBots } from "@/hooks/useBots";

const STATUS_OPTIONS = ["success", "error", "timeout", "rate_limited"] as const;

const statusBadge = (status: string) => {
  const map: Record<string, { className: string; label: string }> = {
    success: { className: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]", label: "Success" },
    error: { className: "bg-destructive text-destructive-foreground", label: "Error" },
    timeout: { className: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]", label: "Timeout" },
    rate_limited: { className: "bg-primary text-primary-foreground", label: "Rate Limited" },
  };
  const s = map[status] ?? { className: "bg-muted text-muted-foreground", label: status };
  return <Badge className={s.className}>{s.label}</Badge>;
};

const ActivityLog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters: ActivityFilters = useMemo(() => ({
    botId: searchParams.get("bot") || undefined,
    status: searchParams.get("status")?.split(",").filter(Boolean) || undefined,
    dateFrom: searchParams.get("from") || undefined,
    dateTo: searchParams.get("to") || undefined,
    slackUser: searchParams.get("user") || undefined,
    page: parseInt(searchParams.get("page") || "0", 10),
  }), [searchParams]);

  const { data, isLoading } = useActivityLog(filters);
  const { data: bots } = useBots();

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });
  }, [setSearchParams]);

  const setPage = (p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p > 0) next.set("page", String(p));
      else next.delete("page");
      return next;
    });
  };

  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;
  const [fromDate, setFromDate] = useState<Date | undefined>(filters.dateFrom ? new Date(filters.dateFrom) : undefined);
  const [toDate, setToDate] = useState<Date | undefined>(filters.dateTo ? new Date(filters.dateTo) : undefined);

  const toggleStatus = (s: string) => {
    const current = filters.status ?? [];
    const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s];
    setFilter("status", next.length > 0 ? next.join(",") : undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">All bot queries and responses</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filters.botId ?? "all"} onValueChange={v => setFilter("bot", v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Bots" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bots</SelectItem>
            {bots?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map(s => (
            <Button key={s} size="sm" variant={filters.status?.includes(s) ? "default" : "outline"}
              onClick={() => toggleStatus(s)} className="text-xs capitalize">
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {fromDate ? format(fromDate, "MMM d") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={fromDate} onSelect={d => {
              setFromDate(d);
              setFilter("from", d ? d.toISOString().split("T")[0] : undefined);
            }} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {toDate ? format(toDate, "MMM d") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={toDate} onSelect={d => {
              setToDate(d);
              setFilter("to", d ? d.toISOString().split("T")[0] : undefined);
            }} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Input placeholder="Slack user..." className="w-[160px]" value={filters.slackUser ?? ""}
          onChange={e => setFilter("user", e.target.value || undefined)} />

        {(filters.botId || filters.status || filters.dateFrom || filters.dateTo || filters.slackUser) && (
          <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Timestamp</TableHead>
              <TableHead>Bot</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Query</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : !data?.entries.length ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Bots will log queries here once they start responding.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.entries.map(entry => {
                const isOpen = expandedId === entry.id;
                return (
                  <Collapsible key={entry.id} open={isOpen} onOpenChange={() => setExpandedId(isOpen ? null : entry.id)} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{format(new Date(entry.created_at), "MMM d, HH:mm:ss")}</TableCell>
                          <TableCell className="font-medium">{entry.bot_name ?? "—"}</TableCell>
                          <TableCell>{entry.slack_user_name ?? "—"}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-sm">{entry.query_text?.slice(0, 80) ?? "—"}</TableCell>
                          <TableCell>{statusBadge(entry.status)}</TableCell>
                          <TableCell className="text-right text-xs">{entry.duration_ms != null ? `${(entry.duration_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
                          <TableCell className="text-right text-xs">{entry.estimated_cost_usd != null ? `$${Number(entry.estimated_cost_usd).toFixed(4)}` : "—"}</TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={8}>
                            <div className="grid grid-cols-2 gap-4 p-4 text-sm">
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">Full Query</p>
                                <p className="whitespace-pre-wrap break-words">{entry.query_text ?? "—"}</p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">Response</p>
                                <p className="whitespace-pre-wrap break-words max-h-60 overflow-y-auto">{entry.response_text?.slice(0, 2000) ?? "—"}</p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">Details</p>
                                <div className="space-y-1 text-xs">
                                  <p>Model: {entry.model_used ?? "—"}</p>
                                  <p>Input tokens: {entry.input_tokens?.toLocaleString() ?? "—"}</p>
                                  <p>Output tokens: {entry.output_tokens?.toLocaleString() ?? "—"}</p>
                                  {entry.error_message && <p className="text-destructive">Error: {entry.error_message}</p>}
                                </div>
                              </div>
                              {entry.tool_calls && (
                                <div>
                                  <p className="font-medium text-muted-foreground mb-1">Tool Calls</p>
                                  <pre className="text-xs bg-background p-2 rounded max-h-40 overflow-auto">
                                    {JSON.stringify(entry.tool_calls, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{data?.totalCount} entries</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={filters.page === 0} onClick={() => setPage(filters.page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {filters.page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={filters.page >= totalPages - 1} onClick={() => setPage(filters.page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
