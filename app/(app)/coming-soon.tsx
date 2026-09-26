import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="muted">Phase {phase}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        This module is intentionally not built in Phase 1. Navigation is visible so later phases can plug in without rewriting the shell.
      </CardContent>
    </Card>
  );
}
