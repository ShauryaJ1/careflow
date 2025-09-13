"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MapPin, Users, TrendingUp, Calendar, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Clinic {
  id: string;
  name: string;
  address: string;
  services: string[];
  hours: string;
  capacity: number;
  isActive: boolean;
}

interface ProviderDashboardProps {
  clinics?: Clinic[];
  requests?: Array<{
    id: string;
    serviceType: string;
    location: string;
    urgency: string;
    timestamp: string;
  }>;
}

export default function ProviderDashboard({ clinics = [], requests = [] }: ProviderDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "clinics" | "requests">("overview");
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [newClinic, setNewClinic] = useState({
    name: "",
    address: "",
    services: "",
    hours: "",
    capacity: ""
  });
  const { toast } = useToast();

  const stats = {
    totalClinics: clinics.length,
    activeClinics: clinics.filter(c => c.isActive).length,
    totalRequests: requests.length,
    urgentRequests: requests.filter(r => r.urgency === "high").length
  };

  const handleAddClinic = () => {
    if (!newClinic.name || !newClinic.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in clinic name and address.",
        variant: "destructive"
      });
      return;
    }

    console.log("Adding new clinic:", newClinic);
    // todo: remove mock functionality - integrate with real API

    toast({
      title: "Clinic Added",
      description: "Your clinic has been successfully added to the platform."
    });

    setShowAddClinic(false);
    setNewClinic({ name: "", address: "", services: "", hours: "", capacity: "" });
  };

  const handleEditClinic = (clinicId: string) => {
    console.log("Editing clinic:", clinicId);
    // todo: remove mock functionality - implement edit functionality
  };

  const handleDeleteClinic = (clinicId: string) => {
    console.log("Deleting clinic:", clinicId);
    // todo: remove mock functionality - implement delete functionality
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Provider Dashboard</h1>
          <p className="text-muted-foreground">Manage your clinics and view service demand</p>
        </div>
        <Button onClick={() => setShowAddClinic(true)} data-testid="button-add-clinic">
          <Plus className="w-4 h-4 mr-2" />
          Add Clinic
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-border">
        {[
          { id: "overview", label: "Overview", icon: TrendingUp },
          { id: "clinics", label: "My Clinics", icon: MapPin },
          { id: "requests", label: "Service Requests", icon: Users }
        ].map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? "default" : "ghost"}
            onClick={() => setActiveTab(id as any)}
            data-testid={`button-tab-${id}`}
            className="flex items-center gap-2"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-semibold" data-testid="stat-total-clinics">
                    {stats.totalClinics}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Clinics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-chart-2 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-semibold" data-testid="stat-active-clinics">
                    {stats.activeClinics}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Clinics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-semibold" data-testid="stat-total-requests">
                    {stats.totalRequests}
                  </p>
                  <p className="text-sm text-muted-foreground">Service Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-semibold" data-testid="stat-urgent-requests">
                    {stats.urgentRequests}
                  </p>
                  <p className="text-sm text-muted-foreground">Urgent Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clinics Tab */}
      {activeTab === "clinics" && (
        <div className="space-y-4">
          {clinics.map((clinic) => (
            <Card key={clinic.id} data-testid={`card-clinic-${clinic.id}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{clinic.name}</h3>
                      <Badge variant={clinic.isActive ? "default" : "secondary"}>
                        {clinic.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{clinic.address}</p>
                    <div className="flex flex-wrap gap-1">
                      {clinic.services.map((service, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {clinic.hours} • Capacity: {clinic.capacity} patients
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditClinic(clinic.id)}
                      data-testid={`button-edit-${clinic.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteClinic(clinic.id)}
                      data-testid={`button-delete-${clinic.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {clinics.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Clinics Added</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding your first clinic or mobile health service.
                </p>
                <Button onClick={() => setShowAddClinic(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Clinic
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Service Requests Tab */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} data-testid={`card-request-${request.id}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{request.serviceType}</h4>
                      <Badge 
                        variant={request.urgency === "high" ? "destructive" : 
                                request.urgency === "medium" ? "secondary" : "outline"}
                      >
                        {request.urgency} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      📍 {request.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested {new Date(request.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {requests.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Service Requests</h3>
                <p className="text-muted-foreground">
                  Service requests from patients in your area will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add Clinic Modal */}
      {showAddClinic && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Add New Clinic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinic-name">Clinic Name *</Label>
                <Input
                  id="clinic-name"
                  value={newClinic.name}
                  onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                  placeholder="Enter clinic name"
                  data-testid="input-clinic-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-address">Address *</Label>
                <Input
                  id="clinic-address"
                  value={newClinic.address}
                  onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                  placeholder="Enter full address"
                  data-testid="input-clinic-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-services">Services Offered</Label>
                <Input
                  id="clinic-services"
                  value={newClinic.services}
                  onChange={(e) => setNewClinic({ ...newClinic, services: e.target.value })}
                  placeholder="e.g., Family Medicine, Urgent Care"
                  data-testid="input-clinic-services"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-hours">Operating Hours</Label>
                <Input
                  id="clinic-hours"
                  value={newClinic.hours}
                  onChange={(e) => setNewClinic({ ...newClinic, hours: e.target.value })}
                  placeholder="e.g., Mon-Fri 9AM-5PM"
                  data-testid="input-clinic-hours"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-capacity">Daily Capacity</Label>
                <Input
                  id="clinic-capacity"
                  type="number"
                  value={newClinic.capacity}
                  onChange={(e) => setNewClinic({ ...newClinic, capacity: e.target.value })}
                  placeholder="Number of patients per day"
                  data-testid="input-clinic-capacity"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddClinic} className="flex-1" data-testid="button-save-clinic">
                  Add Clinic
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddClinic(false)}
                  data-testid="button-cancel-clinic"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}