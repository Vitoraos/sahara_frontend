"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";
import { PatientNav } from "@/components/patient-nav";
import { VoiceConsole } from "@/components/voice-console";
import { getToken } from "@/lib/auth";

export default function ConsultPage() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const guest = getToken() === null;
  return (
    <main className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link href="/">
            <span className="text-base font-semibold">Sahara</span>
            <span className="block text-xs text-muted-foreground">Voice health triage</span>
          </Link>
          <AuthPanel onAuth={setPatientId} />
        </div>
      </header>
      {guest && (
        <p className="mx-auto w-full max-w-2xl px-4 pt-4 text-sm text-muted-foreground sm:px-6">
          You can try a consultation as a guest.{" "}
          <Link className="underline" href="/signup">
            Sign up
          </Link>{" "}
          to save appointments and prescriptions.
        </p>
      )}
      <VoiceConsole patientId={patientId} />
      <PatientNav />
    </main>
  );
}
