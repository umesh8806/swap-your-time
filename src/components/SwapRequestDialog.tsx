import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface SwapRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverSlotId: string;
  receiverId: string;
}

export const SwapRequestDialog = ({
  open,
  onOpenChange,
  receiverSlotId,
  receiverId,
}: SwapRequestDialogProps) => {
  const [mySwappableEvents, setMySwappableEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchMySwappableEvents();
    }
  }, [open]);

  const fetchMySwappableEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "SWAPPABLE")
      .order("start_time", { ascending: true });

    setMySwappableEvents(data || []);
  };

  const handleSubmit = async () => {
    if (!selectedEventId) {
      toast({
        title: "Error",
        description: "Please select one of your events",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Call the secure RPC function to create swap request
    const { error } = await supabase.rpc("request_swap", {
      _receiver_id: receiverId,
      _requester_slot_id: selectedEventId,
      _receiver_slot_id: receiverSlotId,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create swap request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Swap request sent successfully",
      });
      onOpenChange(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Swap</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select one of your swappable events to offer in exchange:
          </p>

          {mySwappableEvents.length === 0 ? (
            <p className="text-sm text-destructive">
              You don't have any swappable events. Mark an event as swappable first.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Your Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {mySwappableEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} - {format(new Date(event.start_time), "MMM dd, h:mm a")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || mySwappableEvents.length === 0}
              className="flex-1"
            >
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
