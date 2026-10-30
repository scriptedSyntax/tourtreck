import AuthForm from "@/components/auth/AuthForm";

export default function LoginPage() {
  return <div className="container max-w-md mx-auto px-4 py-16"><div className="border rounded-lg p-6 shadow-sm"><h1 className="text-2xl font-bold mb-2">Welcome back</h1><p className="text-muted-foreground mb-6">Sign in to view your orders and account.</p><AuthForm mode="login" /></div></div>;
}
