import Link from "next/link";
import { ArrowRight, CalendarCheck, Mic, ShieldCheck, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-base font-semibold">Sahara</p>
          <nav className="flex items-center gap-3 text-sm">
            <Link className="underline" href="/login">
              Sign in
            </Link>
            <Button size="sm" render={<Link href="/signup">Get started</Link>} />
          </nav>
        </div>
      </header>

      {/* Hero — the 2am story */}
      <section className="bg-secondary/50">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-14 sm:px-6 sm:py-20">
          <Badge variant="secondary" className="w-fit">
            Voice health triage
          </Badge>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            It&apos;s 2am. Your child has a fever. Someone is listening.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            No queues. No forms. No medical jargon. Just speak — Sahara hears you, understands what matters, and gets
            you to the right care. This is what healthcare feels like when it starts with listening.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/consult">Start consultation</Link>} />
            <Button size="lg" variant="outline" render={<Link href="/signup">Create free account</Link>} />
          </div>
          <p className="text-sm text-muted-foreground">
            Reviewed by real clinicians · Your words stay yours · Free to start
          </p>
        </div>
      </section>

      {/* How it works — the relief */}
      <section>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Three minutes from worry to a plan</h2>
            <p className="mt-1 text-muted-foreground">You talk. Sahara does the rest — in your language.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <Mic className="size-5 text-primary" />
                <CardTitle className="text-base">1. Speak naturally</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Describe what&apos;s wrong in your own words. Sahara transcribes live as you talk — nothing to type.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Stethoscope className="size-5 text-primary" />
                <CardTitle className="text-base">2. Sahara understands</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Danger signs are checked first, always. Then Sahara gathers what a clinician needs to know — and replies
                in voice.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CalendarCheck className="size-5 text-primary" />
                <CardTitle className="text-base">3. Care gets booked</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                The earliest doctor slot is reserved for you automatically. Your triage report waits for the clinician.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dream outcome band */}
      <section className="bg-foreground text-background">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Imagine never bracing for the clinic queue again</h2>
          <p className="max-w-xl leading-relaxed opacity-90">
            Your mother&apos;s symptoms, captured clearly before she forgets them. Your prescription, waiting in your
            inbox. Your doctor, already briefed before you walk in. Sahara turns a frightening morning into a handled
            one.
          </p>
          <div>
            <Button size="lg" variant="secondary" render={<Link href="/consult">Try it now — speak for 30 seconds</Link>} />
          </div>
        </div>
      </section>

      {/* Safety — honest trust */}
      <section>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Safe by design, honest by default</h2>
          </div>
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Danger first</CardTitle>
                <CardDescription>
                  Emergency signs are detected before anything else — and escalated immediately.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Never a diagnosis</CardTitle>
                <CardDescription>
                  Sahara&apos;s assessment is preliminary and clearly labeled. A clinician always reviews it.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consent-gated</CardTitle>
                <CardDescription>
                  Calls are never recorded silently. Recording starts only with explicit confirmation.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <Card className="bg-secondary/60">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <p className="text-sm">
                <span className="font-medium">Are you a clinician?</span> See urgency-sorted queues with embedded triage
                reports.
              </p>
              <Button variant="outline" render={<Link href="/clinician">Open clinician view</Link>} />
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-muted-foreground sm:px-6">
          <p>Sahara — care that listens.</p>
          <Link className="inline-flex items-center gap-1 underline" href="/consult">
            Start consultation <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </footer>
    </main>
  );
}
