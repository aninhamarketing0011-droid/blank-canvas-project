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

 type Profile = Tables<"profiles">;
 type VendorConnection = Tables<"vendor_connections">;
 type MessageRow = Tables<"chat_messages">;
 type OrderRow = Tables<"orders">;
 type UserRoleRow = Tables<"user_roles">;

interface VendorHierarchyNode {
  profile: Profile;
  clients: Profile[];
  drivers: Profile[];
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<VendorConnection[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [renewDays, setRenewDays] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);

      const [profilesRes, connectionsRes, messagesRes, ordersRes, rolesRes] =
        await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("vendor_connections").select("*"),
          supabase.from("chat_messages").select("*"),
          supabase.from("orders").select("*"),
          supabase.from("user_roles").select("*"),
        ]);

      if (!isMounted) return;

      setProfiles(profilesRes.data ?? []);
      setConnections(connectionsRes.data ?? []);
      setMessages(messagesRes.data ?? []);
      setOrders(ordersRes.data ?? []);
      setUserRoles(rolesRes.data ?? []);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("admin-dashboard-v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendor_connections" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const rolesByUser = useMemo(() => {
    const map = new Map<string, UserRoleRow["role"][]>();
    userRoles.forEach((r) => {
      const current = map.get(r.user_id) ?? [];
      current.push(r.role);
      map.set(r.user_id, current);
    });
    return map;
  }, [userRoles]);

  const vendorProfiles: Profile[] = useMemo(
    () =>
      profiles.filter((p) => {
        const roles = rolesByUser.get(p.id) ?? [];
        return roles.includes("vendor");
      }),
    [profiles, rolesByUser],
  );

  const vendorHierarchy: VendorHierarchyNode[] = useMemo(() => {
    return vendorProfiles.map((vendor) => {
      const vendorConns = connections.filter((c) => c.vendor_id === vendor.id);
      const clients: Profile[] = [];
      const drivers: Profile[] = [];

      vendorConns.forEach((conn) => {
        const profile = profiles.find((p) => p.id === conn.associate_id);
        if (!profile) return;
        if (conn.type === "client") clients.push(profile);
        if (conn.type === "driver") drivers.push(profile);
      });

      return { profile: vendor, clients, drivers };
    });
  }, [vendorProfiles, connections, profiles]);

  const ordersByVendor = useMemo(() => {
    const map = new Map<
      string,
      {
        totalCents: number;
        count: number;
      }
    >();

    orders.forEach((order) => {
      if (!order.vendor_id) return;
      const current = map.get(order.vendor_id) ?? { totalCents: 0, count: 0 };
      current.totalCents += order.total_cents ?? 0;
      current.count += 1;
      map.set(order.vendor_id, current);
    });

    return map;
  }, [orders]);

  const totalUsers = profiles.length;
  const totalOrders = orders.length;

  const today = new Date().toISOString().slice(0, 10);
  const ordersToday = orders.filter((o) => (o.created_at ?? "").startsWith(today));
  const totalOrdersToday = ordersToday.length;
  const revenueTodayCents = ordersToday.reduce(
    (acc, o) => acc + (o.total_cents ?? 0),
    0,
  );

  const headerStatusLabel = loading ? "SYNCING" : "SECURE";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    await supabase
      .from("profiles")
      .update({ is_blocked: !currentStatus })
      .eq("id", userId);
  };

  const handleRenewAccess = async (userId: string) => {
    const daysValue = renewDays[userId];
    const parsed = Number(daysValue);
    if (!parsed || parsed <= 0) return;

    const now = new Date();
    now.setDate(now.getDate() + parsed);

    await supabase
      .from("profiles")
      .update({ vendor_access_expires_at: now.toISOString() })
      .eq("id", userId);

    setRenewDays((prev) => ({ ...prev, [userId]: "" }));
  };

  const latestMessages = useMemo(
    () =>
      [...messages]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 32),
    [messages],
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur flex items-center justify-between px-6 py-4">
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
            Núcleo de controle global · Perfis, redes, finanças e monitoramento em tempo real.
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
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-5">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="bg-background/80 border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Usuários Totais
                  </CardTitle>
                  <Users className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{totalUsers}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Perfis ativos no sistema.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/80 border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Pedidos Totais
                  </CardTitle>
                  <Network className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{totalOrders}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Pedidos registrados em toda a rede.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/80 border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Vendas Hoje
                  </CardTitle>
                  <Activity className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{totalOrdersToday}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Pedidos com data igual ao dia atual.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/80 border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Receita de Hoje
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{formatCurrencyBRL(revenueTodayCents)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Soma total dos pedidos de hoje.
                  </p>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="network" className="mt-4">
            <ScrollArea className="h-[calc(100vh-220px)] pr-3">
              <div className="space-y-3">
                {vendorHierarchy.length === 0 && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Nenhum vendor encontrado. Atribua o papel "vendor" a usuários para começar.
                  </p>
                )}

                {vendorHierarchy.map((node) => {
                  const vendorId = node.profile.id;
                  const isExpanded = expandedVendorId === vendorId;
                  const finance = ordersByVendor.get(vendorId) ?? {
                    totalCents: 0,
                    count: 0,
                  };

                  return (
                    <div
                      key={vendorId}
                      className={`border px-4 py-3 bg-background/80 transition-colors cursor-pointer ${
                        isExpanded ? "border-primary/70" : "border-border/70"
                      } ${node.profile.is_blocked ? "opacity-60" : "opacity-100"}`}
                      onClick={() =>
                        setExpandedVendorId((prev) => (prev === vendorId ? null : vendorId))
                      }
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border border-primary/70 flex items-center justify-center text-[11px] font-mono">
                            {(node.profile.display_name || "V").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-mono">
                              {node.profile.display_name || "Vendor sem nome"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {vendorId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <Badge
                              variant="outline"
                              className="border-emerald-500/60 text-emerald-400 text-[10px] font-mono tracking-[0.16em] uppercase"
                            >
                              ONLINE
                            </Badge>
                            {node.profile.is_blocked && (
                              <Badge
                                variant="outline"
                                className="border-destructive/70 text-destructive text-[10px] font-mono tracking-[0.16em] uppercase"
                              >
                                BLOQUEADO
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="hidden md:flex flex-col items-end text-[10px] font-mono mr-3">
                            <span className="text-muted-foreground">
                              {node.clients.length} clientes · {node.drivers.length} motoristas
                            </span>
                            <span className="text-primary flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {formatCurrencyBRL(finance.totalCents)}
                            </span>
                          </div>

                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              type="number"
                              placeholder="Dias"
                              value={renewDays[vendorId] ?? ""}
                              onChange={(e) =>
                                setRenewDays((prev) => ({ ...prev, [vendorId]: e.target.value }))
                              }
                              className="w-20 h-8 text-[11px] font-mono"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[10px] font-mono tracking-[0.14em] uppercase"
                              onClick={() => handleRenewAccess(vendorId)}
                            >
                              RENOVAR
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() =>
                                handleToggleBlock(vendorId, Boolean(node.profile.is_blocked))
                              }
                            >
                              <Lock className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => {
                                if (onImpersonate) onImpersonate(vendorId);
                                console.log("ACESSAR vendor", vendorId);
                              }}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-destructive/60 text-destructive"
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  "Tem certeza que deseja deletar este vendor e suas conexões?",
                                );
                                if (!confirmed) return;

                                await supabase
                                  .from("vendor_connections")
                                  .delete()
                                  .eq("vendor_id", vendorId);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className="ml-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          className="mt-4 grid gap-4 md:grid-cols-2 text-[11px] font-mono"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                CLIENTES VINCULADOS
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {node.clients.length}
                              </span>
                            </div>
                            {node.clients.length === 0 && (
                              <p className="text-[11px] text-muted-foreground">
                                Nenhum cliente vinculado a este vendor.
                              </p>
                            )}
                            {node.clients.map((client) => (
                              <div
                                key={client.id}
                                className="border border-accent/70 bg-background/60 px-3 py-2 flex flex-col"
                              >
                                <span className="text-xs">{client.display_name || "Cliente"}</span>
                                <span className="text-[10px] text-muted-foreground">{client.id}</span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                FROTA DE MOTORISTAS
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {node.drivers.length}
                              </span>
                            </div>
                            {node.drivers.length === 0 && (
                              <p className="text-[11px] text-muted-foreground">
                                Nenhum motorista vinculado a este vendor.
                              </p>
                            )}
                            {node.drivers.map((driver) => (
                              <div
                                key={driver.id}
                                className="border border-primary/70 bg-background/60 px-3 py-2 flex flex-col"
                              >
                                <span className="text-xs">{driver.display_name || "Motorista"}</span>
                                <span className="text-[10px] text-muted-foreground">{driver.id}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="finance" className="mt-4 space-y-4">
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vendorHierarchy.length === 0 && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  Nenhum vendor encontrado para cálculos financeiros.
                </p>
              )}
              {vendorHierarchy.map((node) => {
                const vendorId = node.profile.id;
                const finance = ordersByVendor.get(vendorId) ?? {
                  totalCents: 0,
                  count: 0,
                };

                return (
                  <Card key={vendorId} className="bg-background/80 border-border/70">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                        {node.profile.display_name || "Vendor"}
                      </CardTitle>
                      <DollarSign className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent className="pt-1">
                      <p className="text-2xl font-mono mb-1">
                        {formatCurrencyBRL(finance.totalCents)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-1">
                        {finance.count} vendas registradas
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <span>
                          {node.clients.length} clientes · {node.drivers.length} motoristas conectados
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          </TabsContent>

          <TabsContent value="monitor" className="mt-4">
            <Card className="bg-background/80 border-border/70">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Monitor de Mensagens
                </CardTitle>
                <MessageSquare className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent className="pt-2">
                <ScrollArea className="h-[420px] pr-3">
                  <div className="space-y-2 text-[11px] font-mono">
                    {latestMessages.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Nenhuma mensagem registrada ainda.
                      </p>
                    )}
                    {latestMessages.map((m) => (
                      <div
                        key={m.id}
                        className="border border-border/70 bg-background/70 px-3 py-2 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {m.sender_id}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[9px] tracking-[0.16em] uppercase"
                          >
                            {m.type}
                          </Badge>
                          <span className="text-xs truncate max-w-[260px]">
                            {typeof m.content === "string"
                              ? m.content
                              : JSON.stringify(m.content).slice(0, 80)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
