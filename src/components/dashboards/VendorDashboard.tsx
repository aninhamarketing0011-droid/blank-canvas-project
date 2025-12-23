import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  Circle,
  DollarSign,
  PackageSearch,
  ShoppingBag,
  UserCircle2,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

function formatBRL(cents: number | null | undefined) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function isToday(dateString: string) {
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

type Product = Tables<"products">;
type Order = Tables<"orders">;
type VendorClient = Tables<"vendor_clients">;

export function VendorDashboard() {
  const { user } = useSupabaseAuth();
  const vendorId = user?.id;

  const {
    data: products = [],
    isLoading: productsLoading,
  } = useQuery<Product[]>({
    queryKey: ["vendor", vendorId, "products"],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const {
    data: orders = [],
    isLoading: ordersLoading,
  } = useQuery<Order[]>({
    queryKey: ["vendor", vendorId, "orders"],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,vendor_id,total_cents,created_at,status")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Order[];
    },
  });

  const {
    data: clients = [],
    isLoading: clientsLoading,
  } = useQuery<VendorClient[]>({
    queryKey: ["vendor", vendorId, "clients"],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_clients")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const loading = productsLoading || ordersLoading || clientsLoading;


  const kpis = useMemo(() => {
    const activeProducts = products.filter((p) => p.is_active).length;
    const totalProducts = products.length;

    const totalRevenueCents = orders.reduce(
      (acc, o) => acc + (o.total_cents ?? 0),
      0,
    );

    const todayOrders = orders.filter((o) => o.created_at && isToday(o.created_at));
    const todayRevenueCents = todayOrders.reduce(
      (acc, o) => acc + (o.total_cents ?? 0),
      0,
    );

    return {
      activeProducts,
      totalProducts,
      totalClients: clients.length,
      totalOrders: orders.length,
      totalRevenueCents,
      todayOrdersCount: todayOrders.length,
      todayRevenueCents,
    };
  }, [products, orders, clients]);

  const topProducts = useMemo(
    () => products.slice(0, 5),
    [products],
  );

  const recentOrders = useMemo(
    () => orders.slice(0, 5),
    [orders],
  );

  const recentClients = useMemo(
    () => clients.slice(0, 5),
    [clients],
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* HEADER */}
      <header className="h-16 border-b border-border/60 flex items-center justify-between px-4 md:px-8 gap-4 glass-panel">
        <div className="flex flex-col">
          <span className="text-[11px] font-mono tracking-[0.32em] text-primary/80 uppercase">
            Vendor Control Node
          </span>
          <span className="text-xs text-muted-foreground font-mono tracking-[0.18em]">
            Meus produtos, clientes e fluxo financeiro em tempo real.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </Button>
          <Link to="/settings">
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] tracking-[0.18em]"
            >
              CONFIGURAÇÕES
            </Button>
          </Link>
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/10">
            <UserCircle2 className="w-5 h-5 text-primary" />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-8 py-5 space-y-6">
        {/* KPI CARDS */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-purple-500/20 hover:border-purple-500/60 transition-colors shadow-[0_0_45px_rgba(0,0,0,0.8)]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Meus Produtos
              </CardTitle>
              <ShoppingBag className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="text-2xl font-mono">
                  {kpis.activeProducts}/{kpis.totalProducts}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Itens ativos / total no seu catálogo.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-purple-500/20 hover:border-purple-500/60 transition-colors">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Meus Clientes
              </CardTitle>
              <Users className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-mono">{kpis.totalClients}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Perfis com acesso autorizado ao seu sistema.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-purple-500/20 hover:border-purple-500/60 transition-colors">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Vendas do Dia
              </CardTitle>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl font-mono">
                    {formatBRL(kpis.todayRevenueCents)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {kpis.todayOrdersCount} pedidos hoje
                  </p>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Resumo financeiro em tempo real.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* GRID PRINCIPAL */}
        <section className="grid gap-4 lg:grid-cols-3">
          {/* CATÁLOGO RÁPIDO */}
          <Card className="glass-panel border-purple-500/20 hover:border-purple-500/60 transition-colors lg:col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Catálogo Rápido
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  Lista enxuta dos principais produtos com preço e status.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] tracking-[0.18em] gap-1"
              >
                <PackageSearch className="w-3 h-3" />
                GERENCIAR
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : products.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-mono">
                  Nenhum produto cadastrado ainda.
                </p>
              ) : (
                <ScrollArea className="h-56 pr-2">
                  <div className="space-y-2 text-[11px] font-mono">
                    {topProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between rounded border border-border/60 px-3 py-2 hover:bg-black/40 hover:backdrop-blur-xl transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-foreground/90">{product.title}</span>
                          {product.description && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {product.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {formatBRL(product.price_cents)}
                          </span>
                          <Badge
                            variant={product.is_active ? "default" : "outline"}
                            className={
                              product.is_active
                                ? "text-[10px] uppercase tracking-[0.16em]"
                                : "text-[10px] uppercase tracking-[0.16em] opacity-60"
                            }
                          >
                            {product.is_active ? "ATIVO" : "INATIVO"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* VISÃO RÁPIDA CLIENTES & RECEITA TOTAL */}
          <Card className="glass-panel border-purple-500/20 hover:border-purple-500/60 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Clientes & Receita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1 font-mono">
                  Receita acumulada
                </p>
                {loading ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <p className="text-xl font-mono">
                    {formatBRL(kpis.totalRevenueCents)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground font-mono">
                  Últimos clientes conectados
                </p>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : recentClients.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Nenhum cliente vinculado ainda.
                  </p>
                ) : (
                  <div className="space-y-1 text-[11px] font-mono">
                    {recentClients.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded border border-border/60 px-2 py-1">
                        <span className="text-muted-foreground/90">
                          {c.client_id.slice(0, 8)}…
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Circle className="w-2 h-2 text-primary" /> ativo
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* PEDIDOS RECENTES */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-panel border-purple-500/20 hover:border-purple-500/60 transition-colors">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Pedidos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : recentOrders.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-mono">
                  Nenhum pedido registrado ainda.
                </p>
              ) : (
                <ScrollArea className="h-40 pr-2">
                  <div className="space-y-2 text-[11px] font-mono">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded border border-border/60 px-3 py-2 hover:bg-black/40 hover:backdrop-blur-xl transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-foreground/90">
                            Pedido {order.id.slice(0, 8)}…
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "--"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {formatBRL(order.total_cents)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-[0.16em] gap-1"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-purple-500/20 hover:border-purple-500/60 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                Atividade do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px] font-mono text-muted-foreground">
              <p>
                • Dashboard Dark Tech V2 conectado ao Supabase em tempo real para o
                seu vendor.
              </p>
              <p>
                • Use os atalhos acima para monitorar catálogo, clientes e fluxo de
                pedidos.
              </p>
              <p>
                • Próximos passos: filtros avançados, exportação e visão por período.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
