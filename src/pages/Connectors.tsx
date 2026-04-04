import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug } from "lucide-react";

const sections = [
  {
    title: "Shared Connectors",
    description: "Available to all bots",
    items: ["Slack", "Anthropic Claude"],
  },
  {
    title: "Bot-Specific Connectors",
    description: "Assigned per bot",
    items: ["HubSpot CRM"],
  },
];

const Connectors = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Connectors</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage API connections and credentials</p>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <div>
            <h2 className="text-lg font-medium text-foreground">{section.title}</h2>
            <p className="text-xs text-muted-foreground">{section.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.items.map((name) => (
              <Card key={name}>
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">{name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-inactive" />
                    <span className="text-xs text-muted-foreground">Not configured</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Connectors;
