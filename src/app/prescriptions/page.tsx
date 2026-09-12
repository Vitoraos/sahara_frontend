"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RecordsShell } from "@/components/records-shell";
import { Card, CardContent } from "@/components/ui/card";
import type { components } from "@/types/api";

export default function PrescriptionsPage() {
  const [items, setItems] = useState<components["schemas"]["Prescription"][]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await api.GET("/api/prescriptions");
      if (error || !data) return setErr("Sign in to view your prescriptions.");
      setItems(data.prescriptions);
    })();
  }, []);

  return (
    <RecordsShell title="My prescriptions">
      {err && <p className="text-sm text-destructive">{err}</p>}
      {items.length === 0 && !err && <p className="text-sm text-muted-foreground">No prescriptions yet.</p>}
      {items.map((p) => (
        <Card key={p.id}>
          <CardContent className="pt-4 text-sm">
            <p className="font-medium">
              {p.medication} — {p.dosage}
            </p>
            <p className="text-muted-foreground">{p.instructions}</p>
          </CardContent>
        </Card>
      ))}
    </RecordsShell>
  );
}
