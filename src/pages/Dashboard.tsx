import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, Bot, Zap, DollarSign, CalendarIcon, TrendingUp } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/hooks/useActivityLog";
import { useBots } from "@/hooks/useBots";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

type Preset = "7d" | "30d" | "90d" | "custom";

const Dashboard = () => {
  const [preset, setPreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    if (preset === "custom" && customFrom && customTo) {
      return { dateFrom: startOfDay(customFrom).toISOString(), dateTo: endOfDay(customTo).toISOString() };
    }
    const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
    return { dateFrom: startOfDay(subDays(now, days)).toISOString(), dateTo: endOfDay(now).toISOString() };
  }, [preset, customFrom, customTo]);

  const { data: entries = [], isLoading } = useDashboardData(dateFrom, dateTo);
  const { data: bots } = useBots();

  const today = useMemo(() => startOfDay(new Date()).toISOString(), []);

  const stats = useMemo(() => {
    const totalQueries = entries.length;
    const queriesToday = entries.filter(e => e.created_at >= today).length;
    const errors = entries.filter(e => e.status === "error").length;
    const errorRate = totalQueries > 0 ? (errors / totalQueries * 100) : 0;
    const totalCost = entries.reduce((s, e) => s + (Number(e.estimated_cost_usd) || 0), 0);
    return { totalQueries, queriesToday, errorRate, totalCost };
  }, [entries, today]);

  // Per-bot breakdown
  const botBreakdown = useMemo(() => {
    const botMap = new Map<string | null, { name: string; queries: number; errors: number; totalDuration: number; durationCount: number; cost: number; isDeleted: boolean }>();
    const botIds = new Set(bots?.map(b => b.id) ?? []);

    for (const e of entries) {
      const key = e.bot_id;
      if (!botMap.has(key)) {
        botMap.set(key, {
          name: e.bot_name ?? "Unknown",
          queries: 0, errors: 0, totalDuration: 0, durationCount: 0, cost: 0,
          isDeleted: key ? !botIds.has(key) : true,
        });
      }
      const b = botMap.get(key)!;
      b.queries++;
      if (e.status === "error") b.errors++;
      if (e.duration_ms != null) { b.totalDuration += e.duration_ms; b.durationCount++; }
      b.cost += Number(e.estimated_cost_usd) || 0;
    }
    return Array.from(botMap.values()).sort((a, b) => b.queries - a.queries);
  }, [entries, bots]);

  // Chart data: queries per day
  const dailyData = useMemo(() => {
    const dayMap = new Map<string, { queries: number; cost: number }>();
    for (const e of entries) {
      const day = format(new Date(e.created_at), "yyyy-MM-dd");
      const d = dayMap.get(day) ?? { queries: 0, cost: 0 };
      d.queries++;
      d.cost += Number(e.estimated_cost_usd) || 0;
      dayMap.set(day, d);
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date: format(new Date(date), "MMM d"), queries: d.queries, cost: parseFloat(d.cost.toFixed(4)) }));
  }, [entries]);

  // Chart data: queries by bot
  const botChartData = useMemo(() =>
    botBreakdown.map(b => ({ name: b.name, queries: b.queries })),
  [botBreakdown]);

  const chartConfig = {
    queries: { label: "Queries", color: "hsl(var(--primary))" },
    cost: { label: "Cost ($)", color: "hsl(var(--warning))" },
  };

  const kpis = [
    { title: "Total Queries", value: stats.totalQueries.toLocaleString(), icon: Activity, description: `Since ${format(new Date(dateFrom), "MMM d")}` },
    { title: "Queries Today", value: stats.queriesToday.toLocaleString(), icon: TrendingUp, description: "Today" },
    { title: "Error Rate", value: `${stats.errorRate.toFixed(1)}%`, icon: Zap, description: "In selected period" },
    { title: "Estimated Cost", value: `$${stats.totalCost.toFixed(2)}`, icon: DollarSign, description: "In selected period" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your GTM bot operations</p>
        </div>
        <div className="flex items-center gap-2">
          {(["7d", "30d", "90d"] as Preset[]).map(p => (
            <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => setPreset(p)}>
              {p}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant={preset === "custom" ? "default" : "outline"} className="gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-3" align="end">
              <div className="flex gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <Calendar mode="single" selected={customFrom} onSelect={d => { setCustomFrom(d); if (d && customTo) setPreset("custom"); }}
                    className="p-2 pointer-events-auto" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">To</p>
                  <Calendar mode="single" selected={customTo} onSelect={d => { setCustomTo(d); if (customFrom && d) setPreset("custom"); }}
                    className="p-2 pointer-events-auto" />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{isLoading ? "…" : kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {entries.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Queries per Day</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="queries" stroke="var(--color-queries)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Cost per Day ($)</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="cost" stroke="var(--color-cost)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-sm">Queries by Bot</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={botChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="queries" fill="var(--color-queries)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No data for this period.</p>
          </CardContent>
        </Card>
      )}

      {/* Per-bot breakdown */}
      {botBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Per-Bot Breakdown</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bot</TableHead>
                <TableHead className="text-right">Queries</TableHead>
                <TableHead className="text-right">Avg Response</TableHead>
                <TableHead className="text-right">Error Rate</TableHead>
                <TableHead className="text-right">Est. Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {botBreakdown.map((b, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    {b.name}
                    {b.isDeleted && <Badge variant="secondary" className="ml-2 text-xs">deleted</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{b.queries}</TableCell>
                  <TableCell className="text-right">{b.durationCount > 0 ? `${(b.totalDuration / b.durationCount / 1000).toFixed(1)}s` : "—"}</TableCell>
                  <TableCell className="text-right">{b.queries > 0 ? `${(b.errors / b.queries * 100).toFixed(1)}%` : "—"}</TableCell>
                  <TableCell className="text-right">${b.cost.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
