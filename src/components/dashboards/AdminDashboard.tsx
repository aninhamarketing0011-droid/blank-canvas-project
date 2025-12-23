import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Eye,
  Lock,
  LogOut,
  MessageSquare,
  Trash2,
  TrendingUp,
  Users,
  Network,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminDashboardProps {
  onImpersonate?: (vendorId: string) => void;
}

type Vendor = Tables<"vendors">;
type VendorClient = Tables<"vendor_clients">;
type VendorDriver = Tables<"vendor_drivers">;
type OrdersFinanceRow = Tables<"orders_finance_view">;
type AdminCommission = Tables<"admin_commissions">;
type ChatRow = Tables<"chats">;

interface VendorHierarchyNode {
  vendor: Vendor;
  clients: VendorClient[];
  drivers: VendorDriver[];
}

function formatCurrencyBRL(valueCents: number | null | undefined) {
  const value = (valueCents ?? 0) / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

export function AdminDashboard({ onImpersonate }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [hierarchy, setHierarchy] = useState<VendorHierarchyNode[]>([]);
  const [financeRows, setFinanceRows] = useState<OrdersFinanceRow[]>([]);
  const [commissions, setCommissions] = useState<AdminCommission[]>([]);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [renewDays, setRenewDays] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);

      const [vendorsRes, clientsRes, driversRes, financeRes, commissionsRes, chatsRes] =
        await Promise.all([
          supabase.from("vendors").select("*"),
          supabase.from("vendor_clients").select("*"),
          supabase.from("vendor_drivers").select("*"),
          supabase.from("orders_finance_view").select("*"),
          supabase.from("admin_commissions").select("*"),
          supabase.from("chats").select("*"),
        ]);

      if (!isMounted) return;

      const vendors = vendorsRes.data ?? [];
      const clients = clientsRes.data ?? [];
      const drivers = driversRes.data ?? [];

      const byVendor: Record<string, VendorHierarchyNode> = {};

      vendors.forEach((vendor) => {
        byVendor[vendor.id] = {
          vendor,
          clients: [],
          drivers: [],
        };
      });

      clients.forEach((client) => {
        const node = byVendor[client.vendor_id];
        if (node) node.clients.push(client);
      });

      drivers.forEach((driver) => {
        const node = byVendor[driver.vendor_id];
        if (node) node.drivers.push(driver);
      });

      setHierarchy(Object.values(byVendor));
      setFinanceRows(financeRes.data ?? []);
      setCommissions(commissionsRes.data ?? []);
      setChats(chatsRes.data ?? []);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("admin-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendors" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendor_clients" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendor_drivers" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_commissions" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const totalVendors = hierarchy.length;
  const totalClients = useMemo(
    () => hierarchy.reduce((acc, v) => acc + v.clients.length, 0),
    [hierarchy],
  );
  const totalDrivers = useMemo(
    () => hierarchy.reduce((acc, v) => acc + v.drivers.length, 0),
    [hierarchy],
  );

  const totalRevenueCents = useMemo(
    () => (financeRows ?? []).reduce((acc, r) => acc + (r.total_cents ?? 0), 0),
    [financeRows],
  );

  const totalCommissionsCents = useMemo(
    () => (commissions ?? []).reduce((acc, c) => acc + (c.commission_cents ?? 0), 0),
    [commissions],
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleToggleBlock = async (vendorId: string, currentStatus: boolean) => {
    await supabase
      .from("vendors")
      .update({ is_blocked: !currentStatus })
      .eq("id", vendorId);
  };

  const handleRenewAccess = async (vendorId: string) => {
    const daysValue = renewDays[vendorId];
    const parsed = Number(daysValue);
    if (!parsed || parsed <= 0) return;

    const now = new Date();
    now.setDate(now.getDate() + parsed);

    await supabase
      .from("vendors")
      .update({ access_expires_at: now.toISOString() })
      .eq("id", vendorId);

    setRenewDays((prev) => ({ ...prev, [vendorId]: "" }));
  };

  const financeByVendor = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    financeRows.forEach((row) => {
      if (!row.vendor_id) return;
      const current = map.get(row.vendor_id) ?? { total: 0, count: 0 };
      current.total += row.total_cents ?? 0;
      current.count += row.order_count ?? 0;
      map.set(row.vendor_id, current);
    });

    return map;
  }, [financeRows]);

  const headerStatusLabel = loading ? "SYNCING" : "SECURE";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur flex items-center justify-between px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono tracking-[0.3em] text-primary uppercase">
              SYSTEM ROOT
            </span>
            <Badge
              variant={loading ? "outline" : "secondary"}
              className="text-[10px] tracking-[0.18em] uppercase"
            >
              <span className={loading ? "text-muted-foreground" : "text-emerald-400"}>
                {headerStatusLabel}
              </span>
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono tracking-[0.18em]">
            Núcleo de controle global · Vendors, redes, finanças e monitoramento em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] tracking-[0.18em] uppercase border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-3 h-3 mr-1.5" /> SAIR
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-6 lg:px-10 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-5">
          <TabsList className="w-full justify-start bg-background/80 border border-border/60 rounded-none px-1 py-1 gap-1 overflow-x-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/60 border border-transparent text-[11px] font-mono tracking-[0.18em] rounded-none px-3 py-2"
            >
              VISÃO GERAL
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/60 border border-transparent text-[11px] font-mono tracking-[0.18em] rounded-none px-3 py-2"
            >
              REDES &amp; HIERARQUIA
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/60 border border-transparent text-[11px] font-mono tracking-[0.18em] rounded-none px-3 py-2"
            >
              FINANCEIRO
            </TabsTrigger>
            <TabsTrigger
              value="monitor"
              className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/60 border border-transparent text-[11px] font-mono tracking-[0.18em] rounded-none px-3 py-2"
            >
              MONITOR
            </TabsTrigger>
            <TabsTrigger
              value="codes"
              className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/60 border border-transparent text-[11px] font-mono tracking-[0.18em] rounded-none px-3 py-2"
            >
              CÓDIGOS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-5">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="bg-background/80 border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Vendors Ativos
                  </CardTitle>
                  <Network className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{totalVendors}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Nós principais da rede habilitados.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/80 border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Clientes em Rede
                  </CardTitle>
                  <Users className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{totalClients}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Perfis ativos vinculados a vendors.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/80 border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Frota de Motoristas
                  </CardTitle>
                  <Activity className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{totalDrivers}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Conexões diretas a vendors.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/80 border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Receita Global
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{formatCurrencyBRL(totalRevenueCents)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Total consolidado em orders_finance_view.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <Card className="bg-background/80 border-border/70 lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Top Vendors por Receita
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent className="pt-2">
                  <ScrollArea className="h-64 pr-3">
                    <div className="space-y-2">
                      {hierarchy.length === 0 && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Nenhum vendor cadastrado ainda.
                        </p>
                      )}
                      {hierarchy
                        .slice()
                        .sort((a, b) => {
                          const av = financeByVendor.get(a.vendor.id)?.total ?? 0;
                          const bv = financeByVendor.get(b.vendor.id)?.total ?? 0;
                          return bv - av;
                        })
                        .map((node) => {
                          const finance = financeByVendor.get(node.vendor.id) ?? {
                            total: 0,
                            count: 0,
                          };
                          return (
                            <div
                              key={node.vendor.id}
                              className="flex items-center justify-between border border-border/60 px-3 py-2 text-[11px] font-mono"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs">
                                  {node.vendor.display_name || "Vendor sem nome"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {node.clients.length} clientes · {node.drivers.length} motoristas
                                </span>
                              </div>
                              <div className="text-right">
                                <p>{formatCurrencyBRL(finance.total)}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {finance.count} vendas
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="bg-background/80 border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Comissões do Admin
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent className="pt-2 space-y-2">
                  <p className="text-2xl font-mono">
                    {formatCurrencyBRL(totalCommissionsCents)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Soma de todas as entradas em admin_commissions.
                  </p>
                  <div className="mt-2 border-t border-border/60 pt-2 space-y-1 text-[11px] font-mono">
                    <p className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total de vendors</span>
                      <span>{totalVendors}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-muted-foreground">Canais de chat</span>
                      <span>{chats.length}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="network" className="mt-4">
            <Card className="bg-background/80 border-border/70">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Redes &amp; Hierarquia
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Vendors como nós principais · clientes e motoristas como folhas da árvore.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <ScrollArea className="h-[540px] pr-3">
                  <div className="space-y-3">
                    {hierarchy.length === 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Nenhum vendor cadastrado.
                      </p>
                    )}
                    {hierarchy.map((node) => {
                      const isBlocked = node.vendor.is_blocked;
                      const isExpanded = expandedVendorId === node.vendor.id;
                      const expiresAt = node.vendor.access_expires_at
                        ? new Date(node.vendor.access_expires_at)
                        : null;

                      return (
                        <div
                          key={node.vendor.id}
                          className={`border px-3 py-2 transition-colors ${
                            isBlocked ? "border-destructive/70 bg-destructive/5" : "border-primary/50 bg-background/60"
                          }`}
                        >
                          <button
                            type="button"
                            className="w-full flex items-center justify-between gap-3"
                            onClick={() =>
                              setExpandedVendorId(isExpanded ? null : node.vendor.id)
                            }
                          >
                            <div className="flex items-center gap-3 text-left">
                              <div className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-xs font-mono">
                                {(node.vendor.display_name || "V").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-mono">
                                  {node.vendor.display_name || "Vendor sem nome"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ID {node.vendor.id}
                                </span>
                                {expiresAt && (
                                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    Expira em {expiresAt.toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] tracking-[0.18em] uppercase ${
                                  isBlocked ? "border-destructive text-destructive" : "border-emerald-500 text-emerald-400"
                                }`}
                              >
                                {isBlocked ? "BLOQUEADO" : "ATIVO"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {node.clients.length} C / {node.drivers.length} D
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                placeholder="Dias"
                                value={renewDays[node.vendor.id] ?? ""}
                                onChange={(e) =>
                                  setRenewDays((prev) => ({
                                    ...prev,
                                    [node.vendor.id]: e.target.value,
                                  }))
                                }
                                className="h-8 w-20 text-[11px] font-mono bg-background/80"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[10px] tracking-[0.18em] uppercase"
                                onClick={() => handleRenewAccess(node.vendor.id)}
                              >
                                RENOVAR
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-[10px] tracking-[0.18em] uppercase flex items-center gap-1.5"
                              onClick={() =>
                                handleToggleBlock(node.vendor.id, !!node.vendor.is_blocked)
                              }
                            >
                              <Lock className="w-3 h-3" />
                              {isBlocked ? "DESBLOQUEAR" : "BLOQUEAR"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-[10px] tracking-[0.18em] uppercase flex items-center gap-1.5"
                              onClick={() => onImpersonate?.(node.vendor.id)}
                            >
                              <Eye className="w-3 h-3" /> ACESSAR
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-[10px] tracking-[0.18em] uppercase flex items-center gap-1.5 border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="w-3 h-3" /> DELETAR
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 border-t border-border/60 pt-3 grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase mb-2">
                                  Clientes Vinculados
                                </p>
                                <div className="space-y-2">
                                  {node.clients.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      Nenhum cliente vinculado.
                                    </p>
                                  )}
                                  {node.clients.map((client) => (
                                    <div
                                      key={client.id}
                                      className="border border-border/60 px-2 py-1.5 text-[11px] font-mono flex items-center justify-between"
                                    >
                                      <span className="truncate mr-2">{client.client_id}</span>
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] tracking-[0.18em] uppercase"
                                      >
                                        CLIENTE
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase mb-2">
                                  Frota de Motoristas
                                </p>
                                <div className="space-y-2">
                                  {node.drivers.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                      Nenhum motorista vinculado.
                                    </p>
                                  )}
                                  {node.drivers.map((driver) => (
                                    <div
                                      key={driver.id}
                                      className="border border-border/60 px-2 py-1.5 text-[11px] font-mono flex items-center justify-between"
                                    >
                                      <span className="truncate mr-2">{driver.driver_id}</span>
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] tracking-[0.18em] uppercase"
                                      >
                                        MOTORISTA
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance" className="mt-4">
            <Card className="bg-background/80 border-border/70">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Painel Financeiro
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Consolidação de vendas por vendor a partir de orders_finance_view.
                  </p>
                </div>
                <div className="text-right text-[11px] font-mono">
                  <p className="text-muted-foreground">Receita total</p>
                  <p className="text-lg">{formatCurrencyBRL(totalRevenueCents)}</p>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <ScrollArea className="h-[520px] pr-3">
                  <div className="space-y-2">
                    {hierarchy.length === 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Nenhum vendor cadastrado.
                      </p>
                    )}
                    {hierarchy
                      .slice()
                      .sort((a, b) => {
                        const av = financeByVendor.get(a.vendor.id)?.total ?? 0;
                        const bv = financeByVendor.get(b.vendor.id)?.total ?? 0;
                        return bv - av;
                      })
                      .map((node) => {
                        const finance = financeByVendor.get(node.vendor.id) ?? {
                          total: 0,
                          count: 0,
                        };
                        return (
                          <div
                            key={node.vendor.id}
                            className="border border-border/60 px-3 py-2 flex items-center justify-between text-[11px] font-mono bg-background/60"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-[10px]">
                                {(node.vendor.display_name || "V").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span>{node.vendor.display_name || "Vendor sem nome"}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {finance.count} vendas · {node.clients.length} clientes
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm">
                                  {formatCurrencyBRL(finance.total)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Receita acumulada
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3 text-primary" /> fluxo
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-primary" /> split admin
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor" className="mt-4">
            <Card className="bg-background/80 border-border/70">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Monitor de Chats
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Conversas ativas entre vendors, clientes e drivers.
                  </p>
                </div>
                <MessageSquare className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent className="pt-2">
                <ScrollArea className="h-[520px] pr-3">
                  <div className="space-y-2">
                    {chats.length === 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Nenhum chat iniciado.
                      </p>
                    )}
                    {chats
                      .slice()
                      .sort((a, b) =>
                        (b.last_updated ?? "").localeCompare(a.last_updated ?? ""),
                      )
                      .map((chat) => (
                        <div
                          key={chat.id}
                          className="border border-border/60 px-3 py-2 flex items-center justify-between text-[11px] font-mono bg-background/60"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs">Canal {chat.id.slice(0, 8)}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {chat.last_message || "sem última mensagem"}
                            </span>
                          </div>
                          <div className="text-right text-[10px] text-muted-foreground">
                            <p>{new Date(chat.last_updated).toLocaleString("pt-BR")}</p>
                            {chat.vendor_id && (
                              <p className="mt-0.5">Vendor {chat.vendor_id.slice(0, 6)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="mt-4">
            <Card className="bg-background/80 border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Códigos &amp; Acessos
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Espaço reservado para gestão de códigos de convite e acessos avançados.
                </p>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-[11px] text-muted-foreground font-mono">
                  Implementar lógica de invite_codes e gestão avançada de acessos aqui.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
