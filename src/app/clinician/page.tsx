"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { components } from "@/types/api";

type QueueItem = components["schemas"]["QueueItemOut"];
type Window = components["schemas"]["AvailabilityWindowOut"];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ClinicianPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [triage, setTriage] = useState<components["schemas"]["TriageFormResponse"] | null>(null);
  const [windows, setWindows] = useState<Window[]>([]);
  const [draft, setDraft] = useState({ weekday: 0, start: "09:00", end: "12:00" });
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState("");
  const [rx, setRx] = useState({ medication: "", dosage: "", instructions: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    const [q, a] = await Promise.all([api.GET("/api/clinician/queue"), api.GET("/api/clinician/availability")]);
    if (q.error || a.error) {
      setErr("Sign in as a clinician to view the queue.");
      return;
    }
    setQueue(q.data?.appointments ?? []);
    setWindows(a.data?.windows ?? []);
  };

  useEffect(() => {
    // Initial data fetch on mount — the legitimate useEffect case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const openTriage = async (item: QueueItem) => {
    setSelected(item);
    setTriage(null);
    if (!item.patient_id) return;
    const { data, error } = await api.GET("/api/clinician/patients/{patient_id}/triage-form", {
      params: { path: { patient_id: item.patient_id } },
    });
    if (!error && data) setTriage(data);
  };

  const saveAvailability = async () => {
    const { error } = await api.PUT("/api/clinician/availability", {
      body: {
        windows: [
          ...windows.map((w) => ({ weekday: w.weekday, start: w.start_time.slice(0, 5), end: w.end_time.slice(0, 5) })),
          draft,
        ],
      },
    });
    if (error) setErr("Could not save availability.");
    else void load();
  };

  const call = async () => {
    if (!selected) return;
    setMsg(null);
    const { data, error } = await api.POST("/api/calls/click-to-call", {
      body: { appointment_id: selected.id, patient_phone_number: phone, consent_confirmed: consent },
    });
    setMsg(error ? "Call failed. Confirm consent and the patient number." : `Call bridged. Session ${data?.session_id}.`);
  };

  const prescribe = async () => {
    if (!selected) return;
    const { error } = await api.POST("/api/prescriptions", {
      body: { patient_id: selected.patient_id, ...rx },
    });
    setMsg(error ? "Prescription failed." : "Prescription sent.");
    if (!error) setRx({ medication: "", dosage: "", instructions: "" });
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Clinician queue</h1>
          <p className="text-xs text-muted-foreground">Most urgent first. Triage reports are generated, not confirmed.</p>
        </div>
        <Link className="text-sm underline" href="/">
          Patient view
        </Link>
      </header>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {msg && <p className="text-sm">{msg}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urgency</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((q) => (
                <TableRow key={q.id} onClick={() => void openTriage(q)} className="cursor-pointer">
                  <TableCell>
                    <Badge variant={q.tier === "RED" ? "destructive" : "secondary"}>{q.tier}</Badge>
                  </TableCell>
                  <TableCell>{q.patient?.name ?? q.patient_id.slice(0, 8)}</TableCell>
                  <TableCell>{new Date(q.scheduled_at).toLocaleString()}</TableCell>
                  <TableCell>{q.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selected: {selected.patient?.name ?? selected.patient_id}</CardTitle>
            <CardDescription>
              {selected.patient?.phone_number} · {selected.patient?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {selected.triage_report && (
              <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(selected.triage_report, null, 2)}
              </pre>
            )}
            {triage && (
              <div>
                <p className="font-medium">Structured fields (generated)</p>
                <pre className="overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(triage.fields, null, 2)}</pre>
                {triage.triage_result && (
                  <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(triage.triage_result, null, 2)}
                  </pre>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="call-phone">Patient number</Label>
                <Input
                  id="call-phone"
                  value={phone || selected.patient?.phone_number || ""}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
                Recording consent confirmed
              </label>
              <Button onClick={call}>Call patient</Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="rx-med">Medication</Label>
                <Input id="rx-med" value={rx.medication} onChange={(e) => setRx({ ...rx, medication: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rx-dose">Dosage</Label>
                <Input id="rx-dose" value={rx.dosage} onChange={(e) => setRx({ ...rx, dosage: e.target.value })} />
              </div>
              <div className="min-w-40 flex-1">
                <Label htmlFor="rx-ins">Instructions</Label>
                <Input
                  id="rx-ins"
                  value={rx.instructions}
                  onChange={(e) => setRx({ ...rx, instructions: e.target.value })}
                />
              </div>
              <Button variant="secondary" onClick={prescribe}>
                Send prescription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Weekly availability (UTC)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {windows.map((w, i) => (
            <p key={i}>
              {DAYS[w.weekday] ?? w.weekday}: {w.start_time} – {w.end_time}
            </p>
          ))}
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="av-day">Day (0=Mon)</Label>
              <Input
                id="av-day"
                type="number"
                min={0}
                max={6}
                value={draft.weekday}
                onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="av-start">Start</Label>
              <Input
                id="av-start"
                type="time"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="av-end">End</Label>
              <Input id="av-end" type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </div>
            <Button variant="secondary" onClick={saveAvailability}>
              Add window & save
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
