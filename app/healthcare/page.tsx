import MapView from "@/components/MapView";
import DemandHeatmap from "@/components/DemandHeatmap";
import ClinicCard from "@/components/ClinicCard";

export default function HealthcareDashboard() {
  // Sample clinic data - in real app this would come from your database
  const sampleClinics = [
    {
      id: "1",
      name: "Rural Health Center",
      address: "123 Main St, Rural Town, ST 12345",
      distance: "2.5 miles",
      services: ["General Practice", "Emergency Care"],
      rating: 4.5,
      availability: "Open Now",
    },
    {
      id: "2", 
      name: "Community Medical Center",
      address: "456 Oak Ave, Small City, ST 12346",
      distance: "8.2 miles",
      services: ["Specialty Care", "Urgent Care"],
      rating: 4.2,
      availability: "Closes at 6 PM",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-foreground">
          Healthcare Access Dashboard
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Area Map</h2>
            <MapView />
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Demand Heatmap</h2>
            <DemandHeatmap />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Nearby Healthcare Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sampleClinics.map((clinic) => (
              <ClinicCard
                key={clinic.id}
                name={clinic.name}
                address={clinic.address}
                distance={clinic.distance}
                services={clinic.services}
                rating={clinic.rating}
                availability={clinic.availability}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}