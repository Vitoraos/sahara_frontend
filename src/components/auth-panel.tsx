"use client";

import { useState } from "react";
import Link from "next/link";
import { clearToken, getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AuthPanel({ onAuth }: { onAuth: (patientId: string | null) => void }) {
  const [signedIn, setSignedIn] = useState(() => getToken() !== null);

  if (!signedIn) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link className="underline" href="/login" onClick={() => setSignedIn(getToken() !== null)}>
          Sign in
        </Link>
        <Button size="sm" render={<Link href="/signup">Sign up</Link>} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Signed in</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          clearToken();
          setSignedIn(false);
          onAuth(null);
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
