'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Hospital } from '@/lib/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Globe, Clock } from 'lucide-react';
import { getHospitalCoordinates, KNOWN_HOSPITAL_COORDINATES } from '@/lib/utils/geocoding';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface HospitalWithCoords extends Hospital {
  coords?: { lat: number; lng: number };
}

interface HospitalsMapProps {
  hospitals: Hospital[];
  selectedHospital: Hospital | null;
  userLocation: { lat: number; lng: number } | null;
  onHospitalSelect: (hospital: Hospital) => void;
}

// Component to handle map updates when hospitals or selection changes
function MapUpdater({ 
  hospitals, 
  selectedHospital, 
  userLocation 
}: { 
  hospitals: HospitalWithCoords[];
  selectedHospital: HospitalWithCoords | null;
  userLocation: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedHospital && selectedHospital.coords) {
      map.flyTo([selectedHospital.coords.lat, selectedHospital.coords.lng], 14, {
        duration: 1
      });
    } else if (hospitals.length > 0) {
      // Fit map to show all hospitals with coordinates
      const bounds: L.LatLngBoundsExpression = [];
      hospitals.forEach(hospital => {
        if (hospital.coords) {
          bounds.push([hospital.coords.lat, hospital.coords.lng]);
        }
      });
      if (userLocation) {
        bounds.push([userLocation.lat, userLocation.lng]);
      }
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, hospitals, selectedHospital, userLocation]);

  return null;
}

export default function HospitalsMap({
  hospitals,
  selectedHospital,
  userLocation,
  onHospitalSelect,
}: HospitalsMapProps) {
  const [hospitalsWithCoords, setHospitalsWithCoords] = useState<HospitalWithCoords[]>([]);
  const [selectedWithCoords, setSelectedWithCoords] = useState<HospitalWithCoords | null>(null);

  // Default center (Northern Virginia area)
  const defaultCenter: [number, number] = [38.8816, -77.1728];
  const defaultZoom = 10;

  // Process hospitals to add coordinates
  useEffect(() => {
    const processHospitals = async () => {
      const processed: HospitalWithCoords[] = [];
      
      for (const hospital of hospitals) {
        let coords = null;
        
        // First check if we have known coordinates
        if (KNOWN_HOSPITAL_COORDINATES[hospital.name]) {
          coords = KNOWN_HOSPITAL_COORDINATES[hospital.name];
        } 
        // Check if location exists and has proper structure
        else if (hospital.location) {
          // Handle PostGIS point format or other formats
          if (typeof hospital.location === 'object') {
            if ('coordinates' in hospital.location && Array.isArray(hospital.location.coordinates)) {
              // PostGIS format: coordinates[0] is longitude, coordinates[1] is latitude
              coords = {
                lat: hospital.location.coordinates[1],
                lng: hospital.location.coordinates[0]
              };
            } else if ('lat' in hospital.location && 'lng' in hospital.location) {
              coords = {
                lat: hospital.location.lat,
                lng: hospital.location.lng
              };
            }
          }
        } 
        // Try to geocode if we have address information
        else if (hospital.address && hospital.city && hospital.state) {
          const geocoded = await getHospitalCoordinates(
            hospital.name,
            hospital.address,
            hospital.city,
            hospital.state,
            hospital.zip_code
          );
          if (geocoded) {
            coords = { lat: geocoded.lat, lng: geocoded.lng };
          }
        }
        
        processed.push({
          ...hospital,
          coords: coords || undefined
        });
      }
      
      setHospitalsWithCoords(processed);
    };
    
    processHospitals();
  }, [hospitals]);

  // Update selected hospital with coordinates
  useEffect(() => {
    if (selectedHospital) {
      const withCoords = hospitalsWithCoords.find(h => h.id === selectedHospital.id);
      setSelectedWithCoords(withCoords || null);
    } else {
      setSelectedWithCoords(null);
    }
  }, [selectedHospital, hospitalsWithCoords]);

  // Create custom icons
  const hospitalIcon = L.divIcon({
    html: `<div style="background-color: #ef4444; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">H</div>`,
    className: 'custom-hospital-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const urgentCareIcon = L.divIcon({
    html: `<div style="background-color: #f59e0b; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">U</div>`,
    className: 'custom-urgent-care-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const clinicIcon = L.divIcon({
    html: `<div style="background-color: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">C</div>`,
    className: 'custom-clinic-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const selectedIcon = L.divIcon({
    html: `<div style="background-color: #3b82f6; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.5); animation: pulse 2s infinite;">★</div>`,
    className: 'custom-hospital-marker-selected',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  const userIcon = L.divIcon({
    html: `<div style="background-color: #6366f1; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div>`,
    className: 'custom-user-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const getIconForType = (type: string, isSelected: boolean) => {
    if (isSelected) return selectedIcon;
    
    switch(type) {
      case 'ER':
        return hospitalIcon;
      case 'urgent_care':
        return urgentCareIcon;
      case 'clinic':
      case 'pop_up_clinic':
        return clinicIcon;
      default:
        return hospitalIcon;
    }
  };

  const getTypeOfCareLabel = (type: string) => {
    const labels: Record<string, string> = {
      'ER': 'Emergency Room',
      'urgent_care': 'Urgent Care',
      'telehealth': 'Telehealth',
      'clinic': 'Clinic',
      'pop_up_clinic': 'Pop-up Clinic',
      'practitioner': 'Practitioner',
    };
    return labels[type] || type;
  };

  // Determine map center
  let mapCenter = defaultCenter;
  let mapZoom = defaultZoom;
  
  if (userLocation) {
    mapCenter = [userLocation.lat, userLocation.lng];
    mapZoom = 12;
  } else if (hospitalsWithCoords.length > 0 && hospitalsWithCoords[0].coords) {
    const firstHospital = hospitalsWithCoords[0];
    mapCenter = [firstHospital.coords.lat, firstHospital.coords.lng];
    mapZoom = 11;
  }

  // Add CSS for pulse animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% {
          box-shadow: 0 3px 6px rgba(0,0,0,0.5);
        }
        50% {
          box-shadow: 0 3px 12px rgba(59, 130, 246, 0.8);
        }
        100% {
          box-shadow: 0 3px 6px rgba(0,0,0,0.5);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      className="w-full h-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      <MapUpdater 
        hospitals={hospitalsWithCoords} 
        selectedHospital={selectedWithCoords} 
        userLocation={userLocation} 
      />

      {/* User location marker */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userIcon}
        >
          <Popup>
            <div className="p-2">
              <p className="font-semibold">Your Location</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Hospital markers - only show those with coordinates */}
      {hospitalsWithCoords.map((hospital) => {
        if (!hospital.coords) return null;
        
        const position: [number, number] = [
          hospital.coords.lat,
          hospital.coords.lng
        ];
        
        return (
          <Marker
            key={hospital.id}
            position={position}
            icon={getIconForType(hospital.type_of_care, selectedHospital?.id === hospital.id)}
            eventHandlers={{
              click: () => onHospitalSelect(hospital),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[250px]">
                <h3 className="font-bold text-lg mb-2">{hospital.name}</h3>
                <Badge className="mb-2">
                  {getTypeOfCareLabel(hospital.type_of_care)}
                </Badge>
                
                <div className="space-y-2 mt-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      <p>{hospital.address}</p>
                      <p>{hospital.city}, {hospital.state} {hospital.zip_code}</p>
                    </div>
                  </div>
                  
                  {hospital.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{hospital.phone_number}</span>
                    </div>
                  )}
                  
                  {hospital.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={hospital.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                  
                  {hospital.wait_score && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Wait time: ~{Math.round(hospital.wait_score * 10)} min</span>
                    </div>
                  )}
                  
                  {hospital.distance_miles && (
                    <div className="text-sm font-medium text-primary mt-2">
                      Distance: {hospital.distance_miles.toFixed(1)} miles
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}