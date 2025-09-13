"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { validateEmail, validatePassword, sanitizeEmail } from "@/lib/utils/validation";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
  role?: "patient" | "provider";
}

export function SignUpForm({
  className,
  role = "patient",
  ...props
}: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [providerName, setProviderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    // Validate email
    const sanitizedEmail = sanitizeEmail(email);
    if (!validateEmail(sanitizedEmail)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(". "));
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const metadata: any = {
        role,
        full_name: fullName,
      };
      
      if (role === "provider" && providerName) {
        metadata.provider_name = providerName;
        metadata.provider_type = "clinic";
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/${role}`,
          data: metadata,
        },
      });
      
      if (error) {
        // Check for specific error types
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          throw new Error(`This email is already registered. Please login instead or use a different email.`);
        }
        throw error;
      }
      
      // Auto-login after signup (naive auth - no email verification)
      if (data?.user) {
        // Try to sign in immediately after signup
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password,
        });
        
        if (signInError) {
          throw new Error("Account created but failed to sign in. Please try logging in manually.");
        }
        
        // Redirect to appropriate dashboard
        router.push(`/dashboard/${role}`);
      } else {
        throw new Error("An unexpected error occurred during sign-up.");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up as {role === "provider" ? "Provider" : "Patient"}</CardTitle>
          <CardDescription>
            {role === "provider" 
              ? "Register your healthcare facility" 
              : "Create your patient account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              {role === "provider" && (
                <div className="grid gap-2">
                  <Label htmlFor="providerName">Facility Name</Label>
                  <Input
                    id="providerName"
                    type="text"
                    placeholder="City Health Clinic"
                    required
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={role === "provider" ? "provider@clinic.com" : "patient@example.com"}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => {
                      const sanitized = sanitizeEmail(e.target.value);
                      if (sanitized !== e.target.value) {
                        setEmail(sanitized);
                      }
                    }}
                  />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : `Sign up as ${role === "provider" ? "Provider" : "Patient"}`}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href={`/login/${role}`} className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
