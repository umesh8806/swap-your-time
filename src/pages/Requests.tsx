import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, Check, X, Trash2 } from "lucide-react";

interface SwapRequest {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  created_at: string;
  requester: {
    name: string;
  };
  receiver: {
    name: string;
  };
  requester_slot: {
    title: string;
    start_time: string;
    end_time: string;
  };
  receiver_slot: {
    title: string;
    start_time: string;
    end_time: string;
  };
}

interface Profile {
  name: string;
}

const Requests = () => {
  const [incomingRequests, setIncomingRequests] = useState<SwapRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<SwapRequest[]>([]);
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

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch incoming requests
    const { data: incoming } = await supabase
      .from("swap_requests")
      .select(`
        *,
        requester:profiles!swap_requests_requester_id_fkey(name),
        receiver:profiles!swap_requests_receiver_id_fkey(name),
        requester_slot:events!swap_requests_requester_slot_id_fkey(title, start_time, end_time),
        receiver_slot:events!swap_requests_receiver_slot_id_fkey(title, start_time, end_time)
      `)
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch outgoing requests
    const { data: outgoing } = await supabase
      .from("swap_requests")
      .select(`
        *,
        requester:profiles!swap_requests_requester_id_fkey(name),
        receiver:profiles!swap_requests_receiver_id_fkey(name),
        requester_slot:events!swap_requests_requester_slot_id_fkey(title, start_time, end_time),
        receiver_slot:events!swap_requests_receiver_slot_id_fkey(title, start_time, end_time)
      `)
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });

    setIncomingRequests(incoming as any || []);
    setOutgoingRequests(outgoing as any || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    fetchRequests();
  }, []);

  const handleAcceptSwap = async (request: SwapRequest) => {
    // Call the secure RPC function to accept swap
    const { error } = await supabase.rpc("accept_swap", {
      _request_id: request.id,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete swap",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Swap accepted! Events have been exchanged.",
      });
      fetchRequests();
    }
  };

  const handleRejectSwap = async (requestId: string) => {
    // Call the secure RPC function to reject swap
    const { error } = await supabase.rpc("reject_swap", {
      _request_id: requestId,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject swap",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Swap Rejected",
        description: "The swap request has been rejected.",
      });
      fetchRequests();
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("swap_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request Deleted",
        description: "The swap request has been removed.",
      });
      fetchRequests();
    }
  };

  const RequestCard = ({ request, isIncoming }: { request: SwapRequest; isIncoming: boolean }) => {
    const getStatusBadge = () => {
      const statusMap = {
        PENDING: { color: "bg-warning text-warning-foreground", label: "Pending" },
        ACCEPTED: { color: "bg-success text-success-foreground", label: "Accepted" },
        REJECTED: { color: "bg-destructive text-destructive-foreground", label: "Rejected" },
      };
      const status = statusMap[request.status];
      return <Badge className={status.color}>{status.label}</Badge>;
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">
              {isIncoming ? request.requester.name : request.receiver.name}
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isIncoming ? "They Offer" : "You Offered"}
              </p>
              <div className="p-3 bg-secondary rounded-lg space-y-1">
                <p className="font-medium">{request.requester_slot.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(request.requester_slot.start_time), "MMM dd")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {format(new Date(request.requester_slot.start_time), "h:mm a")} -{" "}
                    {format(new Date(request.requester_slot.end_time), "h:mm a")}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isIncoming ? "For Your" : "For Their"}
              </p>
              <div className="p-3 bg-secondary rounded-lg space-y-1">
                <p className="font-medium">{request.receiver_slot.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(request.receiver_slot.start_time), "MMM dd")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {format(new Date(request.receiver_slot.start_time), "h:mm a")} -{" "}
                    {format(new Date(request.receiver_slot.end_time), "h:mm a")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isIncoming && request.status === "PENDING" && (
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => handleAcceptSwap(request)}
              >
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => handleRejectSwap(request.id)}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {(request.status === "ACCEPTED" || request.status === "REJECTED") && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleDeleteRequest(request.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Request
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation userName={profile?.name} />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Swap Requests</h1>
            <p className="text-muted-foreground mt-1">
              Manage your incoming and outgoing swap requests
            </p>
          </div>

          <Tabs defaultValue="incoming">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="incoming">
                Incoming ({incomingRequests.filter((r) => r.status === "PENDING").length})
              </TabsTrigger>
              <TabsTrigger value="outgoing">
                Outgoing ({outgoingRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="incoming" className="mt-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading requests...</p>
                </div>
              ) : incomingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No incoming swap requests</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {incomingRequests.map((request) => (
                    <RequestCard key={request.id} request={request} isIncoming={true} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="outgoing" className="mt-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading requests...</p>
                </div>
              ) : outgoingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No outgoing swap requests</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {outgoingRequests.map((request) => (
                    <RequestCard key={request.id} request={request} isIncoming={false} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Requests;
