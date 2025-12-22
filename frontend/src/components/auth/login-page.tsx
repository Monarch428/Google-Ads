import { FormEvent, useState } from "react";
import { Apple, Github, LockKeyhole, Mail } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Separator } from "../ui/separator";
import { login, AuthResponse, startGoogleOAuth } from "../../lib/api";
import { toast } from "sonner@2.0.3";
import type { AuthMethod } from "../../lib/auth-types";
import { useRouter } from "../../lib/router";

type LoginPageProps = {
  onAuthenticated: (
    response: AuthResponse,
    metadata: { method: AuthMethod; request: Record<string, unknown> },
  ) => void;
};

type SocialProvider = "Google" | "GitHub" | "Apple";

function getInitialCredentials() {
  if (import.meta.env.DEV) {
    const email = import.meta.env.VITE_DEMO_EMAIL;
    const password = import.meta.env.VITE_DEMO_PASSWORD;
    if (email && password) {
      return { email, password };
    }
  }

  return { email: "", password: "" };
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [{ email, password }, setCredentials] = useState(getInitialCredentials);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { navigate } = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await login({ email, password });
      onAuthenticated(response, {
        method: "password",
        request: {
          type: "credentials",
          email,
          password_present: password.length > 0,
          password_length: password.length,
          raw_payload: {
            email,
            password: password.length ? "***redacted***" : "",
          },
        },
      });
      toast.success("Signed in successfully", {
        description: `Welcome back, ${response.user.name}!`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in";
      setError(message);
      toast.error("Sign in failed", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: SocialProvider) => {
    if (provider !== "Google") {
      toast.info(`${provider} login is coming soon.`);
      return;
    }
    startGoogleOAuth();
    // try {
    //   const base = "http://localhost:8000"; // e.g. "https://api.example.com"
    //   window.location.assign(`${base}/auth/google-connect`);
    // } catch (err) {
    //   const message = err instanceof Error ? err.message : "Unable to start Google login";
    //   toast.error("Google login failed", { description: message });
    // }
  };


  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 "
      style={{ background: "linear-gradient(to bottom right, #271650, #3F2974)" }}
    >
      <Card className="w-full max-w-[720px] sm:max-w-[600px] md:max-w-[720px] rounded-xl shadow-xl">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="flex justify-center mb-6">
            <div className="relative mt-6"> {/* slight push down */}
              {/* Inner circle (padding + bg) */}
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center
                    border border-red-100 shadow-[0_4px_12px_rgba(244,63,94,0.15)]">
                <LockKeyhole className="h-6 w-6 text-red-600" />
              </div>

              {/* Soft outer halo */}
              <div className="pointer-events-none absolute inset-0 rounded-full
                    shadow-[0_0_0_6px_rgba(244,63,94,0.08)]" />
            </div>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setCredentials((prev) => ({ ...prev, email: event.target.value }))}
                  required
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-primary hover:underline text-sm"
                  onClick={() =>
                    toast.message("Forgot password", {
                      description: "Password reset flows are handled by the admin.",
                    })
                  }
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  className="pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
  type="submit"
  className="w-full bg-red-500 hover:bg-red-600 text-white"
  disabled={isLoading}
>
  {isLoading ? "Signing in..." : "Sign in"}
</Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin("Google")}
                disabled={isLoading}
              >
                <span className="text-lg font-semibold text-[#DB4437]">G</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin("GitHub")}
                disabled={isLoading}
              >
                <Github className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin("Apple")}
                disabled={isLoading}
              >
                <Apple className="h-5 w-5" />
              </Button>
            </div>

            <p className="text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() =>
                  toast.message("Contact support", {
                    description: "Please contact your administrator to create an account.",
                  })
                }
              >
                Sign up
              </button>
            </p>
            <div className="text-center text-xs text-muted-foreground">
              <p className="mb-1">By signing in you agree to our policies.</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => navigate("/terms-of-service")}
                >
                  Terms of Service
                </button>
                <span className="text-slate-400">•</span>
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => navigate("/privacy-policy")}
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
