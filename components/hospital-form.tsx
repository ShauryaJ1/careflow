'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Sparkles, Globe, MapPin } from 'lucide-react';
import { getStateAbbreviation } from '@/lib/utils/states';
import dynamic from 'next/dynamic';

// Dynamic import for the heatmap to avoid SSR issues with Leaflet
const RequestHeatmap = dynamic(() => import('@/components/request-heatmap'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-muted animate-pulse rounded-lg" />,
});

const hospitalFormSchema = z.object({
  name: z.string().min(1, 'Hospital name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2).max(2, 'Use 2-letter state code'),
  zip_code: z.string().min(5, 'Valid ZIP code required'),
  type_of_care: z.enum(['ER', 'urgent_care', 'telehealth', 'clinic', 'pop_up_clinic', 'practitioner']),
  wait_score: z.number().optional(),
  cooldown: z.number().optional(),
  op_22: z.number().optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone_number: z.string().optional(),
  description: z.string().optional(),
  open_time: z.object({
    sunday: z.object({ open: z.string(), close: z.string() }).optional(),
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
  }).optional(),
});

type HospitalFormValues = z.infer<typeof hospitalFormSchema>;

interface HospitalFormProps {
  hospitalId?: string;
  initialData?: Partial<HospitalFormValues>;
  onSuccess?: () => void;
}

export function HospitalForm({ hospitalId, initialData, onSuccess }: HospitalFormProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const utils = trpc.useUtils();

  const form = useForm<HospitalFormValues>({
    resolver: zodResolver(hospitalFormSchema),
    defaultValues: initialData || {
      name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      type_of_care: 'clinic',
      website: '',
      email: '',
      phone_number: '',
      description: '',
    },
  });

  const createHospital = trpc.hospitals.create.useMutation({
    onSuccess: () => {
      toast.success('Hospital created successfully!');
      form.reset();
      utils.hospitals.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to create hospital: ${error.message}`);
    },
  });

  const updateHospital = trpc.hospitals.update.useMutation({
    onSuccess: () => {
      toast.success('Hospital updated successfully!');
      utils.hospitals.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to update hospital: ${error.message}`);
    },
  });

  const scrapeWebsite = trpc.ai.scrapeHospitalWebsite.useMutation({
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Fill form with scraped data
        form.setValue('name', data.data.name, { shouldValidate: true });
        form.setValue('address', data.data.address, { shouldValidate: true });
        form.setValue('city', data.data.city, { shouldValidate: true });
        form.setValue('state', getStateAbbreviation(data.data.state).toUpperCase(), { shouldValidate: true });
        form.setValue('zip_code', data.data.zip_code, { shouldValidate: true });
        form.setValue('type_of_care', data.data.type_of_care, { shouldValidate: true, shouldDirty: true });
        if (data.data.website) form.setValue('website', data.data.website, { shouldValidate: true });
        if (data.data.email) form.setValue('email', data.data.email, { shouldValidate: true });
        if (data.data.phone_number) form.setValue('phone_number', data.data.phone_number, { shouldValidate: true });
        if (data.data.description) form.setValue('description', data.data.description, { shouldValidate: true });
        if (data.data.open_time) form.setValue('open_time', data.data.open_time, { shouldValidate: true });
        
        toast.success('Website data extracted successfully!');
        
        // Show additional info if available
        if (data.additionalInfo?.services?.length) {
          toast.info(`Found ${data.additionalInfo.services.length} services offered`);
        }
      }
    },
    onError: (error) => {
      toast.error(`Failed to scrape website: ${error.message}`);
    },
  });

  const handleAiGenerate = async () => {
    if (!websiteUrl) {
      toast.error('Please enter a website URL');
      return;
    }

    setIsAiLoading(true);
    try {
      await scrapeWebsite.mutateAsync({ websiteUrl });
    } finally {
      setIsAiLoading(false);
    }
  };

  const onSubmit = async (data: HospitalFormValues) => {
    // Clean up empty strings and normalize state
    const cleanedData = {
      ...data,
      state: getStateAbbreviation(data.state).toUpperCase(),
      website: data.website || undefined,
      email: data.email || undefined,
      phone_number: data.phone_number || undefined,
      description: data.description || undefined,
    };

    if (hospitalId) {
      await updateHospital.mutateAsync({ id: hospitalId, data: cleanedData });
    } else {
      await createHospital.mutateAsync(cleanedData);
    }
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  return (
    <div className="space-y-6">
      {/* Request Heatmap - Shows where patients are requesting care */}
      {showHeatmap && !hospitalId && (
        <RequestHeatmap
          state={form.watch('state') || undefined}
          city={form.watch('city') || undefined}
          height="300px"
          showControls={true}
          onLocationSelect={(lat, lng) => {
            setSelectedLocation({ lat, lng });
            toast.info(`Selected location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }}
        />
      )}
      
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{hospitalId ? 'Edit Hospital' : 'Add New Hospital'}</CardTitle>
              <CardDescription>
                Enter hospital details or use AI to extract information from a website
              </CardDescription>
            </div>
            {!hospitalId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                <MapPin className="w-4 h-4 mr-2" />
                {showHeatmap ? 'Hide' : 'Show'} Demand Map
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* AI Generation Section */}
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium">Generate with AI</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter hospital website URL (e.g., https://hospital.com)"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={isAiLoading || !websiteUrl}
                  variant="secondary"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Extract Data
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a hospital website URL and AI will automatically populate the form below
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Hospital Name</FormLabel>
                    <FormControl>
                      <Input placeholder="City Medical Center" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type_of_care"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Care</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ER">Emergency Room</SelectItem>
                        <SelectItem value="urgent_care">Urgent Care</SelectItem>
                        <SelectItem value="telehealth">Telehealth</SelectItem>
                        <SelectItem value="clinic">Clinic</SelectItem>
                        <SelectItem value="pop_up_clinic">Pop-up Clinic</SelectItem>
                        <SelectItem value="practitioner">Practitioner</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="New York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="NY or New York" {...field} />
                    </FormControl>
                    <FormDescription>State name or 2-letter code</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="10001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@hospital.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://hospital.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wait_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wait Score (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="30" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Average wait time</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the hospital and services offered"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Operating Hours</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {daysOfWeek.map((day) => {
                  const dayHours = form.watch(`open_time.${day}`);
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-24 capitalize">{day}:</span>
                      <Input
                        placeholder="09:00"
                        className="w-24"
                        value={dayHours?.open || ''}
                        onChange={(e) => {
                          form.setValue(`open_time.${day}`, {
                            open: e.target.value,
                            close: dayHours?.close || '',
                          });
                        }}
                      />
                      <span>to</span>
                      <Input
                        placeholder="17:00"
                        className="w-24"
                        value={dayHours?.close || ''}
                        onChange={(e) => {
                          form.setValue(`open_time.${day}`, {
                            open: dayHours?.open || '',
                            close: e.target.value,
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={createHospital.isPending || updateHospital.isPending}
              >
                {createHospital.isPending || updateHospital.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  hospitalId ? 'Update Hospital' : 'Create Hospital'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    </div>
  );
}
