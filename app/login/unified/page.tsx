"use client";

import { createClient } from "@/lib/supabase/client";
import { validateEmail, sanitizeEmail } from "@/lib/utils/validation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserIcon, ArrowLeftIcon, HeartIcon, ShieldIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function UnifiedLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    // Validate and sanitize email
    const sanitizedEmail = sanitizeEmail(email);
    if (!validateEmail(sanitizedEmail)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });
      
      if (authError) throw authError;

      // Check what profiles the user has
      const [{ data: patientProfile }, { data: providerProfile }] = await Promise.all([
        supabase.from("patient_profiles").select("id").eq("id", authData.user.id).single(),
        supabase.from("provider_profiles").select("id").eq("id", authData.user.id).single()
      ]);

      // Redirect to appropriate dashboard or let user choose
      if (patientProfile && providerProfile) {
        // User has both roles, redirect to patient dashboard by default
        // They can switch roles from the navbar
        router.push("/dashboard/patient");
      } else if (patientProfile) {
        router.push("/dashboard/patient");
      } else if (providerProfile) {
        router.push("/dashboard/provider");
      } else {
        // No profile exists, create a patient profile by default
        router.push("/dashboard/patient");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link href="/">
          <Button
            variant="ghost"
            className="mb-4 hover:bg-blue-50 dark:hover:bg-gray-800"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to home
          </Button>
        </Link>

        <Card className="border-2">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mx-auto mb-4 p-4 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900 dark:to-green-900 rounded-full w-16 h-16 flex items-center justify-center"
            >
              <ShieldIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </motion.div>
            <CardTitle className="text-2xl">Welcome to CareFlow</CardTitle>
            <CardDescription>
              Sign in to access all features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => {
                      const sanitized = sanitizeEmail(e.target.value);
                      if (sanitized !== e.target.value) {
                        setEmail(sanitized);
                      }
                    }}
                    className="border-2 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-2 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
                  >
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </motion.div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </form>

            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">
                    New to CareFlow?
                  </span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create an account to get started
                </p>
                <Link href="/auth/sign-up">
                  <Button variant="outline" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                <HeartIcon className="h-3 w-3" />
                <span>Your health, our priority</span>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500 mt-4">
                  Once logged in, you can access both patient and provider features
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
