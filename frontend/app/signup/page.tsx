import AuthForm from "@/components/auth/AuthForm";

export default function SignupPage() {
  return <div className="container max-w-md mx-auto px-4 py-16"><div className="border rounded-lg p-6 shadow-sm"><h1 className="text-2xl font-bold mb-2">Create your account</h1><p className="text-muted-foreground mb-6">Register as a customer to track your orders.</p><AuthForm mode="signup" /></div></div>;
}
