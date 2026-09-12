"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RecordsShell } from "@/components/records-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { components } from "@/types/api";

export default function AppointmentsPage() {
  const [items, setItems] = useState<components["schemas"]["AppointmentOut"][]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await api.GET("/api/appointments");
      if (error || !data) return setErr("Sign in to view your appointments.");
      setItems(data.appointments);
    })();
  }, []);

  return (
    <RecordsShell title="My appointments">
      {err && <p className="text-sm text-destructive">{err}</p>}
      {items.length === 0 && !err && <p className="text-sm text-muted-foreground">No appointments yet.</p>}
      {items.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex flex-wrap items-center gap-2 pt-4 text-sm">
            <Badge variant="secondary">{a.tier}</Badge>
            <span>{new Date(a.scheduled_at).toLocaleString()}</span>
            <span className="text-muted-foreground">{a.status}</span>
          </CardContent>
        </Card>
      ))}
    </RecordsShell>
  );
}
