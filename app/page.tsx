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

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    setCurrentDate(new Date().toLocaleDateString("en-US", options));
  }, []);

  const getRoleDestination = (role: unknown): string | null => {
    if (typeof role !== "string") {
      return null;
    }

    switch (role.trim().toLowerCase()) {
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

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
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
      const response = await fetch(`${API_URL}/login/`, {
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
      });

      let data: LoginResponse = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The authentication server returned an invalid response."
        );
      }

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

      const role = data.user?.role;
      const destination = getRoleDestination(role);

      if (!destination) {
        try {
          await fetch(`${API_URL}/logout/`, {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          });
        } catch {
          // Ignore logout network errors.
        }

        throw new Error(
          "Your account does not have an authorized application role."
        );
      }

      setEmail("");
      setPassword("");
      setShowPassword(false);
      setErrorMessage("");

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
    <main className="relative min-h-dvh overflow-x-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/30 text-white">
      {/* Background Effects */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-2xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-sm font-black text-white shadow-lg shadow-blue-600/30 sm:h-10 sm:w-10 sm:text-base">
              C
            </div>

            <div>
              <span className="block text-xs font-bold tracking-wider text-slate-100 sm:text-sm">
                NYUTU LIMITED
              </span>

              <span className="font-mono text-[9px] tracking-wider text-slate-500 sm:text-[10px]">
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
        </header>

        {/* Main */}
        <section className="flex flex-1 items-center justify-center py-6 sm:py-8">
          <div className="w-full max-w-md">
            {/* Date */}
            <div className="mb-5 flex justify-center sm:mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-gradient-to-r from-blue-600/10 to-purple-600/10 px-4 py-2 text-[11px] font-semibold text-blue-400 shadow-lg shadow-blue-600/5 backdrop-blur-sm sm:px-5 sm:py-2.5 sm:text-xs">
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
                className="mb-5 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-rose-500/10 p-3.5 text-sm font-medium leading-relaxed text-red-400 shadow-xl backdrop-blur-sm sm:mb-6 sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-red-500/20 p-1">
                    <AlertCircle className="h-4 w-4" />
                  </div>

                  <div className="flex-1">
                    <strong className="mb-1 block text-[11px] font-bold uppercase tracking-wider">
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
            <div className="group relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl sm:p-7 lg:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              />

              <div className="relative mb-5 space-y-1 text-center sm:mb-6">
                <div className="mb-2.5 flex justify-center">
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-600/10 p-2.5 sm:p-3">
                    <Shield className="h-5 w-5 text-blue-400 sm:h-6 sm:w-6" />
                  </div>
                </div>

                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Welcome Back
                </h1>

                <p className="text-xs font-light text-slate-400 sm:text-sm">
                  Enter your credentials to access your dashboard
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="relative space-y-4 sm:space-y-5"
                autoComplete="off"
              >
                {/* Email */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label
                    className="flex items-center gap-2 text-[11px] font-medium text-slate-400 sm:text-xs"
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
                      className="w-full rounded-2xl border border-slate-800/60 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 transition-all duration-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
                    />

                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      className="flex items-center gap-2 text-[11px] font-medium text-slate-400 sm:text-xs"
                      htmlFor="password"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-[11px] font-medium text-blue-400 transition-colors hover:text-blue-300 hover:underline disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
                      onClick={() => router.push("/forgot-password")}
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
                      className="w-full rounded-2xl border border-slate-800/60 bg-slate-950/80 py-2.5 pl-10 pr-14 text-sm text-slate-200 placeholder-slate-600 transition-all duration-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
                    />

                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((previous) => !previous)
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

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="group relative mt-1 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-5 text-sm font-semibold tracking-wider text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:opacity-50 sm:py-6"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
                  />

                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />

                      <span>Verifying Access...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Shield className="h-4 w-4" />
                      Login to Account
                    </span>
                  )}
                </Button>

                {/* Security Message */}
                <div className="pt-1 text-center sm:pt-2">
                  <p className="text-[10px] text-slate-500 sm:text-xs">
                    Secure encrypted connection • {currentYear}
                  </p>
                </div>
              </form>
            </div>

            {/* Trust Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:mt-5 sm:gap-6">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="h-1 w-1 rounded-full bg-emerald-400" />
                <span>Secure Connection</span>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="h-1 w-1 rounded-full bg-emerald-400" />
                <span>Protected Access</span>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="h-1 w-1 rounded-full bg-emerald-400" />
                <span>2FA Ready</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="shrink-0 pt-3 sm:pt-4">
          <div className="flex flex-col items-center justify-between gap-2.5 font-mono text-[9px] text-slate-600 sm:flex-row sm:text-[10px]">
            <div className="flex items-center gap-3 sm:gap-4">
              <span>© {currentYear} NYUTU LIMITED</span>

              <span className="hidden sm:inline">•</span>

              <span>Authorized Use Only</span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <span className="flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-emerald-400/50" />
                Active sessions monitored
              </span>

              <span className="hidden sm:inline">•</span>

              <button
                type="button"
                className="transition-colors hover:text-slate-400"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

