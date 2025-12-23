import { Bell, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden md:flex w-64 border-r border-border bg-background/80 backdrop-blur-sm flex-col">
        <div className="px-6 py-5 border-b border-border">
          <p className="text-xs font-mono tracking-[0.3em] text-primary/60 uppercase">
            DARK TECH
          </p>
          <h1 className="mt-2 text-sm font-mono text-muted-foreground uppercase tracking-[0.25em]">
            ADMIN NODE
          </h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2 text-xs font-mono">
          <p className="text-muted-foreground/70 mb-2 tracking-[0.25em] uppercase">
            CONTROLE
          </p>
          <button className="w-full text-left px-3 py-2 rounded-sm bg-primary/10 text-primary border border-primary/40 text-[11px] tracking-[0.2em]">
            Visão Geral
          </button>
          <button className="w-full text-left px-3 py-2 rounded-sm hover:bg-muted/40 text-[11px] tracking-[0.18em]">
            Vendedores
          </button>
          <button className="w-full text-left px-3 py-2 rounded-sm hover:bg-muted/40 text-[11px] tracking-[0.18em]">
            Financeiro
          </button>
          <button className="w-full text-left px-3 py-2 rounded-sm hover:bg-muted/40 text-[11px] tracking-[0.18em]">
            Monitor
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 gap-4 bg-background/80 backdrop-blur">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-[0.3em] text-primary/60 uppercase">
              Painel Administrativo
            </span>
            <span className="text-sm text-muted-foreground font-mono tracking-[0.18em]">
              Operações, redes e finanças em tempo real.
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
          <section className="grid gap-4 md:grid-cols-4">
            <Card className="bg-background/80 border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Usuários Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono">--- </p>
              </CardContent>
            </Card>
            <Card className="bg-background/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Vendedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono">--- </p>
              </CardContent>
            </Card>
            <Card className="bg-background/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Vendas 24h
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono">R$ ---,--</p>
              </CardContent>
            </Card>
            <Card className="bg-background/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono">0</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-background/80 lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Fluxo de Atividade
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground">Últimas 24h</span>
              </CardHeader>
              <CardContent>
                <div className="h-40 border border-dashed border-border/60 rounded-sm flex items-center justify-center text-[11px] text-muted-foreground font-mono">
                  Área pronta para gráfico ou timeline em tempo real.
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Vendedores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-[11px] font-mono">
                <p className="text-muted-foreground">
                  Lista condensada de vendedores com status de bloqueio, timer e atalhos.
                </p>
                <Button variant="outline" size="sm" className="w-full mt-2 text-[11px] tracking-[0.18em]">
                  GERENCIAR REDE
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
