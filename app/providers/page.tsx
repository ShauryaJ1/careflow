import ProviderDashboard from "@/components/ProviderDashboard";

export default function ProvidersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-foreground">
          Provider Dashboard
        </h1>
        <ProviderDashboard />
      </div>
    </div>
  );
}