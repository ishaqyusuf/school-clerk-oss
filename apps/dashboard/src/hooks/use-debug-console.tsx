import { Button } from "@school-clerk/ui/button";
import { toast } from "@school-clerk/ui/use-toast";
import { Copy, Maximize2 } from "lucide-react";
import { useEffect } from "react";
import { openDebugToast } from "@/components/modals/debug-modal";
import { devMode } from "@school-clerk/utils";

export function useDebugConsole(...deps) {
  useEffect(() => {
    console.log({
      ...deps,
    });
  }, deps);
}
export function useDebugToast(title, ...deps) {
  useEffect(() => {
    if (deps.every((a) => !a)) return;
    debugToast(title, deps);
  }, deps);
}

export const debugToast = (title: string, data: any) => {
  if (!devMode) return;
  const formatted =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);

  // const { open } = useDebuggerParams();
  console.log({ title, data });
  toast({
    title: `🐞 ${title}`,
    description: (
      <div className="flex flex-col gap-2">
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap  h-48 rounded bg-muted p-2 text-xs">
          {formatted}
        </pre>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(formatted)}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDebugToast?.(title, formatted)}
          >
            <Maximize2 className="mr-2 h-4 w-4" />
            Expand
          </Button>
        </div>
      </div>
    ),
  });
};
