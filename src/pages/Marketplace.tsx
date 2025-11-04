import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { EventCard } from "@/components/EventCard";
import { SwapRequestDialog } from "@/components/SwapRequestDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EventWithOwner {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: "BUSY" | "SWAPPABLE" | "SWAP_PENDING";
  user_id: string;
  profiles: {
    name: string;
  };
}

interface Profile {
  name: string;
}

const Marketplace = () => {
  const [events, setEvents] = useState<EventWithOwner[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventWithOwner | null>(null);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    }
  };

  const fetchSwappableEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("events")
      .select("*, profiles:user_id(name)")
      .eq("status", "SWAPPABLE")
      .neq("user_id", user.id)
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch swappable events",
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    fetchSwappableEvents();

    // Subscribe to realtime changes for swappable events
    const channel = supabase
      .channel('marketplace-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          fetchSwappableEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRequestSwap = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setSwapDialogOpen(true);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation userName={profile?.name} />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
            <p className="text-muted-foreground mt-1">
              Browse swappable time slots from other users
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading swappable events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No swappable events available at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  ownerName={event.profiles?.name}
                  showActions={false}
                  onRequestSwap={handleRequestSwap}
                />
              ))}
            </div>
          )}
        </div>

        {selectedEvent && (
          <SwapRequestDialog
            open={swapDialogOpen}
            onOpenChange={setSwapDialogOpen}
            receiverSlotId={selectedEvent.id}
            receiverId={selectedEvent.user_id}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default Marketplace;
