import SetPasswordForm from "@/components/auth/SetPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure your account",
  robots: { index: false, follow: false },
};

export default function SetPasswordPage() {
  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <div className="rounded-lg border p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">Secure your account</h1>
        <p className="mb-6 text-muted-foreground">Create a password to view and follow your order.</p>
        <SetPasswordForm />
      </div>
    </div>
  );
}
