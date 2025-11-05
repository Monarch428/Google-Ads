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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(to bottom right, #271650, #3F2974)" }}
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <LockKeyhole className="h-6 w-6 text-primary" />
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
            <Button type="submit" className="w-full" disabled={isLoading}>
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
                <Chrome className="h-5 w-5" />
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
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
