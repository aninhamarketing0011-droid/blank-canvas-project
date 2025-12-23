import { Bell, ShoppingBag, Users, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function VendorDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 gap-4 bg-background/80 backdrop-blur">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono tracking-[0.3em] text-primary/60 uppercase">
            Painel do Vendedor
          </span>
          <span className="text-sm text-muted-foreground font-mono tracking-[0.18em]">
            Produtos, clientes e vendas em um só lugar.
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
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="bg-background/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Meus Produtos
              </CardTitle>
              <ShoppingBag className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">--- </p>
              <p className="text-[11px] text-muted-foreground mt-1">Itens ativos no catálogo.</p>
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Meus Clientes
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">--- </p>
              <p className="text-[11px] text-muted-foreground mt-1">Clientes com acesso autorizado.</p>
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Vendas do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono">R$ ---,--</p>
              <p className="text-[11px] text-muted-foreground mt-1">Resumo financeiro diário.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Catálogo Rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px] font-mono">
              <p className="text-muted-foreground">
                Lista enxuta dos principais produtos com preço e status para edição rápida.
              </p>
              <Button variant="outline" size="sm" className="mt-2 text-[11px] tracking-[0.18em]">
                GERENCIAR PRODUTOS
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Pedidos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 border border-dashed border-border/60 rounded-sm flex items-center justify-center text-[11px] text-muted-foreground font-mono">
                Área pronta para tabela de pedidos em tempo real.
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
