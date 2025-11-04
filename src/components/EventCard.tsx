import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    status: "BUSY" | "SWAPPABLE" | "SWAP_PENDING";
  };
  onToggleSwappable?: (id: string, currentStatus: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  ownerName?: string;
  onRequestSwap?: (eventId: string) => void;
}

export const EventCard = ({
  event,
  onToggleSwappable,
  onDelete,
  showActions = true,
  ownerName,
  onRequestSwap,
}: EventCardProps) => {
  const getStatusBadge = () => {
    const statusMap = {
      SWAPPABLE: { variant: "default" as const, color: "bg-success text-success-foreground" },
      BUSY: { variant: "secondary" as const, color: "bg-muted text-muted-foreground" },
      SWAP_PENDING: { variant: "default" as const, color: "bg-warning text-warning-foreground" },
    };
    
    const status = statusMap[event.status];
    return (
      <Badge className={status.color}>
        {event.status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{event.title}</CardTitle>
            {ownerName && (
              <p className="text-sm text-muted-foreground mt-1">by {ownerName}</p>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(event.start_time), "MMM dd, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(event.start_time), "h:mm a")} -{" "}
              {format(new Date(event.end_time), "h:mm a")}
            </span>
          </div>
        </div>

        {showActions && onToggleSwappable && onDelete && (
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onToggleSwappable(event.id, event.status)}
              disabled={event.status === "SWAP_PENDING"}
            >
              {event.status === "SWAPPABLE" ? "Mark Busy" : "Make Swappable"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(event.id)}
              disabled={event.status === "SWAP_PENDING"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {onRequestSwap && (
          <Button
            className="w-full mt-4"
            variant="default"
            onClick={() => onRequestSwap(event.id)}
          >
            Request Swap
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
