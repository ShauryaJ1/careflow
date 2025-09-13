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
import { UserIcon, ArrowLeftIcon, HeartIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function PatientLoginPage() {
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

      // Check if user is a patient
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.role !== "patient") {
        await supabase.auth.signOut();
        throw new Error("This login is for patients only. Please use the provider login.");
      }

      // Redirect to patient dashboard
      router.push("/dashboard/patient");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link href="/login">
          <Button
            variant="ghost"
            className="mb-4 hover:bg-blue-50 dark:hover:bg-gray-800"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to selection
          </Button>
        </Link>

        <Card className="border-2">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mx-auto mb-4 p-4 bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center"
            >
              <UserIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </motion.div>
            <CardTitle className="text-2xl">Patient Login</CardTitle>
            <CardDescription>
              Access your healthcare services and medical records
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
                    placeholder="patient@example.com"
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login as Patient"}
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
                  Sign up to access healthcare services
                </p>
                <Link href="/auth/sign-up?role=patient">
                  <Button variant="outline" className="w-full">
                    Create Patient Account
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                <HeartIcon className="h-3 w-3" />
                <span>Your health, our priority</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
