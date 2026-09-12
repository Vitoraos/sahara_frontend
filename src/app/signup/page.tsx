import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 py-10">
      <AuthForm mode="signup" />
      <p className="text-sm text-muted-foreground">
        Have an account?{" "}
        <Link className="underline" href="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}
