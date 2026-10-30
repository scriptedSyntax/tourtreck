"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { secureJsonHeaders } from "@/context/AuthContext";
import { isValidEmail, normalizeEmail } from "@/lib/input-security";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: secureJsonHeaders(),
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof data?.message === "string" ? data.message : "We could not send recovery instructions right now.");
        return;
      }
      setComplete(true);
    } catch {
      setError("We could not connect right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  if (complete) return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
      <h2 className="text-xl font-semibold">Check your email</h2>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">If an account matches that email, password recovery instructions have been sent.</p>
      <Button asChild className="w-full"><Link href="/login">Return to sign in</Link></Button>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="recovery-email" className="text-sm font-medium">Email address</label>
        <Input id="recovery-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} maxLength={254} autoComplete="email" required autoFocus className="mt-2" />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending...</> : "Send recovery email"}
      </Button>
      <p className="text-center text-sm"><Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link></p>
    </form>
  );
}
