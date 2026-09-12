"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInPatient, signUpPatient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode, onDone }: { mode: "login" | "signup"; onDone?: (patientId: string | null) => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (mode === "signup") {
        const patientId = await signUpPatient({ name, phone, email, password });
        onDone?.(patientId);
      } else {
        await signInPatient(email, password);
        onDone?.(null);
      }
      router.push("/consult");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "signup" ? "Create your Sahara account" : "Welcome back"}</CardTitle>
        <CardDescription>
          {mode === "signup"
            ? "One account for voice consultations, appointments and prescriptions."
            : "Sign in to continue to your consultation."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {mode === "signup" && (
          <>
            <Label htmlFor="auth-name">Full name</Label>
            <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <Label htmlFor="auth-phone">Phone number</Label>
            <Input id="auth-phone" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </>
        )}
        <Label htmlFor="auth-email">Email</Label>
        <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <Label htmlFor="auth-pass">Password</Label>
        <Input
          id="auth-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        {err && (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        )}
        <Button onClick={submit} disabled={busy || !email || !password}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </CardContent>
    </Card>
  );
}
