import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Stethoscope, Users, Menu, X } from "lucide-react";

interface NavigationProps {
  userRole: "patient" | "provider";
  onRoleChange: (role: "patient" | "provider") => void;
}

export default function Navigation({ userRole, onRoleChange }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-card border-b border-card-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">Carebridge</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Label htmlFor="role-switch" className="text-sm">
                {userRole === "patient" ? "Patient" : "Provider"}
              </Label>
              <Switch
                id="role-switch"
                checked={userRole === "provider"}
                onCheckedChange={(checked) => onRoleChange(checked ? "provider" : "patient")}
                data-testid="switch-role-toggle"
              />
            </div>
            
            {userRole === "patient" ? (
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" data-testid="button-find-clinics">
                  <MapPin className="w-4 h-4 mr-2" />
                  Find Clinics
                </Button>
                <Button variant="ghost" size="sm" data-testid="button-request-service">
                  Request Service
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" data-testid="button-manage-clinics">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Clinics
                </Button>
                <Button variant="ghost" size="sm" data-testid="button-view-demand">
                  View Demand
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-card-border">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-role-switch" className="text-sm">
                  {userRole === "patient" ? "Patient Mode" : "Provider Mode"}
                </Label>
                <Switch
                  id="mobile-role-switch"
                  checked={userRole === "provider"}
                  onCheckedChange={(checked) => onRoleChange(checked ? "provider" : "patient")}
                />
              </div>
              
              {userRole === "patient" ? (
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" className="justify-start">
                    <MapPin className="w-4 h-4 mr-2" />
                    Find Clinics
                  </Button>
                  <Button variant="ghost" className="justify-start">
                    Request Service
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" className="justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Clinics
                  </Button>
                  <Button variant="ghost" className="justify-start">
                    View Demand
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}