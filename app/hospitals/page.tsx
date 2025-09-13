'use client';

import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  MapPin, 
  Phone, 
  Globe, 
  Clock,
  Navigation,
  AlertCircle,
  Loader2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Hospital } from '@/lib/types/database';
import { toast } from 'sonner';
import { getStateAbbreviation, isValidState } from '@/lib/utils/states';

// Dynamically import the map component to avoid SSR issues
const HospitalsMap = dynamic(() => import('@/components/hospitals-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function HospitalsSearchPage() {
  const [searchLocation, setSearchLocation] = useState('');
  const [userState, setUserState] = useState<string>('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const supabase = createClient();

  // Get user's state from profile if authenticated
  useEffect(() => {
    const loadUserState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('patient_profiles')
          .select('state')
          .eq('id', user.id)
          .single();
        
        if (profile?.state) {
          setUserState(profile.state);
          setSearchLocation(profile.state);
        }
      }
    };
    
    loadUserState();
  }, [supabase]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Could not get user location:', error);
        }
      );
    }
  }, []);

  // Parse search location to determine search parameters
  const searchParams = useMemo(() => {
    if (!searchLocation || searchLocation === 'Current Location') {
      return {
        lat: userCoordinates?.lat,
        lng: userCoordinates?.lng,
        radius: 50,
        limit: 30,
      };
    }

    const trimmed = searchLocation.trim();
    
    // Check if it's a ZIP code (5 digits)
    if (/^\d{5}$/.test(trimmed)) {
      return {
        zip_code: trimmed,
        lat: userCoordinates?.lat,
        lng: userCoordinates?.lng,
        radius: 50,
        limit: 30,
      };
    }
    
    // Check if it's a state (full name or abbreviation)
    if (isValidState(trimmed)) {
      const stateAbbr = getStateAbbreviation(trimmed);
      return {
        state: stateAbbr,
        lat: userCoordinates?.lat,
        lng: userCoordinates?.lng,
        radius: 50,
        limit: 30,
      };
    }
    
    // Check if it contains a comma (likely "City, State" format)
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(s => s.trim());
      const city = parts[0];
      const stateOrAbbr = parts[1];
      
      if (isValidState(stateOrAbbr)) {
        return {
          city: city,
          state: getStateAbbreviation(stateOrAbbr),
          lat: userCoordinates?.lat,
          lng: userCoordinates?.lng,
          radius: 50,
          limit: 30,
        };
      }
    }
    
    // Default: treat as city name
    return {
      city: trimmed,
      lat: userCoordinates?.lat,
      lng: userCoordinates?.lng,
      radius: 50,
      limit: 30,
    };
  }, [searchLocation, userCoordinates]);

  const { data: hospitals, isLoading, refetch } = trpc.hospitals.search.useQuery(searchParams);

  const handleSearch = () => {
    refetch();
  };

  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setSearchLocation('Current Location');
        toast.success('Using your current location');
        refetch();
      },
      (error) => {
        toast.error('Unable to retrieve your location');
      }
    );
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

  const getTypeOfCareColor = (type: string) => {
    const colors: Record<string, string> = {
      'ER': 'destructive',
      'urgent_care': 'default',
      'telehealth': 'secondary',
      'clinic': 'outline',
      'pop_up_clinic': 'default',
      'practitioner': 'secondary',
    };
    return colors[type] || 'default';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Search */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Find Healthcare Facilities</h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter city, state, or ZIP code..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleLocationClick} variant="outline" size="icon">
              <Navigation className="h-4 w-4" />
            </Button>
            <Button onClick={handleSearch}>
              Search
            </Button>
          </div>
          {userState && !searchLocation && (
            <p className="text-sm text-muted-foreground mt-2">
              Default location: {userState}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-204px)]">
        {/* Left Side - Results List */}
        <div className="w-full md:w-1/2 lg:w-2/5 border-r">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {isLoading ? (
                // Loading skeletons
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-16 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : hospitals && hospitals.length > 0 ? (
                // Results
                hospitals.map((hospital) => (
                  <Card 
                    key={hospital.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedHospital?.id === hospital.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedHospital(hospital)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{hospital.name}</CardTitle>
                        {hospital.distance_miles && (
                          <Badge variant="secondary" className="ml-2">
                            {hospital.distance_miles.toFixed(1)} mi
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={getTypeOfCareColor(hospital.type_of_care) as any}>
                          {getTypeOfCareLabel(hospital.type_of_care)}
                        </Badge>
                        {hospital.wait_score && (
                          <Badge variant="outline">
                            ~{hospital.wait_score} min wait
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            Visit Website
                          </a>
                        </div>
                      )}

                      {hospital.open_time && (
                        <div className="text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Check website for hours
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                // No results
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">No hospitals found</p>
                    <p className="text-sm text-muted-foreground text-center">
                      Try searching in a different location or expanding your search area
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Map */}
        <div className="hidden md:block md:w-1/2 lg:w-3/5 h-full">
          <HospitalsMap
            hospitals={hospitals || []}
            selectedHospital={selectedHospital}
            userLocation={userCoordinates}
            onHospitalSelect={setSelectedHospital}
          />
        </div>
      </div>
    </div>
  );
}
