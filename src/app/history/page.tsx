"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RecordsShell } from "@/components/records-shell";
import { Card, CardContent } from "@/components/ui/card";
import type { components } from "@/types/api";

export default function HistoryPage() {
  const [items, setItems] = useState<components["schemas"]["ConversationHistoryItem"][]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await api.GET("/api/history");
      if (error || !data) return setErr("Sign in to view your history.");
      setItems(data.conversations);
    })();
  }, []);

  return (
    <RecordsShell title="Past consultations">
      {err && <p className="text-sm text-destructive">{err}</p>}
      {items.length === 0 && !err && <p className="text-sm text-muted-foreground">No past consultations yet.</p>}
      {items.map((c) => (
        <Card key={c.id}>
          <CardContent className="pt-4 text-sm">
            <p>
              {c.started_at ? new Date(c.started_at).toLocaleString() : c.id} · {c.status ?? "done"}
            </p>
            {c.triage_result && (
              <p className="text-muted-foreground">Triage outcome recorded — ask your clinician for details.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </RecordsShell>
  );
}
