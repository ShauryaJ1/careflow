"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { insertServiceRequestSchema, ServiceRequest } from "@shared/schema";
import { z } from "zod";

type ServiceRequestData = z.infer<typeof insertServiceRequestSchema>;

interface ServiceRequestFormProps {
  onSubmit?: (request: ServiceRequestData) => void;
}

export default function ServiceRequestForm({ onSubmit }: ServiceRequestFormProps) {
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("");
  const [location, setLocation] = useState("");
  const [contactMethod, setContactMethod] = useState("");

  // API mutation for creating service requests
  const createServiceRequest = useMutation<ServiceRequest, Error, ServiceRequestData>({
    mutationFn: async (data: ServiceRequestData) => {
      const response = await apiRequest("POST", "/api/service-requests", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Request Submitted Successfully!",
        description: "Healthcare providers in your area have been notified of your request.",
      });
      
      // Reset form
      setServiceType("");
      setDescription("");
      setUrgency("");
      setLocation("");
      setContactMethod("");
      
      onSubmit?.(data);
      
      // Invalidate service requests cache for future provider dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Unable to submit request. Please try again.",
        variant: "destructive"
      });
    }
  });
  const { toast } = useToast();

  const serviceTypes = [
    "Family Medicine",
    "Urgent Care", 
    "Dental Care",
    "Mental Health",
    "Maternal Health",
    "Pediatric Care",
    "Chronic Disease Management",
    "Vaccinations",
    "Health Screenings",
    "Pharmacy Services"
  ];

  const urgencyLevels = [
    { value: "low", label: "Not Urgent", color: "default" },
    { value: "medium", label: "Moderately Urgent", color: "secondary" }, 
    { value: "high", label: "Urgent", color: "destructive" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serviceType || !urgency || !location) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const requestData: ServiceRequestData = {
      serviceType,
      description: description || undefined, // Convert empty string to undefined
      urgency,
      location,
      contactMethod: contactMethod || undefined, // Convert empty string to undefined
      locationLat: undefined, // TODO: Add geolocation support
      locationLng: undefined, // TODO: Add geolocation support
    };

    createServiceRequest.mutate(requestData);
  };

  const getCurrentLocation = () => {
    console.log("Getting current location...");
    // todo: remove mock functionality - integrate with browser geolocation
    setLocation("Current Location (Auto-detected)");
    toast({
      title: "Location Detected",
      description: "Your current location has been added to the request."
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Request Healthcare Service
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Need something that's not available nearby? Let local providers know what's needed in your area.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="service-type">Type of Service Needed *</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger data-testid="select-service-type">
                <SelectValue placeholder="Select a healthcare service" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe your specific needs or any additional information..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
              data-testid="textarea-description"
            />
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label>Urgency Level *</Label>
            <div className="flex gap-2 flex-wrap">
              {urgencyLevels.map((level) => (
                <Badge
                  key={level.value}
                  variant={urgency === level.value ? "default" : "outline"}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setUrgency(level.value)}
                  data-testid={`badge-urgency-${level.value}`}
                >
                  {level.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Your Location *</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="Enter city, ZIP code, or address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1"
                data-testid="input-location"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={getCurrentLocation}
                data-testid="button-detect-location"
              >
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Contact Method */}
          <div className="space-y-2">
            <Label htmlFor="contact">Preferred Contact Method (Optional)</Label>
            <Select value={contactMethod} onValueChange={setContactMethod}>
              <SelectTrigger data-testid="select-contact-method">
                <SelectValue placeholder="How should providers reach you?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="text">Text Message</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="app">Through this app</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={createServiceRequest.isPending}
            data-testid="button-submit-request"
          >
            {createServiceRequest.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Service Request
              </>
            )}
          </Button>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Why submit a request?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Shows providers where to set up new clinics</li>
            <li>• Helps plan mobile clinic schedules</li>
            <li>• Anonymous by default</li>
            <li>• Real impact on healthcare availability</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}