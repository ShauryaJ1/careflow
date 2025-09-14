"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified login
    router.replace("/login/unified");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}
