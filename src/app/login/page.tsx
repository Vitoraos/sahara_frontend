import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 py-10">
      <AuthForm mode="login" />
      <p className="text-sm text-muted-foreground">
        New to Sahara?{" "}
        <Link className="underline" href="/signup">
          Create an account
        </Link>
      </p>
    </main>
  );
}
