'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Edit2, 
  Trash2, 
  MapPin, 
  Phone, 
  Globe, 
  Clock,
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Hospital } from '@/lib/types/database';

interface HospitalsListProps {
  onEdit?: (hospital: Hospital) => void;
}

export function HospitalsList({ onEdit }: HospitalsListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: hospitals, isLoading } = trpc.hospitals.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const deleteHospital = trpc.hospitals.delete.useMutation({
    onSuccess: () => {
      toast.success('Hospital deleted successfully');
      utils.hospitals.list.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete hospital: ${error.message}`);
    },
  });

  const handleDelete = async () => {
    if (deleteId) {
      await deleteHospital.mutateAsync({ id: deleteId });
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!hospitals || hospitals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No hospitals found</p>
          <p className="text-sm text-muted-foreground">Add your first hospital to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {hospitals.map((hospital) => (
          <Card key={hospital.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl">{hospital.name}</CardTitle>
                  <CardDescription className="mt-2">
                    <Badge variant={getTypeOfCareColor(hospital.type_of_care) as any}>
                      {getTypeOfCareLabel(hospital.type_of_care)}
                    </Badge>
                    {hospital.wait_score && (
                      <Badge variant="outline" className="ml-2">
                        ~{hospital.wait_score} min wait
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit?.(hospital)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteId(hospital.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    {hospital.website}
                  </a>
                </div>
              )}
              
              {hospital.open_time && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">Hours:</p>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {Object.entries(hospital.open_time).map(([day, hours]) => {
                        if (!hours || typeof hours !== 'object' || !('open' in hours) || !('close' in hours)) return null;
                        return (
                          <div key={day} className="text-xs">
                            <span className="capitalize font-medium">{day}:</span>{' '}
                            {(hours as { open: string; close: string }).open} - {(hours as { open: string; close: string }).close}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {hospital.description && (
                <p className="text-sm text-muted-foreground mt-3">
                  {hospital.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the hospital
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
