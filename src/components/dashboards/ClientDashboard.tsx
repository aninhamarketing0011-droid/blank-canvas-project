import { Bell, MapPin, Store, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function ClientDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 gap-4 bg-background/80 backdrop-blur">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono tracking-[0.3em] text-primary/60 uppercase">
            Painel do Cliente
          </span>
          <span className="text-sm text-muted-foreground font-mono tracking-[0.18em]">
            Acompanhe pedidos e encontre vendedores ativos.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </Button>
          <Link to="/settings">
            <Button variant="outline" size="sm" className="text-[11px] tracking-[0.18em]">
              CONFIGURAÇÕES
            </Button>
          </Link>
          <div className="w-9 h-9 rounded-full border border-border flex items-center justify-center bg-muted/40">
            <UserCircle2 className="w-5 h-5 text-primary" />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-8 py-5 space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="bg-background/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Lojas Disponíveis
              </CardTitle>
              <Store className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="h-40 border border-dashed border-border/60 rounded-sm flex items-center justify-center text-[11px] text-muted-foreground font-mono">
                Grid de vendedores / lojas autorizadas para este cliente.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Pedidos Recentes
              </CardTitle>
              <MapPin className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="h-40 border border-dashed border-border/60 rounded-sm flex items-center justify-center text-[11px] text-muted-foreground font-mono">
                Linha do tempo dos últimos pedidos e respectivos status.
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
