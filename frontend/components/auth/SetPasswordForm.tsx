"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { secureJsonHeaders } from "@/context/AuthContext";
import { isValidPassword, normalizePassword } from "@/lib/input-security";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function SetPasswordForm({ mode = "setup" }: { mode?: "setup" | "reset" }) {
  const [accountId, setAccountId] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const values = new URLSearchParams(window.location.hash.slice(1));
    setAccountId(values.get("account_id") ?? "");
    setToken(values.get("token") ?? "");
    window.history.replaceState(null, "", window.location.pathname);
    setReady(true);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanPassword = normalizePassword(password);

    if (step === 0) {
      if (!isValidPassword(cleanPassword)) {
        setError("Use a password between 8 and 128 characters.");
        return;
      }
      setStep(1);
      return;
    }
    if (cleanPassword !== normalizePassword(confirmation)) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode === "reset" ? "reset-password" : "set-password"}`, {
        method: "POST",
        headers: secureJsonHeaders(),
        body: JSON.stringify({ account_id: accountId, token, password: cleanPassword }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof data?.message === "string" ? data.message : "We could not set your password. Please try again.");
        return;
      }
      setComplete(true);
    } catch {
      setError("We could not complete account setup right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <div className="flex justify-center py-8"><LoaderCircle className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!accountId || !token) return <p className="text-sm text-destructive" role="alert">This {mode === "reset" ? "reset" : "setup"} link is invalid or incomplete.</p>;
  if (complete) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="text-xl font-semibold">{mode === "reset" ? "Password updated" : "Your account is ready"}</h2>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">Sign in with your new password to continue.</p>
        <Button asChild className="w-full"><Link href="/login">Sign in</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: step === 0 ? "50%" : "100%" }} /></div>
      {step === 0 ? (
        <div>
          <label className="text-sm font-medium" htmlFor="new-password">Choose a password</label>
          <Input id="new-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} minLength={8} maxLength={128} autoComplete="new-password" required autoFocus />
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium" htmlFor="confirm-password">Repeat your password</label>
          <Input id="confirm-password" type="password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} minLength={8} maxLength={128} autoComplete="new-password" required autoFocus />
        </div>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex gap-3">
        {step === 1 && <Button type="button" variant="outline" className="flex-1" onClick={() => { setStep(0); setError(""); }} disabled={loading}>Back</Button>}
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Securing account...</> : step === 0 ? "Continue" : "Set password"}
        </Button>
      </div>
    </form>
  );
}
