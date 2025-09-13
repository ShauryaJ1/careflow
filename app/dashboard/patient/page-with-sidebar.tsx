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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  CalendarIcon,
  HeartIcon,
  ShieldIcon,
  BellIcon,
  GlobeIcon,
  PillIcon,
  AlertCircleIcon,
  SaveIcon,
  LogOutIcon,
  ClipboardIcon,
  ActivityIcon,
  HomeIcon,
  SettingsIcon,
  HelpCircleIcon
} from "lucide-react";

interface PatientProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  geo_lat: number | null;
  geo_long: number | null;
  date_of_birth: string | null;
  insurance_provider: string | null;
  insurance_member_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_conditions: string[] | null;
  current_medications: string[] | null;
  allergies: string[] | null;
  preferred_language: string | null;
  needs_interpreter: boolean | null;
  accessibility_needs: string[] | null;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  } | null;
}

// Sidebar Component
function PatientSidebar({ profile, onLogout }: { profile: PatientProfile; onLogout: () => void }) {
  const router = useRouter();
  
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 p-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name || profile.email}`} />
            <AvatarFallback>{profile.full_name?.charAt(0) || profile.email.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{profile.full_name || "Patient"}</span>
            <span className="text-xs text-muted-foreground">{profile.email}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#overview">
                    <HomeIcon className="h-4 w-4" />
                    <span>Overview</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#find-care">
                    <MapPinIcon className="h-4 w-4" />
                    <span>Find Care</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#requests">
                    <ClipboardIcon className="h-4 w-4" />
                    <span>My Requests</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Health Profile</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#personal">
                    <UserIcon className="h-4 w-4" />
                    <span>Personal Info</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#medical">
                    <HeartIcon className="h-4 w-4" />
                    <span>Medical History</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#insurance">
                    <ShieldIcon className="h-4 w-4" />
                    <span>Insurance</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#preferences">
                    <SettingsIcon className="h-4 w-4" />
                    <span>Preferences</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#help">
                    <HelpCircleIcon className="h-4 w-4" />
                    <span>Help & Support</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOutIcon className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Profile Completion Component
function ProfileCompletion({ profile }: { profile: PatientProfile }) {
  const fields = [
    profile.full_name,
    profile.phone,
    profile.address,
    profile.date_of_birth,
    profile.insurance_provider,
    profile.emergency_contact_name,
    profile.medical_conditions?.length,
    profile.allergies?.length
  ];
  
  const completed = fields.filter(Boolean).length;
  const total = fields.length;
  const percentage = Math.round((completed / total) * 100);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile Completion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{completed} of {total} fields completed</span>
            <span className="font-semibold">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
          {percentage < 100 && (
            <p className="text-xs text-muted-foreground mt-2">
              Complete your profile for better healthcare recommendations
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EnhancedPatientDashboard() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const router = useRouter();
  const supabase = createClient();
  
  const updateProfile = trpc.profiles.updatePatientProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
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

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (profileData.role !== "patient") {
        router.push("/dashboard/provider");
        return;
      }

      setProfile({
        ...profileData,
        email: user.email || "",
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
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
        date_of_birth: profile.date_of_birth,
        insurance_provider: profile.insurance_provider,
        insurance_member_id: profile.insurance_member_id,
        emergency_contact_name: profile.emergency_contact_name,
        emergency_contact_phone: profile.emergency_contact_phone,
        medical_conditions: profile.medical_conditions,
        current_medications: profile.current_medications,
        allergies: profile.allergies,
        preferred_language: profile.preferred_language,
        needs_interpreter: profile.needs_interpreter,
        accessibility_needs: profile.accessibility_needs,
        notification_preferences: profile.notification_preferences,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const addItem = (type: 'condition' | 'medication' | 'allergy') => {
    if (!profile) return;
    
    if (type === 'condition' && newCondition) {
      setProfile({
        ...profile,
        medical_conditions: [...(profile.medical_conditions || []), newCondition]
      });
      setNewCondition("");
    } else if (type === 'medication' && newMedication) {
      setProfile({
        ...profile,
        current_medications: [...(profile.current_medications || []), newMedication]
      });
      setNewMedication("");
    } else if (type === 'allergy' && newAllergy) {
      setProfile({
        ...profile,
        allergies: [...(profile.allergies || []), newAllergy]
      });
      setNewAllergy("");
    }
  };

  const removeItem = (type: 'condition' | 'medication' | 'allergy', index: number) => {
    if (!profile) return;
    
    if (type === 'condition') {
      const conditions = [...(profile.medical_conditions || [])];
      conditions.splice(index, 1);
      setProfile({ ...profile, medical_conditions: conditions });
    } else if (type === 'medication') {
      const medications = [...(profile.current_medications || [])];
      medications.splice(index, 1);
      setProfile({ ...profile, current_medications: medications });
    } else if (type === 'allergy') {
      const allergies = [...(profile.allergies || [])];
      allergies.splice(index, 1);
      setProfile({ ...profile, allergies: allergies });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load profile. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <PatientSidebar profile={profile} onLogout={handleLogout} />
        
        <main className="flex-1">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold">Patient Dashboard</h1>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-60px)]">
            <div className="container mx-auto p-6 max-w-5xl space-y-6">
              {/* Overview Section */}
              <div id="overview" className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Alert>
                    <HeartIcon className="h-4 w-4" />
                    <AlertTitle>Welcome back, {profile.full_name || "Patient"}!</AlertTitle>
                    <AlertDescription>
                      Your health journey starts here. Find care, manage appointments, and track your health all in one place.
                    </AlertDescription>
                  </Alert>
                </div>
                <ProfileCompletion profile={profile} />
              </div>

              {/* Main Content Tabs */}
              <Tabs defaultValue="personal" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="medical">Medical</TabsTrigger>
                  <TabsTrigger value="insurance">Insurance</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Your contact details and emergency information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input
                            id="full_name"
                            value={profile.full_name || ""}
                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                            placeholder="John Doe"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            value={profile.email}
                            disabled
                            className="bg-muted"
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
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input
                            id="dob"
                            type="date"
                            value={profile.date_of_birth || ""}
                            onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={profile.address || ""}
                          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                          placeholder="123 Main St, City, State 12345"
                          rows={3}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Emergency Contact</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="emergency_name">Contact Name</Label>
                            <Input
                              id="emergency_name"
                              value={profile.emergency_contact_name || ""}
                              onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                              placeholder="Jane Doe"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="emergency_phone">Contact Phone</Label>
                            <Input
                              id="emergency_phone"
                              value={profile.emergency_contact_phone || ""}
                              onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
                              placeholder="+1 (555) 987-6543"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="medical" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Medical History</CardTitle>
                      <CardDescription>Track your conditions, medications, and allergies</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Medical Conditions */}
                      <div className="space-y-3">
                        <Label>Medical Conditions</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newCondition}
                            onChange={(e) => setNewCondition(e.target.value)}
                            placeholder="Add a medical condition"
                            onKeyPress={(e) => e.key === "Enter" && addItem('condition')}
                          />
                          <Button onClick={() => addItem('condition')}>Add</Button>
                        </div>
                        <ScrollArea className="h-24">
                          <div className="flex flex-wrap gap-2">
                            {profile.medical_conditions?.map((condition, index) => (
                              <Badge key={index} variant="secondary" className="py-1 px-3">
                                {condition}
                                <button
                                  onClick={() => removeItem('condition', index)}
                                  className="ml-2 text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <Separator />

                      {/* Current Medications */}
                      <div className="space-y-3">
                        <Label>Current Medications</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newMedication}
                            onChange={(e) => setNewMedication(e.target.value)}
                            placeholder="Add a medication"
                            onKeyPress={(e) => e.key === "Enter" && addItem('medication')}
                          />
                          <Button onClick={() => addItem('medication')}>Add</Button>
                        </div>
                        <ScrollArea className="h-24">
                          <div className="flex flex-wrap gap-2">
                            {profile.current_medications?.map((medication, index) => (
                              <Badge key={index} variant="outline" className="py-1 px-3">
                                <PillIcon className="mr-1 h-3 w-3" />
                                {medication}
                                <button
                                  onClick={() => removeItem('medication', index)}
                                  className="ml-2 text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <Separator />

                      {/* Allergies */}
                      <div className="space-y-3">
                        <Label>Allergies</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newAllergy}
                            onChange={(e) => setNewAllergy(e.target.value)}
                            placeholder="Add an allergy"
                            onKeyPress={(e) => e.key === "Enter" && addItem('allergy')}
                          />
                          <Button onClick={() => addItem('allergy')}>Add</Button>
                        </div>
                        <ScrollArea className="h-24">
                          <div className="flex flex-wrap gap-2">
                            {profile.allergies?.map((allergy, index) => (
                              <Badge key={index} variant="destructive" className="py-1 px-3">
                                <AlertCircleIcon className="mr-1 h-3 w-3" />
                                {allergy}
                                <button
                                  onClick={() => removeItem('allergy', index)}
                                  className="ml-2 text-white hover:text-gray-200"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insurance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Insurance Information</CardTitle>
                      <CardDescription>Your insurance provider details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="insurance_provider">Insurance Provider</Label>
                        <Input
                          id="insurance_provider"
                          value={profile.insurance_provider || ""}
                          onChange={(e) => setProfile({ ...profile, insurance_provider: e.target.value })}
                          placeholder="Blue Cross Blue Shield"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="insurance_id">Member ID</Label>
                        <Input
                          id="insurance_id"
                          value={profile.insurance_member_id || ""}
                          onChange={(e) => setProfile({ ...profile, insurance_member_id: e.target.value })}
                          placeholder="ABC123456789"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preferences" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Preferences</CardTitle>
                      <CardDescription>Customize your experience</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="language">Preferred Language</Label>
                          <Select
                            value={profile.preferred_language || "English"}
                            onValueChange={(value) => setProfile({ ...profile, preferred_language: value })}
                          >
                            <SelectTrigger id="language">
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
                        <div className="space-y-2">
                          <Label>Interpreter Services</Label>
                          <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                              id="interpreter"
                              checked={profile.needs_interpreter || false}
                              onCheckedChange={(checked) => 
                                setProfile({ ...profile, needs_interpreter: checked as boolean })
                              }
                            />
                            <Label htmlFor="interpreter" className="cursor-pointer font-normal">
                              I need interpreter services
                            </Label>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Notification Preferences</h3>
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
                            <Label htmlFor="email_notif" className="cursor-pointer font-normal">
                              Email notifications
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
                            <Label htmlFor="sms_notif" className="cursor-pointer font-normal">
                              SMS notifications
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
                            <Label htmlFor="push_notif" className="cursor-pointer font-normal">
                              Push notifications
                            </Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Quick Actions */}
              <Card id="find-care">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Access healthcare services</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <MapPinIcon className="h-6 w-6" />
                    <span>Find Nearby Care</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <CalendarIcon className="h-6 w-6" />
                    <span>Book Appointment</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <ActivityIcon className="h-6 w-6" />
                    <span>View Health Records</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </main>
      </div>
    </SidebarProvider>
  );
}
