"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BuildingIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeIcon,
  ClockIcon,
  HeartIcon,
  ShieldIcon,
  BellIcon,
  UsersIcon,
  SaveIcon,
  LogOutIcon,
  ActivityIcon,
  CalendarIcon,
  StarIcon,
  TrendingUpIcon
} from "lucide-react";
import { ServiceType, ProviderType } from "@/lib/types/database";

interface ProviderProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  provider_id: string | null;
  address: string | null;
  geo_lat: number | null;
  geo_long: number | null;
  preferred_language: string | null;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  } | null;
  provider_name?: string;
  provider_type?: ProviderType;
  services?: ServiceType[];
  languages_spoken?: string[];
  telehealth_available?: boolean;
  accepts_walk_ins?: boolean;
  website?: string;
  insurance_accepted?: string[];
  capacity?: number;
  hours?: any;
  accessibility_features?: string[];
}

const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: "general", label: "General Care" },
  { value: "dental", label: "Dental" },
  { value: "maternal_care", label: "Maternal Care" },
  { value: "urgent_care", label: "Urgent Care" },
  { value: "mental_health", label: "Mental Health" },
  { value: "pediatric", label: "Pediatric" },
  { value: "vaccination", label: "Vaccination" },
  { value: "specialty", label: "Specialty" },
  { value: "diagnostic", label: "Diagnostic" }
];

const PROVIDER_TYPES: { value: ProviderType; label: string }[] = [
  { value: "clinic", label: "Clinic" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "telehealth", label: "Telehealth" },
  { value: "hospital", label: "Hospital" },
  { value: "pop_up", label: "Pop-up Clinic" },
  { value: "mobile", label: "Mobile Unit" },
  { value: "urgent_care", label: "Urgent Care" }
];

export default function ProviderDashboard() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("facility");
  const [newLanguage, setNewLanguage] = useState("");
  const [newInsurance, setNewInsurance] = useState("");
  const [newAccessibility, setNewAccessibility] = useState("");
  const router = useRouter();
  const supabase = createClient();
  
  const updateProfile = trpc.profiles.updateProviderProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
    },
    onError: (error: any) => {
      toast.error(`Error updating profile: ${error.message}`);
    }
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Check if user is a provider
      if (profileData.role !== "provider") {
        router.push("/dashboard/patient");
        return;
      }

      // If provider_id exists, fetch provider details
      let providerData = null;
      if (profileData.provider_id) {
        const { data, error } = await supabase
          .from("providers")
          .select("*")
          .eq("id", profileData.provider_id)
          .single();
        
        if (!error) providerData = data;
      }

      setProfile({
        ...profileData,
        email: user.email || "",
        provider_name: providerData?.name,
        provider_type: providerData?.type,
        services: providerData?.services || [],
        languages_spoken: providerData?.languages_spoken || [],
        telehealth_available: providerData?.telehealth_available,
        accepts_walk_ins: providerData?.accepts_walk_ins,
        website: providerData?.website,
        insurance_accepted: providerData?.insurance_accepted || [],
        capacity: providerData?.capacity,
        hours: providerData?.hours,
        accessibility_features: providerData?.accessibility_features || [],
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        geo_lat: profile.geo_lat,
        geo_long: profile.geo_long,
        preferred_language: profile.preferred_language,
        notification_preferences: profile.notification_preferences,
        provider_name: profile.provider_name,
        provider_type: profile.provider_type,
        services: profile.services,
        languages_spoken: profile.languages_spoken,
        telehealth_available: profile.telehealth_available,
        accepts_walk_ins: profile.accepts_walk_ins,
        website: profile.website,
        insurance_accepted: profile.insurance_accepted,
        capacity: profile.capacity,
        accessibility_features: profile.accessibility_features,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const addItem = (type: 'language' | 'insurance' | 'accessibility') => {
    if (!profile) return;
    
    if (type === 'language' && newLanguage) {
      setProfile({
        ...profile,
        languages_spoken: [...(profile.languages_spoken || []), newLanguage]
      });
      setNewLanguage("");
    } else if (type === 'insurance' && newInsurance) {
      setProfile({
        ...profile,
        insurance_accepted: [...(profile.insurance_accepted || []), newInsurance]
      });
      setNewInsurance("");
    } else if (type === 'accessibility' && newAccessibility) {
      setProfile({
        ...profile,
        accessibility_features: [...(profile.accessibility_features || []), newAccessibility]
      });
      setNewAccessibility("");
    }
  };

  const removeItem = (type: 'language' | 'insurance' | 'accessibility', index: number) => {
    if (!profile) return;
    
    if (type === 'language') {
      const languages = [...(profile.languages_spoken || [])];
      languages.splice(index, 1);
      setProfile({ ...profile, languages_spoken: languages });
    } else if (type === 'insurance') {
      const insurances = [...(profile.insurance_accepted || [])];
      insurances.splice(index, 1);
      setProfile({ ...profile, insurance_accepted: insurances });
    } else if (type === 'accessibility') {
      const features = [...(profile.accessibility_features || [])];
      features.splice(index, 1);
      setProfile({ ...profile, accessibility_features: features });
    }
  };

  const toggleService = (service: ServiceType) => {
    if (!profile) return;
    
    const services = profile.services || [];
    if (services.includes(service)) {
      setProfile({
        ...profile,
        services: services.filter(s => s !== service)
      });
    } else {
      setProfile({
        ...profile,
        services: [...services, service]
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error loading profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Provider Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Welcome back, {profile.full_name || profile.provider_name || "Provider"}!
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                <SaveIcon className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOutIcon className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:w-64">
              <Card>
                <CardContent className="p-4">
                  <nav className="space-y-2">
                    <Button
                      variant={activeTab === "facility" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab("facility")}
                    >
                      <BuildingIcon className="mr-2 h-4 w-4" />
                      Facility Info
                    </Button>
                    <Button
                      variant={activeTab === "services" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab("services")}
                    >
                      <HeartIcon className="mr-2 h-4 w-4" />
                      Services
                    </Button>
                    <Button
                      variant={activeTab === "accessibility" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab("accessibility")}
                    >
                      <UsersIcon className="mr-2 h-4 w-4" />
                      Accessibility
                    </Button>
                    <Button
                      variant={activeTab === "preferences" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab("preferences")}
                    >
                      <BellIcon className="mr-2 h-4 w-4" />
                      Preferences
                    </Button>
                    <Button
                      variant={activeTab === "analytics" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab("analytics")}
                    >
                      <TrendingUpIcon className="mr-2 h-4 w-4" />
                      Analytics
                    </Button>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {activeTab === "facility" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Facility Information</CardTitle>
                    <CardDescription>Update your healthcare facility details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="provider_name">Facility Name</Label>
                        <Input
                          id="provider_name"
                          value={profile.provider_name || ""}
                          onChange={(e) => setProfile({ ...profile, provider_name: e.target.value })}
                          placeholder="City Health Clinic"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="provider_type">Facility Type</Label>
                        <Select
                          value={profile.provider_type || "clinic"}
                          onValueChange={(value: ProviderType) => setProfile({ ...profile, provider_type: value })}
                        >
                          <SelectTrigger id="provider_type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDER_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_name">Contact Person</Label>
                        <Input
                          id="contact_name"
                          value={profile.full_name || ""}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                          placeholder="Dr. Jane Smith"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={profile.email}
                          disabled
                          className="bg-gray-50 dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={profile.phone || ""}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={profile.website || ""}
                          onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                          placeholder="https://www.clinic.com"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Facility Address</Label>
                      <Textarea
                        id="address"
                        value={profile.address || ""}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        placeholder="123 Medical Center Drive, City, State 12345"
                        rows={3}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="capacity">Daily Capacity</Label>
                        <Input
                          id="capacity"
                          type="number"
                          value={profile.capacity || ""}
                          onChange={(e) => setProfile({ ...profile, capacity: parseInt(e.target.value) })}
                          placeholder="100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Service Options</Label>
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="walk_ins"
                              checked={profile.accepts_walk_ins || false}
                              onCheckedChange={(checked) => 
                                setProfile({ ...profile, accepts_walk_ins: checked as boolean })
                              }
                            />
                            <Label htmlFor="walk_ins" className="cursor-pointer">
                              Accepts walk-ins
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="telehealth"
                              checked={profile.telehealth_available || false}
                              onCheckedChange={(checked) => 
                                setProfile({ ...profile, telehealth_available: checked as boolean })
                              }
                            />
                            <Label htmlFor="telehealth" className="cursor-pointer">
                              Telehealth available
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "services" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Services & Insurance</CardTitle>
                    <CardDescription>Manage the services you offer and insurance providers you accept</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Services Offered */}
                    <div className="space-y-3">
                      <Label>Services Offered</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {SERVICE_OPTIONS.map(service => (
                          <div key={service.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={service.value}
                              checked={profile.services?.includes(service.value) || false}
                              onCheckedChange={() => toggleService(service.value)}
                            />
                            <Label htmlFor={service.value} className="cursor-pointer">
                              {service.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Insurance Accepted */}
                    <div className="space-y-3">
                      <Label>Insurance Providers Accepted</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newInsurance}
                          onChange={(e) => setNewInsurance(e.target.value)}
                          placeholder="Add insurance provider"
                          onKeyPress={(e) => e.key === "Enter" && addItem('insurance')}
                        />
                        <Button onClick={() => addItem('insurance')}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.insurance_accepted?.map((insurance, index) => (
                          <Badge key={index} variant="secondary" className="py-1 px-3">
                            <ShieldIcon className="mr-1 h-3 w-3" />
                            {insurance}
                            <button
                              onClick={() => removeItem('insurance', index)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "accessibility" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Accessibility & Languages</CardTitle>
                    <CardDescription>Manage language support and accessibility features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Languages Spoken */}
                    <div className="space-y-3">
                      <Label>Languages Spoken by Staff</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newLanguage}
                          onChange={(e) => setNewLanguage(e.target.value)}
                          placeholder="Add a language"
                          onKeyPress={(e) => e.key === "Enter" && addItem('language')}
                        />
                        <Button onClick={() => addItem('language')}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages_spoken?.map((language, index) => (
                          <Badge key={index} variant="secondary" className="py-1 px-3">
                            <GlobeIcon className="mr-1 h-3 w-3" />
                            {language}
                            <button
                              onClick={() => removeItem('language', index)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Accessibility Features */}
                    <div className="space-y-3">
                      <Label>Accessibility Features</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newAccessibility}
                          onChange={(e) => setNewAccessibility(e.target.value)}
                          placeholder="Add accessibility feature (e.g., Wheelchair ramp)"
                          onKeyPress={(e) => e.key === "Enter" && addItem('accessibility')}
                        />
                        <Button onClick={() => addItem('accessibility')}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.accessibility_features?.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="py-1 px-3">
                            {feature}
                            <button
                              onClick={() => removeItem('accessibility', index)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "preferences" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Manage how you receive updates and patient requests</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label>Notification Channels</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="email_notif"
                            checked={profile.notification_preferences?.email ?? true}
                            onCheckedChange={(checked) => 
                              setProfile({
                                ...profile,
                                notification_preferences: {
                                  ...profile.notification_preferences,
                                  email: checked as boolean,
                                  sms: profile.notification_preferences?.sms ?? false,
                                  push: profile.notification_preferences?.push ?? false
                                }
                              })
                            }
                          />
                          <Label htmlFor="email_notif" className="cursor-pointer">
                            Email notifications for new patient requests
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="sms_notif"
                            checked={profile.notification_preferences?.sms ?? false}
                            onCheckedChange={(checked) => 
                              setProfile({
                                ...profile,
                                notification_preferences: {
                                  ...profile.notification_preferences,
                                  email: profile.notification_preferences?.email ?? true,
                                  sms: checked as boolean,
                                  push: profile.notification_preferences?.push ?? false
                                }
                              })
                            }
                          />
                          <Label htmlFor="sms_notif" className="cursor-pointer">
                            SMS alerts for urgent requests
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="push_notif"
                            checked={profile.notification_preferences?.push ?? false}
                            onCheckedChange={(checked) => 
                              setProfile({
                                ...profile,
                                notification_preferences: {
                                  ...profile.notification_preferences,
                                  email: profile.notification_preferences?.email ?? true,
                                  sms: profile.notification_preferences?.sms ?? false,
                                  push: checked as boolean
                                }
                              })
                            }
                          />
                          <Label htmlFor="push_notif" className="cursor-pointer">
                            Push notifications for real-time updates
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pref_language">Preferred Communication Language</Label>
                      <Select
                        value={profile.preferred_language || "English"}
                        onValueChange={(value) => setProfile({ ...profile, preferred_language: value })}
                      >
                        <SelectTrigger id="pref_language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="Mandarin">Mandarin</SelectItem>
                          <SelectItem value="Arabic">Arabic</SelectItem>
                          <SelectItem value="Hindi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "analytics" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics & Insights</CardTitle>
                    <CardDescription>View your facility&apos;s performance and patient demand</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
                              <p className="text-2xl font-bold">0</p>
                            </div>
                            <ActivityIcon className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Average Rating</p>
                              <p className="text-2xl font-bold">N/A</p>
                            </div>
                            <StarIcon className="h-8 w-8 text-yellow-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                              <p className="text-2xl font-bold">0</p>
                            </div>
                            <CalendarIcon className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUpIcon className="mx-auto h-12 w-12 mb-3 text-gray-400" />
                      <p>Analytics will be available once you start receiving patient requests</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
