"use client";

import { useTransition } from "react";
import { setMappingStatusAction } from "@/actions/biometric";
import { Button } from "@/components/ui/button";

export function MappingActions({ id, enabled }: { id: string; enabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={enabled ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setMappingStatusAction(id, !enabled);
        })
      }
    >
      {enabled ? "Disable" : "Enable"}
    </Button>
  );
}
