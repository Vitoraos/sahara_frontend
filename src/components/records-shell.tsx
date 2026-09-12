import Link from "next/link";
import { PatientNav } from "./patient-nav";

export function RecordsShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 px-4 pb-32 pt-6 sm:px-6">
      <header className="flex items-center justify-between">
        <h1 className="text-base font-semibold">{title}</h1>
        <Link className="text-sm underline" href="/consult">
          Back to consult
        </Link>
      </header>
      {children}
      <PatientNav />
    </main>
  );
}
