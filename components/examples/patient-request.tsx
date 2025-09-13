'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ServiceType, TimeSlot } from '@/lib/types/database';

export function PatientRequest() {
  const [requestData, setRequestData] = useState({
    geo_lat: 34.0522,
    geo_long: -118.2437,
    address: 'Los Angeles, CA',
    requested_service: 'urgent_care' as ServiceType,
    urgency_level: 3,
    notes: '',
  });

  // Create patient request mutation
  const createRequest = trpc.requests.create.useMutation({
    onSuccess: (data) => {
      console.log('Request created:', data);
      // Refetch user requests
      userRequests.refetch();
    },
    onError: (error) => {
      console.error('Error creating request:', error);
    },
  });

  // Get user's requests
  const userRequests = trpc.requests.getUserRequests.useQuery({
    limit: 10,
    offset: 0,
  });

  // TODO: Add AI triage when Gemini integration is ready

  const handleSubmit = () => {
    createRequest.mutate(requestData);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'fulfilled': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyLabel = (level: number) => {
    switch (level) {
      case 1: return 'Emergency';
      case 2: return 'Urgent';
      case 3: return 'Soon';
      case 4: return 'Routine';
      case 5: return 'Preventive';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Submit Healthcare Request</CardTitle>
          <CardDescription>
            Request healthcare services and get matched with providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                value={requestData.geo_lat}
                onChange={(e) => setRequestData(prev => ({ ...prev, geo_lat: parseFloat(e.target.value) }))}
                step="0.0001"
              />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                value={requestData.geo_long}
                onChange={(e) => setRequestData(prev => ({ ...prev, geo_long: parseFloat(e.target.value) }))}
                step="0.0001"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={requestData.address}
              onChange={(e) => setRequestData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter your address"
            />
          </div>

          <div>
            <Label htmlFor="service">Service Type</Label>
            <select
              id="service"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={requestData.requested_service}
              onChange={(e) => setRequestData(prev => ({ ...prev, requested_service: e.target.value as ServiceType }))}
            >
              <option value="urgent_care">Urgent Care</option>
              <option value="general">General</option>
              <option value="dental">Dental</option>
              <option value="mental_health">Mental Health</option>
              <option value="pediatric">Pediatric</option>
              <option value="vaccination">Vaccination</option>
            </select>
          </div>

          <div>
            <Label htmlFor="urgency">Urgency Level (1=Emergency, 5=Routine)</Label>
            <Input
              id="urgency"
              type="number"
              min="1"
              max="5"
              value={requestData.urgency_level}
              onChange={(e) => setRequestData(prev => ({ ...prev, urgency_level: parseInt(e.target.value) }))}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              rows={3}
              value={requestData.notes}
              onChange={(e) => setRequestData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Describe your symptoms or needs..."
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit} 
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {userRequests.data && userRequests.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Requests</CardTitle>
            <CardDescription>Recent healthcare requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userRequests.data.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex gap-2 items-center">
                        <span className="font-semibold">{request.requested_service}</span>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        <Badge variant="outline">
                          {getUrgencyLabel(request.urgency_level)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{request.address}</p>
                      {request.notes && (
                        <p className="text-sm mt-2">{request.notes}</p>
                      )}
                      {request.match_score && (
                        <p className="text-sm text-gray-600 mt-1">
                          Match Score: {(request.match_score * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
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
