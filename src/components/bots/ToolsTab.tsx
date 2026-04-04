import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useToolDefinitions, useToolMutations, type ToolDefinition } from "@/hooks/useToolDefinitions";
import type { Database } from "@/integrations/supabase/types";

type HandlerType = Database["public"]["Enums"]["handler_type"];

interface ToolsTabProps {
  botId: string;
}

export function ToolsTab({ botId }: ToolsTabProps) {
  const { data: tools, isLoading } = useToolDefinitions(botId);
  const { createTool, updateTool, deleteTool } = useToolMutations();
  const [showAddForm, setShowAddForm] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading tools…</p>;

  return (
    <div className="space-y-4">
      {(!tools || tools.length === 0) && !showAddForm && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Wrench className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No tool definitions yet.</p>
        </div>
      )}

      {tools?.map((tool) => (
        <ToolRow key={tool.id} tool={tool} onUpdate={updateTool} onDelete={deleteTool} />
      ))}

      {showAddForm ? (
        <AddToolForm
          botId={botId}
          onCreate={createTool}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)} className="gap-1">
          <Plus className="h-3 w-3" /> Add Tool
        </Button>
      )}
    </div>
  );
}

function ToolRow({ tool, onUpdate, onDelete }: {
  tool: ToolDefinition;
  onUpdate: { mutate: (args: { id: string; updates: Record<string, unknown> }) => void };
  onDelete: { mutate: (t: ToolDefinition) => void };
}) {
  const [open, setOpen] = useState(false);
  const [schema, setSchema] = useState(tool.input_schema ? JSON.stringify(tool.input_schema, null, 2) : "");

  const handleSaveSchema = () => {
    if (schema.trim()) {
      try {
        const parsed = JSON.parse(schema);
        onUpdate.mutate({ id: tool.id, updates: { input_schema: parsed } });
        toast.success("Schema saved");
      } catch (e: any) {
        toast.error(`Invalid JSON: ${e.message}`);
      }
    } else {
      onUpdate.mutate({ id: tool.id, updates: { input_schema: null } });
      toast.success("Schema cleared");
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border">
      <div className="flex items-center justify-between px-4 py-2.5">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:underline">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {tool.tool_name}
        </CollapsibleTrigger>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{tool.handler_type}</Badge>
          <Switch
            checked={tool.is_active}
            onCheckedChange={(checked) => onUpdate.mutate({ id: tool.id, updates: { is_active: checked } })}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete tool "{tool.tool_name}"?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete.mutate(tool)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <CollapsibleContent className="px-4 pb-3 space-y-2">
        {tool.tool_description && (
          <p className="text-xs text-muted-foreground">{tool.tool_description}</p>
        )}
        <Label className="text-xs">Input Schema (JSON)</Label>
        <Textarea
          value={schema}
          onChange={(e) => setSchema(e.target.value)}
          className="font-mono text-xs min-h-[120px] resize-y"
          placeholder='{"type": "object", "properties": {}}'
        />
        <Button size="sm" onClick={handleSaveSchema}>Save Schema</Button>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AddToolForm({ botId, onCreate, onCancel }: {
  botId: string;
  onCreate: { mutateAsync: (args: Record<string, unknown>) => Promise<unknown> };
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [handlerType, setHandlerType] = useState<HandlerType>("passthrough");
  const [schema, setSchema] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Tool name is required"); return; }

    let parsedSchema = null;
    if (schema.trim()) {
      try {
        parsedSchema = JSON.parse(schema);
      } catch (e: any) {
        toast.error(`Invalid JSON: ${e.message}`);
        return;
      }
    }

    setSaving(true);
    try {
      await onCreate.mutateAsync({
        bot_id: botId,
        tool_name: name,
        tool_description: desc || null,
        handler_type: handlerType,
        input_schema: parsedSchema,
      } as any);
      toast.success("Tool created");
      onCancel();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <p className="text-sm font-medium">New Tool Definition</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tool Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="search_contacts" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Handler Type</Label>
          <Select value={handlerType} onValueChange={(v) => setHandlerType(v as HandlerType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hubspot">HubSpot</SelectItem>
              <SelectItem value="web_search">Web Search</SelectItem>
              <SelectItem value="passthrough">Passthrough</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Description</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Searches HubSpot contacts by name or email" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Input Schema (JSON)</Label>
        <Textarea
          value={schema}
          onChange={(e) => setSchema(e.target.value)}
          className="font-mono text-xs min-h-[100px]"
          placeholder='{"type": "object", "properties": {"query": {"type": "string"}}}'
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? "Creating…" : "Create Tool"}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
