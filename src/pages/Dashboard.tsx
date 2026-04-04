import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Bot, Zap, DollarSign } from "lucide-react";

const kpis = [
  { title: "Total Queries", value: "—", icon: Activity, description: "All time" },
  { title: "Active Bots", value: "0", icon: Bot, description: "Currently online" },
  { title: "Avg Response Time", value: "—", icon: Zap, description: "Last 24h" },
  { title: "Estimated Cost", value: "—", icon: DollarSign, description: "This month" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your GTM bot operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No activity data yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Data will appear here once bots start processing queries.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
