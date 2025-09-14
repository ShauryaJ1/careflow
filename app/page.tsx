"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Navigation, Phone, MapPin, Clock, Satellite, LayoutGrid } from "lucide-react";

export default function Home() {
  const emergencyClick = () => {
    // Keep ER action directing to the hospitals map for now
    window.location.href = "/hospitals";
  };

  return (
    <div className="min-h-screen">
      {/* Emergency banner */}
      <div className="border-b bg-destructive/5">
        <div className="container mx-auto px-4 py-3">
          <Alert variant="destructive" className="border-0 bg-transparent p-0">
            <AlertTitle className="sr-only">Emergency</AlertTitle>
            <AlertDescription className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <span>If this is a medical emergency, call 911 immediately.</span>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={emergencyClick}>
                  <Navigation className="mr-2 h-4 w-4" /> Nearest ER
                </Button>
                <Button asChild variant="outline">
                  <a href="tel:911"><Phone className="mr-2 h-4 w-4" /> Call 911</a>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-10 pb-8">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Smart, location-aware care routing
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Access the right care, faster
            </h1>
            <p className="mt-3 text-muted-foreground">
              CareFlow helps patients find nearby care and helps providers balance demand using maps, travel time, and live availability.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild>
                <Link href="/login">Sign in to begin</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/sign-up">Create account</Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary">Patients</Badge>
              <span>•</span>
              <Badge variant="outline">Providers</Badge>
              <span>•</span>
              <span>Realtime updates via Supabase</span>
            </div>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>What we provide</CardTitle>
                <CardDescription>Built for patients and providers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <div className="font-medium">Location-based search</div>
                      <p className="text-sm text-muted-foreground">Find ER, urgent care, clinics, and pop-ups near you.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <div className="font-medium">Shortest-time routing</div>
                      <p className="text-sm text-muted-foreground">Combines travel time and wait signals to rank options.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Satellite className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <div className="font-medium">Offline-ready</div>
                      <p className="text-sm text-muted-foreground">PWA caching and graceful fallbacks for rural coverage.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <LayoutGrid className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <div className="font-medium">Provider tools</div>
                      <p className="text-sm text-muted-foreground">Post pop-ups, manage capacity, and view demand heatmaps.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Sign in</CardTitle>
              <CardDescription>Create an account or log in</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Secure access for patients and providers via Supabase Auth.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Share needs</CardTitle>
              <CardDescription>Guided intake after login</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              After signing in, describe symptoms or services to tailor results.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. See ranked options</CardTitle>
              <CardDescription>Directions and booking</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Get the fastest in-person route or start a telehealth visit when available.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Get started CTA */}
      <section className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Log in to begin or create a new account</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground flex items-center justify-between">
          <span>© {new Date().getFullYear()} CareFlow</span>
          <div className="flex items-center gap-4">
            <Link href="/hospitals" className="hover:underline">Find hospitals</Link>
            <Link href="/login" className="hover:underline">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
