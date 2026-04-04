import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Settings } from "lucide-react";

const BotSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Bot Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure and manage your Slack bots</p>
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-[500px]">
        {/* Left: Bot list */}
        <div className="col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No bots configured yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Create your first bot to get started.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Detail panel */}
        <div className="col-span-8">
          <Card className="h-full">
            <CardContent className="flex flex-col items-center justify-center h-full py-16 text-center">
              <Settings className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Select a bot to configure</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Choose a bot from the list or create a new one.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BotSettings;
