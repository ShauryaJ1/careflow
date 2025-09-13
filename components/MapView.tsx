"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search, Crosshair, Filter } from "lucide-react";

interface MapViewProps {
  clinics: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    services: string[];
    isOpen: boolean;
  }>;
  onClinicSelect?: (clinicId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}

export default function MapView({ clinics, onClinicSelect, userLocation }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [searchLocation, setSearchLocation] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  // Mock map implementation for prototype
  useEffect(() => {
    if (mapRef.current) {
      console.log("Map initialized with", clinics.length, "clinics");
      // todo: remove mock functionality - integrate with real Leaflet map
    }
  }, [clinics]);

  const handleLocationSearch = () => {
    console.log("Searching for location:", searchLocation);
    // todo: remove mock functionality - integrate with geocoding API
  };

  const handleCurrentLocation = () => {
    setIsLocating(true);
    console.log("Getting current location...");
    // todo: remove mock functionality - integrate with browser geolocation API
    setTimeout(() => {
      setIsLocating(false);
      console.log("Location found");
    }, 2000);
  };

  const toggleServiceFilter = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
    console.log("Service filter toggled:", service);
  };

  const allServices = Array.from(new Set(clinics.flatMap(c => c.services)));

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Location Search */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter city, ZIP code, or address"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="pl-10"
                  data-testid="input-location-search"
                />
              </div>
              <Button 
                onClick={handleLocationSearch}
                data-testid="button-search-location"
                className="bg-primary hover:bg-primary/90"
              >
                Search
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleCurrentLocation}
                disabled={isLocating}
                data-testid="button-current-location"
              >
                <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Service Filters */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by Services:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allServices.slice(0, 6).map((service) => (
                  <Badge
                    key={service}
                    variant={selectedServices.includes(service) ? "default" : "outline"}
                    className="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => toggleServiceFilter(service)}
                    data-testid={`badge-filter-${service.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Active Filters */}
            {selectedServices.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedServices.map((service) => (
                    <Badge 
                      key={service} 
                      variant="secondary" 
                      className="cursor-pointer"
                      onClick={() => toggleServiceFilter(service)}
                    >
                      {service} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <div className="flex-1 relative bg-muted rounded-lg overflow-hidden">
        <div 
          ref={mapRef}
          className="w-full h-full flex items-center justify-center"
          data-testid="map-container"
        >
          {/* Mock Map Display */}
          <div className="text-center space-y-4">
            <MapPin className="w-16 h-16 text-primary mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Interactive Map</h3>
              <p className="text-sm text-muted-foreground">
                Showing {clinics.length} clinics in your area
              </p>
              {userLocation && (
                <p className="text-xs text-muted-foreground mt-2">
                  📍 Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
              {clinics.slice(0, 4).map((clinic) => (
                <Button
                  key={clinic.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onClinicSelect?.(clinic.id)}
                  className="text-xs"
                  data-testid={`button-map-clinic-${clinic.id}`}
                >
                  📍 {clinic.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-chart-2 rounded-full"></div>
              <span>Open Clinics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
              <span>Closed Clinics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span>Your Location</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}