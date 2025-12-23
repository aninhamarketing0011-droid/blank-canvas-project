import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { VendorDashboard } from "@/components/dashboards/VendorDashboard";
import { ClientDashboard } from "@/components/dashboards/ClientDashboard";
import { DriverDashboard } from "@/components/dashboards/DriverDashboard";
import { ChatSystem } from "@/components/chat/ChatSystem";
import { useAuth } from "@/hooks/useAuth";

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="px-6 py-3 border border-border bg-background/80 text-[10px] font-mono tracking-[0.3em] uppercase">
        Carregando painel...
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="px-6 py-4 border border-destructive text-destructive bg-destructive/10 text-[10px] font-mono tracking-[0.25em] uppercase">
        Acesso não autorizado.
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <AccessDenied />;

  let content: JSX.Element;

  switch (role) {
    case "admin":
      content = <AdminDashboard />;
      break;
    case "vendor":
      content = <VendorDashboard />;
      break;
    case "client":
      content = <ClientDashboard />;
      break;
    case "driver":
      content = <DriverDashboard />;
      break;
    default:
      content = <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {content}
      <ChatSystem />
    </div>
  );
}
