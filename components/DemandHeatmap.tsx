"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, MapPin, Filter, Users, AlertTriangle } from "lucide-react";

interface DemandData {
  location: string;
  county: string;
  serviceType: string;
  requestCount: number;
  urgentCount: number;
  coordinates: { lat: number; lng: number };
}

interface DemandHeatmapProps {
  demandData?: DemandData[];
}

export default function DemandHeatmap({ demandData = [] }: DemandHeatmapProps) {
  const [selectedService, setSelectedService] = useState<string>("all");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("all");

  // Process and filter data
  const filteredData = demandData.filter(item => {
    const serviceMatch = selectedService === "all" || item.serviceType === selectedService;
    const urgencyMatch = selectedUrgency === "all" || 
      (selectedUrgency === "urgent" && item.urgentCount > 0) ||
      (selectedUrgency === "normal" && item.urgentCount === 0);
    return serviceMatch && urgencyMatch;
  });

  // Aggregate data by location
  const locationData = filteredData.reduce((acc, item) => {
    const key = item.location;
    if (!acc[key]) {
      acc[key] = {
        location: item.location,
        county: item.county,
        totalRequests: 0,
        urgentRequests: 0,
        services: new Set<string>(),
        coordinates: item.coordinates
      };
    }
    acc[key].totalRequests += item.requestCount;
    acc[key].urgentRequests += item.urgentCount;
    acc[key].services.add(item.serviceType);
    return acc;
  }, {} as Record<string, any>);

  const aggregatedData = Object.values(locationData).sort((a: any, b: any) => b.totalRequests - a.totalRequests);

  // Get unique service types
  const serviceTypes = Array.from(new Set(demandData.map(item => item.serviceType)));

  const getIntensityColor = (requestCount: number, maxCount: number) => {
    const intensity = requestCount / maxCount;
    if (intensity > 0.7) return "bg-destructive";
    if (intensity > 0.4) return "bg-yellow-500";
    if (intensity > 0.1) return "bg-chart-2";
    return "bg-muted";
  };

  const maxRequests = Math.max(...aggregatedData.map((item: any) => item.totalRequests), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Healthcare Demand Heatmap
        </h2>
        <p className="text-muted-foreground">
          See where healthcare services are needed most
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Service Type:</span>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="w-40" data-testid="select-service-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {serviceTypes.map(service => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">Urgency:</span>
              <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
                <SelectTrigger className="w-32" data-testid="select-urgency-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="urgent">Urgent Only</SelectItem>
                  <SelectItem value="normal">Normal Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedService("all");
                setSelectedUrgency("all");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Geographic Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock Map Area */}
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="text-center space-y-2">
                <MapPin className="w-12 h-12 text-primary mx-auto" />
                <h3 className="font-semibold">Interactive Demand Heatmap</h3>
                <p className="text-sm text-muted-foreground">
                  Showing {aggregatedData.length} locations with service requests
                </p>
              </div>

              {/* Mock heat points */}
              <div className="absolute inset-0 p-8">
                {aggregatedData.slice(0, 6).map((item: any, index) => (
                  <div
                    key={index}
                    className={`absolute w-8 h-8 rounded-full opacity-70 flex items-center justify-center text-white text-xs font-bold ${getIntensityColor(item.totalRequests, maxRequests)}`}
                    style={{
                      left: `${20 + (index % 3) * 30}%`,
                      top: `${20 + Math.floor(index / 3) * 40}%`
                    }}
                    data-testid={`heatmap-point-${index}`}
                  >
                    {item.totalRequests}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-chart-2 rounded"></div>
                <span>Low Demand (1-5 requests)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Medium Demand (6-15 requests)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-destructive rounded"></div>
                <span>High Demand (16+ requests)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Top Demand Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aggregatedData.slice(0, 10).map((item: any, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover-elevate"
                data-testid={`demand-area-${index}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{item.location}</h4>
                    {item.urgentRequests > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {item.urgentRequests} urgent
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.county}</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(item.services).slice(0, 3).map((service: any, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-semibold text-primary">
                    {item.totalRequests}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    requests
                  </div>
                </div>
              </div>
            ))}

            {aggregatedData.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Demand Data</h3>
                <p className="text-muted-foreground">
                  Service request data will appear here as patients submit requests.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-semibold text-primary">
                {aggregatedData.reduce((sum: number, item: any) => sum + item.totalRequests, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-semibold text-destructive">
                {aggregatedData.reduce((sum: number, item: any) => sum + item.urgentRequests, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Urgent Requests</div>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-semibold text-chart-2">
                {aggregatedData.length}
              </div>
              <div className="text-sm text-muted-foreground">Areas with Demand</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}