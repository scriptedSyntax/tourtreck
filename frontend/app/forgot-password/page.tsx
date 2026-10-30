import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <div className="container mx-auto max-w-md px-4 py-16"><div className="rounded-lg border p-6 shadow-sm"><h1 className="mb-2 text-2xl font-bold">Forgot your password?</h1><p className="mb-6 text-muted-foreground">Enter your email and we’ll send secure recovery instructions.</p><ForgotPasswordForm /></div></div>;
}
