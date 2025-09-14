'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, TrendingUp, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RequestHeatmapProps {
  state?: string;
  city?: string;
  height?: string;
  showControls?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
}

const typeOfCareColors: Record<string, string> = {
  'ER': '#ef4444',
  'urgent_care': '#f59e0b',
  'telehealth': '#3b82f6',
  'clinic': '#10b981',
  'pop_up_clinic': '#8b5cf6',
  'practitioner': '#06b6d4',
};

export default function RequestHeatmap({
  state,
  city,
  height = '400px',
  showControls = true,
  onLocationSelect,
}: RequestHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(30);
  const [selectedCareType, setSelectedCareType] = useState<string>('all');
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Fetch heatmap data
  const { data: heatmapData, isLoading, refetch } = trpc.requests.getRequestHeatmap.useQuery({
    state,
    city,
    daysBack: selectedTimeRange,
  });

  // Initialize map only once on mount
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;
    
    console.log('Initializing map...');
    
    // Default center (Maryland center since we have MD data)
    let defaultCenter: [number, number] = [39.0458, -76.6413]; // Maryland center
    let defaultZoom = 8;
    
    if (city) {
      // Adjust zoom for city view
      defaultZoom = 11;
    }
    
    // Create map
    mapInstance.current = L.map(mapContainer.current).setView(defaultCenter, defaultZoom);
    
    // Add tile layer and wait for it to load
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      opacity: 0.8,
    });
    
    tileLayer.on('load', () => {
      console.log('Map tiles loaded, map is ready');
      setIsMapReady(true);
    });
    
    tileLayer.addTo(mapInstance.current);
    
    // Add click handler if callback provided
    if (onLocationSelect) {
      mapInstance.current.on('click', (e) => {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      });
    }
    
    // Also set ready after a timeout as fallback
    setTimeout(() => {
      setIsMapReady(true);
      console.log('Map ready (timeout fallback)');
    }, 500);
    
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        setIsMapReady(false);
      }
    };
  }, []); // Empty dependency array - only run once on mount
  
  // Update circles when map is ready and data changes
  useEffect(() => {
    if (!isMapReady) {
      console.log('Map not ready yet, waiting...');
      return;
    }
    
    if (!mapInstance.current) {
      console.log('Map instance not available');
      return;
    }
    
    if (!heatmapData || heatmapData.length === 0) {
      console.log('No data to display');
      return;
    }
    
    console.log('✅ Map is ready! Rendering circles:', {
      mapReady: isMapReady,
      mapInstance: !!mapInstance.current,
      dataPoints: heatmapData.length,
      firstPoint: heatmapData[0]
    });
    
    // Remove existing circles layer
    if (circlesLayerRef.current) {
      try {
        mapInstance.current.removeLayer(circlesLayerRef.current);
      } catch (e) {
        console.log('Layer already removed');
      }
      circlesLayerRef.current = null;
    }
    
    // Create new layer group for circles
    circlesLayerRef.current = L.layerGroup();
    
    // Add a test circle to verify rendering works
    try {
      const testCircle = L.circle([39.29, -76.61], { // Baltimore coordinates
        radius: 10000, // 10km radius for visibility
        fillColor: '#ff0000',
        fillOpacity: 0.7,
        color: '#ff0000',
        weight: 5,
        opacity: 1
      });
      testCircle.bindPopup('<strong>TEST CIRCLE</strong><br/>Baltimore - Visible = Map Working');
      testCircle.addTo(circlesLayerRef.current);
      console.log('🔴 Test circle added successfully at Baltimore');
    } catch (error) {
      console.error('Failed to add test circle:', error);
    }
    
    // Filter data by care type if needed
    let filteredData = heatmapData;
    if (selectedCareType !== 'all') {
      filteredData = heatmapData.filter(d => d.typeOfCare === selectedCareType);
    }
    
    console.log('Creating demand visualization with', filteredData.length, 'locations');
    console.log('Sample data points:', filteredData.slice(0, 3));
    
    // Find max intensity for scaling
    const maxIntensity = Math.max(...filteredData.map(d => d.intensity), 1);
    console.log('Max intensity:', maxIntensity);
    
    // Create circles for each data point
    filteredData.forEach((point, index) => {
      // Make circles bigger and more visible
      const radius = 1000 + (point.intensity / maxIntensity) * 4000; // Increased from 500-2500 to 1000-5000
      
      // Get color based on type of care
      const baseColor = typeOfCareColors[point.typeOfCare] || '#ff0000'; // Red as fallback for visibility
      
      // Higher opacity for better visibility (0.4 to 0.9)
      const opacity = 0.4 + (point.intensity / maxIntensity) * 0.5;
      
      if (index < 3) {
        console.log(`Circle ${index}:`, {
          lat: point.lat,
          lng: point.lng,
          radius: radius,
          color: baseColor,
          opacity: opacity,
          intensity: point.intensity
        });
      }
      
      // Create circle with error handling
      try {
        const circle = L.circle([point.lat, point.lng], {
          radius: radius,
          fillColor: baseColor,
          fillOpacity: opacity,
          color: baseColor,
          weight: 3, // Increased from 2
          opacity: Math.min(opacity + 0.3, 1) // Increased border opacity
        });
      
        // Add popup with details
        circle.bindPopup(`
          <div class="p-2">
            <strong>${point.city || 'Unknown City'}, ${point.state}</strong><br/>
            <span>Type: ${point.typeOfCare.replace('_', ' ')}</span><br/>
            <span>Requests: ${point.intensity}</span>
          </div>
        `);
        
        // Add hover effect
        circle.on('mouseover', function() {
          this.setStyle({
            weight: 4,
            opacity: 1,
            fillOpacity: Math.min(opacity + 0.2, 1)
          });
        });
        
        circle.on('mouseout', function() {
          this.setStyle({
            weight: 3,
            opacity: Math.min(opacity + 0.3, 1),
            fillOpacity: opacity
          });
        });
        
        // Add to layer group
        if (circlesLayerRef.current) {
          circle.addTo(circlesLayerRef.current);
        }
      } catch (error) {
        console.error(`Error creating circle for point ${index}:`, error);
      }
    });
    
    // Add layer group to map with a small delay to ensure map is ready
    if (circlesLayerRef.current && filteredData.length > 0) {
      // Use setTimeout to ensure map is fully initialized
      setTimeout(() => {
        if (mapInstance.current && circlesLayerRef.current) {
          try {
            circlesLayerRef.current.addTo(mapInstance.current);
            console.log('Layer group added to map with', filteredData.length, 'circles');
            
            // Fit bounds to show all points
            const bounds = L.latLngBounds(filteredData.map(p => [p.lat, p.lng]));
            mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
            console.log('Map bounds fitted');
            
            // Force a map redraw
            mapInstance.current.invalidateSize();
          } catch (error) {
            console.error('Error adding layer group to map:', error);
          }
        }
      }, 100);
    } else {
      console.log('No circles to add to map');
    }
  }, [heatmapData, selectedCareType, isMapReady]); // Include isMapReady in dependencies
  
  // Calculate statistics
  const stats = {
    totalRequests: heatmapData?.reduce((sum, d) => sum + d.intensity, 0) || 0,
    uniqueLocations: heatmapData?.length || 0,
    topCareType: heatmapData?.reduce((acc, d) => {
      const type = d.typeOfCare || 'unknown';
      acc[type] = (acc[type] || 0) + d.intensity;
      return acc;
    }, {} as Record<string, number>),
  };
  
  const mostRequestedType = Object.entries(stats.topCareType || {})
    .sort(([, a], [, b]) => b - a)[0];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Patient Request Heatmap
        </CardTitle>
        <CardDescription>
          Visualizing demand for healthcare services in your area
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        {showControls && (
          <div className="flex flex-wrap gap-4">
            <Select value={selectedTimeRange.toString()} onValueChange={(v) => setSelectedTimeRange(parseInt(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedCareType} onValueChange={setSelectedCareType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Care type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ER">Emergency Room</SelectItem>
                <SelectItem value="urgent_care">Urgent Care</SelectItem>
                <SelectItem value="telehealth">Telehealth</SelectItem>
                <SelectItem value="clinic">Clinic</SelectItem>
                <SelectItem value="pop_up_clinic">Pop-up Clinic</SelectItem>
                <SelectItem value="practitioner">Practitioner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-xl font-semibold">{stats.totalRequests}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Unique Locations</p>
              <p className="text-xl font-semibold">{stats.uniqueLocations}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Most Requested</p>
              {mostRequestedType && (
                <Badge 
                  className="mt-1"
                  style={{ backgroundColor: typeOfCareColors[mostRequestedType[0]] }}
                >
                  {mostRequestedType[0].replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Map */}
        <div className="relative">
          {/* Always render the map container */}
          <div 
            ref={mapContainer} 
            style={{ height, width: '100%', minHeight: height }} 
            className="rounded-lg overflow-hidden bg-muted"
          />
          
          {/* Show loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading request data...</p>
              </div>
            </div>
          )}
          
          {/* Show no data message */}
          {!isLoading && heatmapData && heatmapData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <p className="text-muted-foreground">No request data available for this area</p>
            </div>
          )}
          
          {/* Show initializing message */}
          {!isMapReady && !isLoading && (
            <div className="absolute top-2 left-2 bg-background/90 px-3 py-1 rounded-md text-sm text-muted-foreground">
              Initializing map...
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Demand Level:</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2" style={{ 
                  backgroundColor: 'rgba(148, 163, 184, 0.3)',
                  borderColor: 'rgba(148, 163, 184, 0.5)'
                }} />
                <span>Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full border-2" style={{ 
                  backgroundColor: 'rgba(148, 163, 184, 0.55)',
                  borderColor: 'rgba(148, 163, 184, 0.75)'
                }} />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-full border-2" style={{ 
                  backgroundColor: 'rgba(148, 163, 184, 0.8)',
                  borderColor: 'rgba(148, 163, 184, 1)'
                }} />
                <span>High</span>
              </div>
            </div>
            {onLocationSelect && (
              <p className="text-muted-foreground">Click on the map to select a location</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Care Types:</span>
            {Object.entries(typeOfCareColors).slice(0, 4).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span>{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
