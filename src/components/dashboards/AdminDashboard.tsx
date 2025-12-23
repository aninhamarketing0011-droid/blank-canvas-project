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

      const [profilesRes, connectionsRes, messagesRes, ordersRes, rolesRes] = await Promise.all([
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
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "vendor_connections" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => fetchData())
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
  const revenueTodayCents = ordersToday.reduce((acc, o) => acc + (o.total_cents ?? 0), 0);

  const headerStatusLabel = loading ? "SYNCING" : "SECURE";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    await supabase.from("profiles").update({ is_blocked: !currentStatus }).eq("id", userId);
  };

  const handleRenewAccess = async (userId: string) => {
    const daysValue = renewDays[userId];
    const parsed = Number(daysValue);
    if (!parsed || parsed <= 0) return;

    const now = new Date();
    now.setDate(now.getDate() + parsed);

    await supabase.from("profiles").update({ vendor_access_expires_at: now.toISOString() }).eq("id", userId);

    setRenewDays((prev) => ({ ...prev, [userId]: "" }));
  };

  const latestMessages = useMemo(
    () => [...messages].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 32),
    [messages],
  );

  return (
    <div className="min-h-screen text-foreground flex flex-col bg-background bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary))/0.25,_hsl(var(--background)),_hsl(var(--background)))]">
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-background/60 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono tracking-[0.3em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]">
              SYSTEM ROOT
            </span>
            <Badge
              variant={loading ? "outline" : "secondary"}
              className="text-[10px] tracking-[0.18em] uppercase px-2 py-1 border-primary/40 bg-background/60 backdrop-blur-md"
            >
              <span className={loading ? "text-muted-foreground" : "text-primary"}>{headerStatusLabel}</span>
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
            className="text-[11px] tracking-[0.18em] uppercase border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_18px_hsl(var(--destructive)/0.7)] transition-all duration-300"
            onClick={handleSignOut}
          >
            <LogOut className="w-3 h-3 mr-1.5" /> SAIR
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-6 lg:px-10 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-5">
          <TabsList className="w-full justify-start bg-background/70 border border-border/60 rounded-none px-1 py-1 gap-1 overflow-x-auto backdrop-blur-md scanline">
            <TabsTrigger
              value="overview"
              className="hover-scale border border-white/5 bg-card/60 text-[11px] font-mono tracking-[0.18em] rounded-none px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-[0_0_15px_-3px_hsl(var(--primary)/0.5)] data-[state=active]:animate-pulse-glow"
            >
              VISÃO GERAL
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="hover-scale border border-white/5 bg-card/60 text-[11px] font-mono tracking-[0.18em] rounded-none px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-[0_0_15px_-3px_hsl(var(--primary)/0.5)] data-[state=active]:animate-pulse-glow"
            >
              REDES &amp; HIERARQUIA
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="hover-scale border border-white/5 bg-card/60 text-[11px] font-mono tracking-[0.18em] rounded-none px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-[0_0_15px_-3px_hsl(var(--primary)/0.5)] data-[state=active]:animate-pulse-glow"
            >
              FINANCEIRO
            </TabsTrigger>
            <TabsTrigger
              value="monitor"
              className="hover-scale border border-white/5 bg-card/60 text-[11px] font-mono tracking-[0.18em] rounded-none px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-[0_0_15px_-3px_hsl(var(--primary)/0.5)] data-[state=active]:animate-pulse-glow"
            >
              MONITOR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-5 animate-fade-in">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="group bg-card/80 backdrop-blur-md border border-border/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-primary hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.6)] hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Usuários Totais
                  </CardTitle>
                  <Users className="w-4 h-4 text-primary group-hover:animate-pulse-glow" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{totalUsers}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Perfis ativos no sistema.</p>
                </CardContent>
              </Card>

              <Card className="group bg-card/80 backdrop-blur-md border border-border/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-secondary hover:shadow-[0_0_20px_-5px_hsl(var(--secondary)/0.6)] hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Pedidos Totais
                  </CardTitle>
                  <Network className="w-4 h-4 text-secondary group-hover:animate-pulse-glow" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{totalOrders}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Pedidos registrados em toda a rede.</p>
                </CardContent>
              </Card>

              <Card className="group bg-card/80 backdrop-blur-md border border-border/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-accent hover:shadow-[0_0_20px_-5px_hsl(var(--accent)/0.6)] hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Vendas Hoje
                  </CardTitle>
                  <Activity className="w-4 h-4 text-accent group-hover:animate-pulse-glow" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{totalOrdersToday}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Pedidos com data igual ao dia atual.</p>
                </CardContent>
              </Card>

              <Card className="group bg-card/80 backdrop-blur-md border border-border/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-primary hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.7)] hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                    Receita de Hoje
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-primary group-hover:animate-pulse-glow" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-mono">{formatCurrencyBRL(revenueTodayCents)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Soma total dos pedidos de hoje.</p>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="network" className="mt-4">
            <ScrollArea className="h-[calc(100vh-220px)] pr-3">
              <div className="space-y-3">
                {vendorHierarchy.length === 0 && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Nenhum vendor encontrado. Atribua o papel &quot;vendor&quot; a usuários para começar.
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
                      className={`group border px-4 py-3 bg-card/80 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300 cursor-pointer hover:border-accent hover:shadow-[0_0_20px_-5px_hsl(var(--accent)/0.6)] hover:-translate-y-1 ${
                        isExpanded ? "border-accent" : "border-border/70"
                      } ${node.profile.is_blocked ? "opacity-60" : "opacity-100"}`}
                      onClick={() => setExpandedVendorId((prev) => (prev === vendorId ? null : vendorId))}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full border border-accent flex items-center justify-center text-[11px] font-mono bg-background/80 shadow-[0_0_18px_hsl(var(--accent)/0.5)]">
                            {(node.profile.display_name || "V").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-mono">{node.profile.display_name || "Vendor sem nome"}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{vendorId}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <Badge
                              variant="outline"
                              className="border-primary/70 text-primary text-[10px] font-mono tracking-[0.16em] uppercase bg-background/80"
                            >
                              ONLINE
                            </Badge>
                            {node.profile.is_blocked && (
                              <Badge
                                variant="outline"
                                className="border-destructive/70 text-destructive text-[10px] font-mono tracking-[0.16em] uppercase bg-background/80 shadow-[0_0_16px_hsl(var(--destructive)/0.6)]"
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

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              placeholder="Dias"
                              value={renewDays[vendorId] ?? ""}
                              onChange={(e) => setRenewDays((prev) => ({ ...prev, [vendorId]: e.target.value }))}
                              className="w-20 h-8 text-[11px] font-mono bg-background/80 border-border/70"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[10px] font-mono tracking-[0.14em] uppercase hover:border-primary hover:text-primary hover:shadow-[0_0_14px_hsl(var(--primary)/0.6)]"
                              onClick={() => handleRenewAccess(vendorId)}
                            >
                              RENOVAR
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 hover:border-destructive hover:text-destructive hover:shadow-[0_0_16px_hsl(var(--destructive)/0.6)]"
                              onClick={() => handleToggleBlock(vendorId, Boolean(node.profile.is_blocked))}
                            >
                              <Lock className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 hover:border-secondary hover:text-secondary hover:shadow-[0_0_16px_hsl(var(--secondary)/0.6)]"
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
                              className="h-8 w-8 border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_18px_hsl(var(--destructive)/0.7)]"
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  "Tem certeza que deseja deletar as conexões deste vendor?",
                                );
                                if (!confirmed) return;

                                await supabase.from("vendor_connections").delete().eq("vendor_id", vendorId);
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
                              <span className="text-[10px] text-muted-foreground">{node.clients.length}</span>
                            </div>
                            {node.clients.length === 0 && (
                              <p className="text-[11px] text-muted-foreground">
                                Nenhum cliente vinculado a este vendor.
                              </p>
                            )}
                            {node.clients.map((client) => (
                              <div
                                key={client.id}
                                className="border border-secondary bg-background/60 px-3 py-2 flex flex-col rounded-lg shadow-[0_0_14px_-6px_hsl(var(--secondary)/0.6)]"
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
                              <span className="text-[10px] text-muted-foreground">{node.drivers.length}</span>
                            </div>
                            {node.drivers.length === 0 && (
                              <p className="text-[11px] text-muted-foreground">
                                Nenhum motorista vinculado a este vendor.
                              </p>
                            )}
                            {node.drivers.map((driver) => (
                              <div
                                key={driver.id}
                                className="border border-primary bg-background/60 px-3 py-2 flex flex-col rounded-lg shadow-[0_0_14px_-6px_hsl(var(--primary)/0.6)]"
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

          <TabsContent value="finance" className="mt-4 space-y-4 animate-fade-in">
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
                  <Card
                    key={vendorId}
                    className="group bg-card/80 backdrop-blur-md border border-border/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-primary hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.6)] hover:-translate-y-1"
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                        {node.profile.display_name || "Vendor"}
                      </CardTitle>
                      <DollarSign className="w-4 h-4 text-primary group-hover:animate-pulse-glow" />
                    </CardHeader>
                    <CardContent className="pt-1">
                      <p className="text-2xl font-mono mb-1">{formatCurrencyBRL(finance.totalCents)}</p>
                      <p className="text-[11px] text-muted-foreground mb-1">{finance.count} vendas registradas</p>
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

          <TabsContent value="monitor" className="mt-4 animate-fade-in">
            <Card className="group bg-card/80 backdrop-blur-md border border-border/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-secondary hover:shadow-[0_0_20px_-5px_hsl(var(--secondary)/0.6)]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                  Monitor de Mensagens
                </CardTitle>
                <MessageSquare className="w-4 h-4 text-secondary group-hover:animate-pulse-glow" />
              </CardHeader>
              <CardContent className="pt-2">
                <ScrollArea className="h-[420px] pr-3">
                  <div className="space-y-2 text-[11px] font-mono">
                    {latestMessages.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">Nenhuma mensagem registrada ainda.</p>
                    )}
                    {latestMessages.map((m) => (
                      <div
                        key={m.id}
                        className="border border-border/70 bg-background/70 px-3 py-2 flex flex-col gap-1 hover:border-secondary hover:shadow-[0_0_16px_-6px_hsl(var(--secondary)/0.6)] transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{m.sender_id}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] tracking-[0.16em] uppercase">
                            {m.type}
                          </Badge>
                          <span className="text-xs truncate max-w-[260px]">
                            {typeof m.content === "string" ? m.content : JSON.stringify(m.content).slice(0, 80)}
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
