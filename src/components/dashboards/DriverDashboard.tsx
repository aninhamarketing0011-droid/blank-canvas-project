import { Bell, DollarSign, MapPin, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";

export function DriverDashboard() {
  const [online, setOnline] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 gap-4 bg-background/80 backdrop-blur">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono tracking-[0.3em] text-primary/60 uppercase">
            Painel do Motorista
          </span>
          <span className="text-sm text-muted-foreground font-mono tracking-[0.18em]">
            Controle de rota, status e ganhos em tempo real.
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
        <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="bg-background/80 flex flex-col items-center justify-center border-primary/40">
            <CardHeader className="pb-4 text-center">
              <CardTitle className="text-[11px] tracking-[0.25em] text-muted-foreground font-mono uppercase">
                Status de Operação
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className={`w-full max-w-xs text-sm font-mono tracking-[0.25em] ${online ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
                onClick={() => setOnline((prev) => !prev)}
              >
                {online ? "FICAR OFFLINE" : "FICAR ONLINE"}
              </Button>
              <p className="text-[11px] text-muted-foreground font-mono text-center">
                Status atual: <span className="text-primary">{online ? "ONLINE" : "OFFLINE"}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Ganhos de Hoje
              </CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">R$ ---,--</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Resumo das entregas concluídas no período atual.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="bg-background/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Entregas Pendentes
              </CardTitle>
              <MapPin className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="h-40 border border-dashed border-border/60 rounded-sm flex items-center justify-center text-[11px] text-muted-foreground font-mono">
                Lista enxuta de próximas coletas e destinos.
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
