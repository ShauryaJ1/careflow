'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProviderType, ServiceType } from '@/lib/types/database';

export function ProviderSearch() {
  const [searchParams, setSearchParams] = useState({
    lat: 34.0522,
    lng: -118.2437,
    radius: 10,
    type: undefined as ProviderType | undefined,
    services: [] as ServiceType[],
  });

  // Use tRPC query hook
  const { data: providers, isLoading, error, refetch } = trpc.providers.search.useQuery(searchParams, {
    enabled: false, // Don't run automatically
  });

  // Use tRPC query for finding nearby providers
  const { data: nearbyProviders, refetch: findNearby, isLoading: isFindingNearby } = trpc.providers.findNearby.useQuery({
    lat: searchParams.lat,
    lng: searchParams.lng,
    maxDistanceMiles: searchParams.radius,
  }, {
    enabled: false, // Don't run automatically
  });

  const handleSearch = () => {
    refetch();
  };

  const handleFindNearby = () => {
    findNearby();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Provider Search</CardTitle>
          <CardDescription>
            Search for healthcare providers using tRPC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Latitude</label>
              <Input
                type="number"
                value={searchParams.lat}
                onChange={(e) => setSearchParams(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                step="0.0001"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Longitude</label>
              <Input
                type="number"
                value={searchParams.lng}
                onChange={(e) => setSearchParams(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                step="0.0001"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Radius (miles)</label>
            <Input
              type="number"
              value={searchParams.radius}
              onChange={(e) => setSearchParams(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
              min="1"
              max="50"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search Providers'}
            </Button>
            <Button onClick={handleFindNearby} variant="outline" disabled={isFindingNearby}>
              {isFindingNearby ? 'Finding...' : 'Find Nearby (PostGIS)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {providers && providers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>Found {providers.length} providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providers.map((provider) => (
                <div key={provider.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{provider.name}</h3>
                      <p className="text-sm text-gray-600">{provider.address}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{provider.type}</Badge>
                        {provider.distance_miles && (
                          <Badge variant="secondary">
                            {provider.distance_miles.toFixed(1)} miles
                          </Badge>
                        )}
                        {provider.current_wait_time && (
                          <Badge>
                            {provider.current_wait_time} min wait
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {provider.telehealth_available && (
                        <Badge className="bg-green-100 text-green-800">Telehealth</Badge>
                      )}
                      {provider.accepts_walk_ins && (
                        <Badge className="bg-blue-100 text-blue-800">Walk-ins</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {nearbyProviders && nearbyProviders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nearby Providers (PostGIS)</CardTitle>
            <CardDescription>Using optimized spatial queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nearbyProviders.map((provider: any) => (
                <div key={provider.provider_id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{provider.provider_name}</h3>
                  <p className="text-sm text-gray-600">{provider.address}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{provider.provider_type}</Badge>
                    <Badge variant="secondary">
                      {provider.distance_miles.toFixed(1)} miles
                    </Badge>
                    {provider.current_wait_time && (
                      <Badge>{provider.current_wait_time} min wait</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
