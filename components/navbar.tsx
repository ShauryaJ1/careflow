'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeSwitcher as ThemeToggle } from '@/components/theme-switcher';
import {
  Activity,
  Home,
  Hospital,
  LogOut,
  User,
  Users,
  Settings,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoleSwitcher } from './role-switcher';

interface UserProfile {
  email: string;
  role: 'patient' | 'provider' | null;
  fullName?: string;
}

export function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Check if user is a provider
          const { data: providerProfile } = await supabase
            .from('provider_profiles')
            .select('id, full_name')
            .eq('id', authUser.id)
            .single();
          
          if (providerProfile) {
            setUser({
              email: authUser.email || '',
              role: 'provider',
              fullName: providerProfile.full_name,
            });
          } else {
            // Check if user is a patient
            const { data: patientProfile } = await supabase
              .from('patient_profiles')
              .select('id, full_name')
              .eq('id', authUser.id)
              .single();
            
            if (patientProfile) {
              setUser({
                email: authUser.email || '',
                role: 'patient',
                fullName: patientProfile.full_name,
              });
            } else {
              setUser({
                email: authUser.email || '',
                role: null,
              });
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'provider') return '/dashboard/provider';
    if (user.role === 'patient') return '/dashboard/patient';
    return '/login';
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      show: true,
    },
    {
      label: 'Dashboard',
      href: getDashboardPath(),
      icon: Activity,
      show: !!user,
    },
    {
      label: 'Find Hospitals',
      href: '/hospitals',
      icon: Hospital,
      show: true,
    },
    {
      label: 'Medical Assistant',
      href: '/chat',
      icon: MessageSquare,
      show: true,
    },
  ];

  // Don't show navbar on auth pages
  const authPages = ['/login', '/auth/login', '/auth/sign-up', '/auth/forgot-password'];
  if (authPages.includes(pathname)) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl"
            >
              <Activity className="h-6 w-6 text-primary" />
              <span>CareFlow</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      pathname === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* Role Switcher - only show if user is logged in */}
            {user && <RoleSwitcher />}

            {/* User Menu */}
            {!isLoading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-9 w-9 rounded-full"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {getInitials(user.fullName, user.email)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.fullName || 'User'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                          {user.role && (
                            <p className="text-xs text-primary capitalize">
                              {user.role}
                            </p>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={getDashboardPath()} className="cursor-pointer">
                          <Activity className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`${getDashboardPath()}#settings`} className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:text-red-600"
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="hidden md:flex items-center gap-2">
                    <Button variant="ghost" asChild>
                      <Link href="/login">Sign in</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/auth/sign-up">Sign up</Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t pb-4 pt-2">
            <div className="flex flex-col gap-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      pathname === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              
              {!user && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <User className="h-4 w-4" />
                    Sign in
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Users className="h-4 w-4" />
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
