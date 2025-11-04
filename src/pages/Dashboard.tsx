import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { EventCard } from "@/components/EventCard";
import { AddEventDialog } from "@/components/AddEventDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: "BUSY" | "SWAPPABLE" | "SWAP_PENDING";
  user_id: string;
}

interface Profile {
  name: string;
}

const Dashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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

  const fetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    fetchEvents();

    // Subscribe to realtime changes for user's events
    const channel = supabase
      .channel('dashboard-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddEvent = async (eventData: {
    title: string;
    start_time: string;
    end_time: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("events").insert([
      {
        ...eventData,
        user_id: user.id,
      },
    ]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      fetchEvents();
    }
  };

  const handleToggleSwappable = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "SWAPPABLE" ? "BUSY" : "SWAPPABLE";

    const { error } = await supabase
      .from("events")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Event marked as ${newStatus.toLowerCase()}`,
      });
      fetchEvents();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      fetchEvents();
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation userName={profile?.name} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Events</h1>
              <p className="text-muted-foreground mt-1">
                Manage your schedule and mark slots as swappable
              </p>
            </div>
            <AddEventDialog onAdd={handleAddEvent} />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No events yet. Create your first event!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onToggleSwappable={handleToggleSwappable}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
