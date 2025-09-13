import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <a
        href="/login"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-8 px-3 border bg-white dark:bg-gray-800 text-black dark:text-white shadow-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer z-50 relative"
        style={{ pointerEvents: 'auto' }}
      >
        Sign in
      </a>
      <a
        href="/login"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-8 px-3 bg-blue-600 text-white shadow-xs hover:bg-blue-700 cursor-pointer z-50 relative"
        style={{ pointerEvents: 'auto' }}
      >
        Sign up
      </a>
    </div>
  );
}
