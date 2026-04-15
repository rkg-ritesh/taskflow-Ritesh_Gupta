import { LoginForm } from "@/components/auth/LoginForm";
import { LayoutDashboard } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <div className="flex items-center gap-2 mb-8">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">TaskFlow</span>
      </div>
      <LoginForm />
    </div>
  );
}
