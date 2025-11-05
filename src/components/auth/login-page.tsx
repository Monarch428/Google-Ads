import { FormEvent, useState } from "react";
import { Apple, Chrome, Github, LockKeyhole, Mail } from "lucide-react";
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
import { login, AuthResponse, requestGoogleOAuthUrl } from "../../lib/api";
import { toast } from "sonner@2.0.3";

type LoginPageProps = {
  onAuthenticated: (response: AuthResponse) => void;
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await login({ email, password });
      onAuthenticated(response);
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

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (provider !== "Google") {
      toast.info(`${provider} login is coming soon.`);
      return;
    }

    try {
      const { auth_url } = await requestGoogleOAuthUrl();
      window.location.href = auth_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start Google login";
      toast.error("Google login failed", {
        description: message,
      });
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#2A0E57] via-[#4B1A7A] to-[#E74296] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="relative flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <Card className="w-full max-w-lg rounded-3xl border-none bg-white/95 p-2 shadow-[0_40px_70px_-30px_rgba(37,14,80,0.65)] backdrop-blur">
          <CardHeader className="space-y-4 pb-0 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7E7FF] text-[#C02D74] shadow-inner">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold text-foreground">Welcome back</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Enter your credentials to access your account
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-8">
            <CardContent className="space-y-6 pt-0">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, email: event.target.value }))}
                    required
                    className="h-12 rounded-xl border border-border/60 bg-white pl-10 text-base shadow-sm"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-sm font-medium text-[#E74296] transition-colors hover:text-[#ff5aa9]"
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
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                    required
                    className="h-12 rounded-xl border border-border/60 bg-white pl-10 text-base shadow-sm"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-6 pt-0">
              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#E74296] text-base font-semibold text-white shadow-md transition hover:bg-[#d33886]"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="bg-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid w-full grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl border-border/70 bg-white text-sm font-semibold text-foreground/80 transition hover:border-[#E74296]/60 hover:text-[#E74296]"
                  onClick={() => handleSocialLogin("Google")}
                  disabled={isLoading}
                >
                  <Chrome className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl border-border/70 bg-white text-sm font-semibold text-foreground/80 transition hover:border-[#E74296]/60 hover:text-[#E74296]"
                  onClick={() => handleSocialLogin("GitHub")}
                  disabled={isLoading}
                >
                  <Github className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl border-border/70 bg-white text-sm font-semibold text-foreground/80 transition hover:border-[#E74296]/60 hover:text-[#E74296]"
                  onClick={() => handleSocialLogin("Apple")}
                  disabled={isLoading}
                >
                  <Apple className="h-5 w-5" />
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-[#E74296] transition hover:text-[#ff5aa9]"
                  onClick={() =>
                    toast.message("Contact support", {
                      description: "Please contact your administrator to create an account.",
                    })
                  }
                >
                  Sign up
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
