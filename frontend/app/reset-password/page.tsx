import SetPasswordForm from "@/components/auth/SetPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <div className="container mx-auto max-w-md px-4 py-16"><div className="rounded-lg border p-6 shadow-sm"><h1 className="mb-2 text-2xl font-bold">Reset your password</h1><p className="mb-6 text-muted-foreground">Choose a strong new password for your account.</p><SetPasswordForm mode="reset" /></div></div>;
}
