import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen w-full">
      <nav className="w-full border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-8 items-center">
            <Link href={"/"} className="font-bold text-lg">CareFlow</Link>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/find-care" className="hover:text-blue-600 transition-colors">Find Care</Link>
              <Link href="/providers" className="hover:text-blue-600 transition-colors">For Providers</Link>
              <Link href="/about" className="hover:text-blue-600 transition-colors">About</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AuthButton />
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

      <div className="w-full">
        {/* Hero Section */}
        <div className="w-full bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background py-20">
          <div className="max-w-7xl mx-auto px-5">
            <div className="flex flex-col gap-16 items-center text-center">
              <div className="flex flex-col gap-6 items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Heart className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
                  Find Healthcare
                  <span className="block text-blue-600">When You Need It</span>
                </h1>
                <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl">
                  Connect with local clinics, urgent care, and telehealth providers instantly.
                  Get the care you need, wherever you are.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/find-care" className="px-8 py-6 text-lg bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center">
                  Find Care Now
                </Link>
                <Link href="/chat" className="px-8 py-6 text-lg border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                  🤖 AI Health Assistant
                </Link>
                <Link href="/providers" className="px-8 py-6 text-lg border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                  For Providers
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full py-20">
          <div className="max-w-7xl mx-auto px-5">
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="mx-auto p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit mb-4">
                    <div className="h-6 w-6 text-green-600">📍</div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Smart Location Search</h3>
                  <p className="text-muted-foreground">
                    Find the closest clinics, pharmacies, and healthcare providers based on your location and needs
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="mx-auto p-3 bg-orange-100 dark:bg-orange-900 rounded-full w-fit mb-4">
                    <div className="h-6 w-6 text-orange-600">⏰</div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Real-Time Wait Times</h3>
                  <p className="text-muted-foreground">
                    See current wait times and book appointments to minimize your time spent waiting
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="mx-auto p-3 bg-purple-100 dark:bg-purple-900 rounded-full w-fit mb-4">
                    <div className="h-6 w-6 text-purple-600">📞</div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Telehealth Ready</h3>
                  <p className="text-muted-foreground">
                    Connect with healthcare providers remotely for consultations and follow-ups
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Emergency Notice */}
        <div className="w-full py-10">
          <div className="max-w-7xl mx-auto px-5">
            <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <CardContent className="flex items-center gap-4 p-6">
                <Shield className="h-8 w-8 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100">Medical Emergency?</h3>
                  <p className="text-red-700 dark:text-red-300">
                    If this is a medical emergency, call 911 immediately. CareFlow is designed for non-emergency healthcare needs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <footer className="w-full border-t border-foreground/10 py-16">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-center text-center text-xs gap-8">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <p>© 2024 CareFlow. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}