import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-center">
        <LoaderCircle className="h-9 w-9 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
