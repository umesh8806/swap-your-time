import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeftRight, Bell, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NavigationProps {
  userName?: string;
}

export const Navigation = ({ userName }: NavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">SlotSwapper</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="ghost" size="sm">
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Marketplace
              </Button>
            </Link>
            <Link to="/requests">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Requests
              </Button>
            </Link>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{userName}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
