import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip middleware check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Define public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/auth/sign-up", "/auth/forgot-password", "/auth/update-password", "/auth/error", "/auth/sign-up-success"];
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`));
  
  if (!user && !isPublicRoute) {
    // no user, redirect to unified login page
    const url = request.nextUrl.clone();
    url.pathname = "/login/unified";
    return NextResponse.redirect(url);
  }
  
  // Redirect logged-in users trying to access login pages to their dashboard
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/login/"))) {
    const url = request.nextUrl.clone();
    
    // Check what profiles the user has
    const [{ data: patientProfile }, { data: providerProfile }] = await Promise.all([
      supabase.from("patient_profiles").select("id").eq("id", user.sub).single(),
      supabase.from("provider_profiles").select("id").eq("id", user.sub).single()
    ]);
    
    // If user has no profiles, create a patient profile by default
    if (!patientProfile && !providerProfile) {
      await supabase.from("patient_profiles").insert({
        id: user.sub,
        full_name: user.email?.split('@')[0] || "User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      url.pathname = "/dashboard/patient";
    } else if (patientProfile) {
      // Default to patient dashboard if they have that profile
      url.pathname = "/dashboard/patient";
    } else {
      url.pathname = "/dashboard/provider";
    }
    
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
