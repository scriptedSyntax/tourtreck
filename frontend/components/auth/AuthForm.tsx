"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { secureJsonHeaders, useAuth } from "@/context/AuthContext";
import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  normalizeEmail,
  normalizePassword,
  normalizePhone,
  normalizeText,
} from "@/lib/input-security";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { UserProfile } from "@/types/api";

type AuthDetails = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const emptyDetails: AuthDetails = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { establishSession } = useAuth();
  const [details, setDetails] = useState<AuthDetails>(emptyDetails);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const totalSteps = mode === "login" ? 2 : 6;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  function update(field: keyof AuthDetails, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  }

  function goBack() {
    if (loading) return;
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  async function authenticate() {
    const email = normalizeEmail(details.email);
    const password = normalizePassword(details.password);
    const body: Record<string, string> = { email, password };

    if (mode === "signup") {
      body.full_name = normalizeText(details.fullName, 255);
      body.phone = normalizePhone(details.phone);
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: secureJsonHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const fallback = mode === "login"
          ? "We couldn’t sign you in. Check your email and password."
          : "We couldn’t create your account. Please check your details.";
        setError(typeof data?.message === "string" ? data.message : fallback);
        return;
      }
      if (!data?.user || typeof data.user.email !== "string" || typeof data.user.role !== "string") {
        setError("We couldn’t complete sign in right now. Please try again.");
        return;
      }
      establishSession(data.user as UserProfile);
      router.push(mode === "login" ? "/account" : "/");
      router.refresh();
    } catch {
      setError("We couldn’t connect right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  async function continueStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "login") {
      if (step === 0) {
        const email = normalizeEmail(details.email);
        if (!isValidEmail(email)) {
          setError("Enter a valid email address.");
          return;
        }
        update("email", email);
        setStep(1);
        return;
      }
      if (!isValidPassword(normalizePassword(details.password))) {
        setError("Enter your password to continue.");
        return;
      }
      await authenticate();
      return;
    }

    if (step === 0) {
      const fullName = normalizeText(details.fullName, 255);
      if (fullName.length < 2) {
        setError("Enter your name to continue.");
        return;
      }
      update("fullName", fullName);
    } else if (step === 1) {
      const phone = normalizePhone(details.phone);
      if (!isValidPhone(phone)) {
        setError("Enter a valid phone number.");
        return;
      }
      update("phone", phone);
    } else if (step === 2) {
      const email = normalizeEmail(details.email);
      if (!isValidEmail(email)) {
        setError("Enter a valid email address.");
        return;
      }
      update("email", email);
    } else if (step === 3) {
      if (!isValidPassword(normalizePassword(details.password))) {
        setError("Use a password between 8 and 128 characters.");
        return;
      }
      setLoading(true);
      try {
        const response = await fetch("/api/auth/password-check", {
          method: "POST",
          headers: secureJsonHeaders(),
          body: JSON.stringify({ email: details.email, full_name: details.fullName, password: details.password }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setError(typeof data?.message === "string" ? data.message : "Choose a stronger password.");
          return;
        }
      } catch {
        setError("We couldn’t check that password right now. Please try again.");
        return;
      } finally {
        setLoading(false);
      }
    } else if (step === 4) {
      if (normalizePassword(details.password) !== normalizePassword(details.confirmPassword)) {
        setError("Passwords do not match.");
        return;
      }
    } else {
      await authenticate();
      return;
    }

    setStep((current) => Math.min(totalSteps - 1, current + 1));
  }

  const title = mode === "login"
    ? step === 0 ? "What’s your email?" : "Enter your password"
    : [
        "What should we call you?",
        "What’s your phone number?",
        "What’s your email?",
        "Create a password",
        "Repeat your password",
        "Ready to create your account?",
      ][step];

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {step + 1} of {totalSteps}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form onSubmit={continueStep}>
        <div key={`${mode}-${step}`} className="animate-in fade-in slide-in-from-right-2 duration-300">
          <h2 className="mb-5 text-xl font-semibold">{title}</h2>

          {mode === "login" && step === 0 && (
            <Input autoFocus type="email" value={details.email} onChange={(event) => update("email", event.target.value)} required maxLength={254} autoComplete="email" placeholder="you@example.com" aria-label="Email address" />
          )}
          {mode === "login" && step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Signing in as <span className="font-medium text-foreground">{details.email}</span></p>
              <Input autoFocus type="password" value={details.password} onChange={(event) => update("password", event.target.value)} required minLength={8} maxLength={128} autoComplete="current-password" aria-label="Password" />
              <div className="text-right"><Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link></div>
            </div>
          )}

          {mode === "signup" && step === 0 && (
            <Input autoFocus value={details.fullName} onChange={(event) => update("fullName", event.target.value)} required minLength={2} maxLength={255} autoComplete="name" placeholder="Wanjiku Mwangi" aria-label="Full name" />
          )}
          {mode === "signup" && step === 1 && (
            <Input autoFocus type="tel" inputMode="tel" value={details.phone} onChange={(event) => update("phone", event.target.value)} required minLength={7} maxLength={30} autoComplete="tel" placeholder="0712 345 678" aria-label="Phone number" />
          )}
          {mode === "signup" && step === 2 && (
            <Input autoFocus type="email" value={details.email} onChange={(event) => update("email", event.target.value)} required maxLength={254} autoComplete="email" placeholder="you@example.com" aria-label="Email address" />
          )}
          {mode === "signup" && step === 3 && (
            <Input autoFocus type="password" value={details.password} onChange={(event) => update("password", event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" aria-label="Create password" />
          )}
          {mode === "signup" && step === 4 && (
            <Input autoFocus type="password" value={details.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" aria-label="Repeat password" />
          )}
          {mode === "signup" && step === 5 && (
            <dl className="divide-y divide-border rounded-lg border px-4">
              {[["Name", details.fullName], ["Phone", details.phone], ["Email", details.email]].map(([label, value]) => (
                <div key={label} className="grid gap-1 py-3 sm:grid-cols-[80px_1fr]">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="break-words text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}

          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={goBack} disabled={loading}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <><LoaderCircle className="h-4 w-4 animate-spin" /> Please wait...</>
              ) : mode === "login" && step === 1 ? (
                "Sign in"
              ) : mode === "signup" && step === totalSteps - 1 ? (
                "Create account"
              ) : (
                <>Next <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? "New customer? " : "Already registered? "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="font-medium text-primary hover:underline">
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
