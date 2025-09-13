import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Phone, Navigation as NavIcon } from "lucide-react";

interface ClinicCardProps {
  id: string;
  name: string;
  address: string;
  distance: number;
  services: string[];
  hours: string;
  phone: string;
  isOpen: boolean;
  capacity?: number;
  onClick?: () => void;
}

export default function ClinicCard({
  id,
  name,
  address,
  distance,
  services,
  hours,
  phone,
  isOpen,
  capacity,
  onClick
}: ClinicCardProps) {
  const handleGetDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Getting directions to ${name}`);
    // todo: remove mock functionality - integrate with real maps API
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Calling ${phone}`);
    // todo: remove mock functionality - integrate with real phone functionality
  };

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-md" 
      onClick={onClick}
      data-testid={`card-clinic-${id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-foreground" data-testid={`text-clinic-name-${id}`}>
              {name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3 h-3" />
              <span data-testid={`text-distance-${id}`}>{distance.toFixed(1)} mi</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge 
              variant={isOpen ? "default" : "secondary"}
              className={isOpen ? "bg-primary text-white" : ""}
              data-testid={`badge-status-${id}`}
            >
              {isOpen ? "Open" : "Closed"}
            </Badge>
            {capacity && (
              <Badge variant="outline" className="text-xs border-accent text-accent" data-testid={`badge-capacity-${id}`}>
                {capacity} slots
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Address */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-sm text-foreground" data-testid={`text-address-${id}`}>
              {address}
            </span>
          </div>

          {/* Hours */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground" data-testid={`text-hours-${id}`}>
              {hours}
            </span>
          </div>

          {/* Services */}
          <div className="flex flex-wrap gap-1">
            {services.slice(0, 3).map((service, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs"
                data-testid={`badge-service-${id}-${index}`}
              >
                {service}
              </Badge>
            ))}
            {services.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{services.length - 3} more
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleGetDirections}
              className="flex-1"
              data-testid={`button-directions-${id}`}
            >
              <NavIcon className="w-3 h-3 mr-1" />
              Directions
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCall}
              data-testid={`button-call-${id}`}
            >
              <Phone className="w-3 h-3 mr-1" />
              Call
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}