"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  UserIcon, 
  BuildingIcon, 
  ChevronDownIcon,
  ArrowLeftRightIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface RoleSwitcherProps {
  className?: string;
}

export function RoleSwitcher({ className }: RoleSwitcherProps) {
  const [currentRole, setCurrentRole] = useState<"patient" | "provider" | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkUserRoles();
  }, []);

  useEffect(() => {
    // Update current role based on pathname
    if (pathname?.includes("/dashboard/patient")) {
      setCurrentRole("patient");
    } else if (pathname?.includes("/dashboard/provider")) {
      setCurrentRole("provider");
    }
  }, [pathname]);

  const checkUserRoles = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check what profiles the user has
    const [{ data: patientProfile }, { data: providerProfile }] = await Promise.all([
      supabase.from("patient_profiles").select("id").eq("id", user.id).single(),
      supabase.from("provider_profiles").select("id").eq("id", user.id).single()
    ]);

    const roles = [];
    if (patientProfile) roles.push("patient");
    if (providerProfile) roles.push("provider");

    // If user has no profiles, create a patient profile by default
    if (roles.length === 0) {
      await supabase.from("patient_profiles").insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || "User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      roles.push("patient");
    }

    setAvailableRoles(roles);
    
    // Set current role based on pathname or default to first available
    if (pathname?.includes("/dashboard/patient") && roles.includes("patient")) {
      setCurrentRole("patient");
    } else if (pathname?.includes("/dashboard/provider") && roles.includes("provider")) {
      setCurrentRole("provider");
    } else {
      setCurrentRole(roles[0] as "patient" | "provider");
    }
    
    setIsLoading(false);
  };

  const switchRole = async (role: "patient" | "provider") => {
    if (role === currentRole) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Check if user has the profile for the role they're switching to
    if (role === "provider") {
      const { data: providerProfile } = await supabase
        .from("provider_profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!providerProfile) {
        // Create provider profile if it doesn't exist
        await supabase.from("provider_profiles").insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || "Provider",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Refresh available roles
        await checkUserRoles();
      }
    } else if (role === "patient") {
      const { data: patientProfile } = await supabase
        .from("patient_profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!patientProfile) {
        // Create patient profile if it doesn't exist
        await supabase.from("patient_profiles").insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || "Patient",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Refresh available roles
        await checkUserRoles();
      }
    }

    // Navigate to the appropriate dashboard
    router.push(`/dashboard/${role}`);
    setCurrentRole(role);
  };

  const addProviderAccess = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Create provider profile
    await supabase.from("provider_profiles").insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || "Provider",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Refresh roles and switch to provider
    await checkUserRoles();
    await switchRole("provider");
  };

  const addPatientAccess = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Create patient profile
    await supabase.from("patient_profiles").insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || "Patient",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Refresh roles and switch to patient
    await checkUserRoles();
    await switchRole("patient");
  };

  if (isLoading) {
    return null;
  }

  // Don't show switcher on non-dashboard pages
  if (!pathname?.includes("/dashboard")) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            {currentRole === "patient" ? (
              <>
                <UserIcon className="h-4 w-4" />
                <span>Patient</span>
              </>
            ) : (
              <>
                <BuildingIcon className="h-4 w-4" />
                <span>Provider</span>
              </>
            )}
            <ChevronDownIcon className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Switch Dashboard</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {availableRoles.includes("patient") && (
            <DropdownMenuItem 
              onClick={() => switchRole("patient")}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                currentRole === "patient" && "bg-accent"
              )}
            >
              <UserIcon className="h-4 w-4" />
              <span>Patient Dashboard</span>
              {currentRole === "patient" && (
                <Badge variant="secondary" className="ml-auto">Current</Badge>
              )}
            </DropdownMenuItem>
          )}
          
          {availableRoles.includes("provider") && (
            <DropdownMenuItem 
              onClick={() => switchRole("provider")}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                currentRole === "provider" && "bg-accent"
              )}
            >
              <BuildingIcon className="h-4 w-4" />
              <span>Provider Dashboard</span>
              {currentRole === "provider" && (
                <Badge variant="secondary" className="ml-auto">Current</Badge>
              )}
            </DropdownMenuItem>
          )}

          {!availableRoles.includes("provider") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={addProviderAccess}
                className="flex items-center gap-2 cursor-pointer text-blue-600 dark:text-blue-400"
              >
                <ArrowLeftRightIcon className="h-4 w-4" />
                <span>Enable Provider Access</span>
              </DropdownMenuItem>
            </>
          )}

          {!availableRoles.includes("patient") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={addPatientAccess}
                className="flex items-center gap-2 cursor-pointer text-green-600 dark:text-green-400"
              >
                <UserIcon className="h-4 w-4" />
                <span>Enable Patient Access</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
