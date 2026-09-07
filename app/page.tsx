
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface LoginResponse {
  user?: {
    role?: string;
  };
  detail?: string;
  error?: string;
  message?: string;
}

export default function Home() {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    setCurrentDate(
      new Date().toLocaleDateString("en-US", options)
    );
  }, []);

  /**
   * Decide where the user should go based on their role.
   */
  const getRoleDestination = (role: unknown): string | null => {
    if (typeof role !== "string") {
      return null;
    }

    const normalizedRole = role.trim().toLowerCase();

    switch (normalizedRole) {
      case "admin":
        return "/admin/dashboard";

      case "manager":
        return "/manager/dashboard";

      case "director":
        return "/director/dashboard";

      default:
        return null;
    }
  };

  const handleLogin = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    setErrorMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setErrorMessage(
        "Please enter your email address and password."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/login/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        }
      );

      let data: LoginResponse = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The authentication server returned an invalid response."
        );
      }

      /**
       * Login failed.
       */
      if (!response.ok) {
        const backendError =
          data.detail ||
          data.error ||
          data.message ||
          "Invalid email or password.";

        throw new Error(
          typeof backendError === "string"
            ? backendError
            : "Unable to authenticate. Please try again."
        );
      }

      /**
       * Login succeeded.
       *
       * The backend must return something like:
       *
       * {
       *   "user": {
       *     "email": "admin@example.com",
       *     "role": "admin"
       *   }
       * }
       */
      const role = data.user?.role;

      const destination = getRoleDestination(role);

      /**
       * The credentials were accepted, but the account
       * does not have one of the application's valid roles.
       */
      if (!destination) {
        try {
          await fetch(
            "http://localhost:8000/api/logout/",
            {
              method: "POST",
              credentials: "include",
              headers: {
                Accept: "application/json",
              },
            }
          );
        } catch {
          // Ignore logout network errors.
        }

        throw new Error(
          "Your account does not have an authorized application role."
        );
      }

      /**
       * Clear the login form.
       */
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setErrorMessage("");

      /**
       * Redirect according to role.
       *
       * admin    -> /admin/dashboard
       * manager  -> /manager/dashboard
       * director -> /director/dashboard
       */
      router.replace(destination);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to authenticate. Please try again.";

      setPassword("");
      setShowPassword(false);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/30">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />

        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-2xl" />
      </div>

      <div className="relative flex min-h-screen w-full flex-col justify-between p-6 font-sans">

        {/* Header */}
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-base font-black text-white shadow-lg shadow-blue-600/30">
              C
            </div>

            <div>
              <span className="block text-sm font-bold tracking-wider text-slate-100">
                NYUTU LIMITED
              </span>

              <span className="font-mono text-[10px] tracking-wider text-slate-500">
                SECURE ACCESS PORTAL
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 sm:flex">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

            <span className="font-mono text-[10px] tracking-wider text-emerald-400">
              SYSTEM ONLINE
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto my-auto w-full max-w-md space-y-6">

          {/* Date */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-500/20 bg-gradient-to-r from-blue-600/10 to-purple-600/10 px-5 py-2.5 text-xs font-semibold text-blue-400 shadow-lg shadow-blue-600/5 backdrop-blur-sm">
              <span className="text-sm">📅</span>

              <span className="tracking-wider">
                {currentDate || "Loading..."}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="animate-in slide-in-from-top-2 fade-in rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-rose-500/10 p-4 text-sm font-medium leading-relaxed text-red-400 shadow-xl backdrop-blur-sm duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-red-500/20 p-1">
                  <AlertCircle className="h-4 w-4" />
                </div>

                <div className="flex-1">
                  <strong className="mb-1 block text-xs font-bold uppercase tracking-wider">
                    Authentication Error
                  </strong>

                  <span className="text-xs font-normal text-red-300/80">
                    {errorMessage}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Login Card */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

            <div className="relative mb-7 space-y-1.5 text-center">
              <div className="mb-3 flex justify-center">
                <div className="rounded-2xl border border-blue-500/20 bg-blue-600/10 p-3">
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white">
                Welcome Back
              </h2>

              <p className="text-sm font-light text-slate-400">
                Enter your credentials to access your dashboard
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="relative space-y-5"
              autoComplete="off"
            >

              {/* Email */}
              <div className="space-y-2">
                <label
                  className="flex items-center gap-2 text-xs font-medium text-slate-400"
                  htmlFor="email"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email Address
                </label>

                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="name@chuka.com"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    required
                    disabled={isLoading}
                    className="w-full rounded-2xl border border-slate-800/60 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 transition-all duration-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    className="flex items-center gap-2 text-xs font-medium text-slate-400"
                    htmlFor="password"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() =>
                      router.push("/forgot-password")
                    }
                    disabled={isLoading}
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="••••••••••••"
                    autoComplete="off"
                    maxLength={256}
                    required
                    disabled={isLoading}
                    className="w-full rounded-2xl border border-slate-800/60 bg-slate-950/80 py-3 pl-10 pr-14 text-sm text-slate-200 placeholder-slate-600 transition-all duration-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (previous) => !previous
                      )
                    }
                    className="absolute right-3.5 top-1/2 flex -translate-y-1/2 select-none items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          HIDE
                        </span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          SHOW
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="group relative mt-2 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-6 text-sm font-semibold tracking-wider text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />

                    <span>
                      Verifying Access...
                    </span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    Login to Account
                  </span>
                )}
              </Button>

              {/* Security Message */}
              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500">
                  Secure encrypted connection •{" "}
                  {new Date().getFullYear()}
                </p>
              </div>
            </form>
          </div>

          {/* Trust Badges */}
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <div className="h-1 w-1 rounded-full bg-emerald-400" />
              <span>256-bit SSL</span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <div className="h-1 w-1 rounded-full bg-emerald-400" />
              <span>GDPR Compliant</span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <div className="h-1 w-1 rounded-full bg-emerald-400" />
              <span>2FA Ready</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-3 font-mono text-[10px] text-slate-600 sm:flex-row">
            <div className="flex items-center gap-4">
              <span>
                © {new Date().getFullYear()} NYUTU LIMITED
              </span>

              <span className="hidden sm:inline">
                •
              </span>

              <span>
                Authorized Use Only
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-emerald-400/50" />
                Active sessions monitored
              </span>

              <span className="hidden sm:inline">
                •
              </span>

              <span className="cursor-pointer transition-colors hover:text-slate-400">
                Privacy Policy
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

