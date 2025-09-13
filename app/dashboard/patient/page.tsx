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
  ActivityIcon
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

export default function PatientDashboard() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [newCondition, setNewCondition] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const router = useRouter();
  const supabase = createClient();
  
  const updateProfile = trpc.profiles.updatePatientProfile.useMutation({
    onSuccess: () => {
      alert("Profile updated successfully!");
    },
    onError: (error) => {
      alert(`Error updating profile: ${error.message}`);
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

      // Check if user is a patient
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
        <p>Error loading profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Patient Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Welcome back, {profile.full_name || "Patient"}!
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
                      variant={activeTab === "personal" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab("personal")}
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      Personal Info
                    </Button>
                    <Button
                      variant={activeTab === "medical" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab("medical")}
                    >
                      <HeartIcon className="mr-2 h-4 w-4" />
                      Medical History
                    </Button>
                    <Button
                      variant={activeTab === "insurance" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab("insurance")}
                    >
                      <ShieldIcon className="mr-2 h-4 w-4" />
                      Insurance
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
                      variant={activeTab === "requests" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveTab("requests")}
                    >
                      <ClipboardIcon className="mr-2 h-4 w-4" />
                      My Requests
                    </Button>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {activeTab === "personal" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details and contact information</CardDescription>
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
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input
                          id="dob"
                          type="date"
                          value={profile.date_of_birth || ""}
                          onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                        />
                      </div>
                    </div>
                    
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

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emergency_name">Emergency Contact Name</Label>
                        <Input
                          id="emergency_name"
                          value={profile.emergency_contact_name || ""}
                          onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_phone">Emergency Contact Phone</Label>
                        <Input
                          id="emergency_phone"
                          value={profile.emergency_contact_phone || ""}
                          onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
                          placeholder="+1 (555) 987-6543"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "medical" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Medical History</CardTitle>
                    <CardDescription>Manage your medical conditions, medications, and allergies</CardDescription>
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
                    </div>

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
                      <div className="flex flex-wrap gap-2">
                        {profile.current_medications?.map((medication, index) => (
                          <Badge key={index} variant="secondary" className="py-1 px-3">
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
                    </div>

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
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "insurance" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Insurance Information</CardTitle>
                    <CardDescription>Manage your insurance provider details</CardDescription>
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
              )}

              {activeTab === "preferences" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>Customize your language and notification settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
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
                          <Label htmlFor="interpreter" className="cursor-pointer">
                            I need interpreter services
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Notification Preferences</Label>
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
                          <Label htmlFor="sms_notif" className="cursor-pointer">
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
                          <Label htmlFor="push_notif" className="cursor-pointer">
                            Push notifications
                          </Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "requests" && (
                <Card>
                  <CardHeader>
                    <CardTitle>My Service Requests</CardTitle>
                    <CardDescription>View and manage your healthcare service requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <ActivityIcon className="mx-auto h-12 w-12 mb-3 text-gray-400" />
                      <p>No active requests</p>
                      <Button className="mt-4" variant="outline">
                        Find Healthcare Services
                      </Button>
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
