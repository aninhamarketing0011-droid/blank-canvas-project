import { useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Clock3,
  Clipboard,
  DollarSign,
  Eye,
  KeyRound,
  Lock,
  LogOut,
  MessageSquare,
  Network,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";

interface AdminDashboardProps {
  onImpersonate?: (vendorId: string) => void;
}

function formatCurrencyBRL(valueCents: number | null | undefined) {
  const value = (valueCents ?? 0) / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function getExpiryLabel(expiresAt: string | null) {
  if (!expiresAt) return "SEM EXPIRAÇÃO";
  const now = new Date();
  const target = new Date(expiresAt);
  const diffMs = target.getTime() - now.getTime();

  if (Number.isNaN(diffMs)) return "DATA INVÁLIDA";
  if (diffMs <= 0) return "EXPIRADO";

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days <= 0) return `Expira em ${hours}h`;
  return `Expira em ${days}d ${hours}h`;
}

export function AdminDashboard({ onImpersonate }: AdminDashboardProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("network");
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [renewDays, setRenewDays] = useState<Record<string, string>>({});
  const [commissionRate, setCommissionRate] = useState<Record<string, string>>({});
  const [pinModalVendorId, setPinModalVendorId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null);

  const {
    loading,
    profiles,
    connections,
    latestMessages,
    orders,
    userRoles,
    adminCommissions,
    inviteCodes,
    rolesByUser,
    vendorProfiles,
    vendorHierarchy,
    ordersByVendor,
    commissionsByVendor,
    totalUsers,
    totalOrders,
    totalOrdersToday,
    revenueTodayCents,
    headerStatusLabel,
  } = useAdminDashboardData();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !currentStatus }).eq("id", userId);

    if (error) {
      toast({
        title: "Falha ao atualizar bloqueio",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: !currentStatus ? "Usuário bloqueado" : "Usuário desbloqueado",
      description: `Acesso de ${userId} atualizado com sucesso.`,
    });
  };

  const handleRenewAccess = async (userId: string) => {
    const daysValue = renewDays[userId];
    const parsed = Number(daysValue);
    if (!parsed || parsed <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um número de dias maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    now.setDate(now.getDate() + parsed);

    const { error } = await supabase
      .from("profiles")
      .update({ vendor_access_expires_at: now.toISOString() })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Falha ao renovar acesso",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setRenewDays((prev) => ({ ...prev, [userId]: "" }));

    toast({
      title: "Acesso renovado",
      description: `${parsed} dias adicionados ao acesso do vendor.`,
    });
  };

  const handleSaveCommissionRate = async (vendorId: string) => {
    const value = commissionRate[vendorId];
    const parsed = Number(value?.replace(",", "."));

    if (isNaN(parsed) || parsed < 0) {
      toast({
        title: "Valor inválido",
        description: "Informe % válida.",
        variant: "destructive",
      });
      return;
    }

    const rateDecimal = parsed / 100;

    // FIX CRÍTICO: Agora salva em 'profiles', coluna 'commission_rate'
    const { error } = await supabase
      .from("profiles")
      .update({ commission_rate: rateDecimal } as any)
      .eq("id", vendorId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Sucesso",
        description: `Taxa de ${parsed}% salva no perfil do Vendedor.`,
        className: "bg-green-500/10 border-green-500 text-green-400",
      });
      setCommissionRate((prev) => ({ ...prev, [vendorId]: "" }));
    }
  };

  const handleResetPin = async () => {
    if (!pinModalVendorId) return;

    if (!newPin || newPin.length < 4 || newPin.length > 8) {
      toast({
        title: "PIN inválido",
        description: "Use entre 4 e 8 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(newPin);
      const digest = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(digest));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase
        .from("profiles")
        .update({ pin_hash: hashHex, failed_attempts: 0, is_locked: false })
        .eq("id", pinModalVendorId);

      if (error) {
        toast({
          title: "Falha ao redefinir PIN",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "PIN redefinido",
        description: "O PIN foi atualizado com sucesso.",
      });

      setNewPin("");
      setPinModalVendorId(null);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível gerar o hash do PIN.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);

    const random = Math.floor(1000 + Math.random() * 9000);
    const code = `NEON-${random}`;

    const { data, error } = await supabase
      .from("invite_codes")
      .insert({ code, role: "vendor", status: "available" })
      .select()
      .single();

    setGeneratingInvite(false);

    if (error) {
      toast({
        title: "Falha ao gerar convite",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setGeneratedInviteCode(data.code);
    toast({
      title: "Convite gerado",
      description: `Código ${data.code} criado com sucesso.`,
    });
  };


  const copyInviteToClipboard = async () => {
    if (!generatedInviteCode) return;
    await navigator.clipboard.writeText(generatedInviteCode);
    toast({
      title: "Copiado",
      description: "Código de convite copiado para a área de transferência.",
    });
  };

  return (
    <div className="min-h-screen text-foreground flex flex-col bg-[radial-gradient(circle_at_center,_hsl(var(--primary))/0.18,_hsl(var(--background))_55%,_black)]">
      {/* HEADER */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-primary/30 bg-black/40 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.9)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono tracking-[0.3em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)] glitch-text">
              SYSTEM ROOT
            </span>
            <Badge
              variant={loading ? "outline" : "secondary"}
              className="text-[10px] tracking-[0.18em] uppercase px-2 py-1 border-primary/60 bg-background/60 backdrop-blur-md flex items-center gap-1"
            >
              <span
                className={
                  loading
                    ? "w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"
                    : "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"
                }
              />
              <span className={loading ? "text-amber-300" : "text-primary"}>{headerStatusLabel}</span>
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono tracking-[0.18em]">
            Núcleo de controle global · Perfis, hierarquia, finanças e credenciais em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] tracking-[0.18em] uppercase border-destructive/70 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_20px_hsl(var(--destructive)/0.7)] transition-all duration-300 font-mono"
            onClick={handleSignOut}
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> SAIR
          </Button>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 px-4 md:px-6 lg:px-10 py-5">
        <div className="glass-panel rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl p-3 md:p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-5">
            <TabsList className="w-full justify-start bg-transparent border-b border-border/80 rounded-none px-1 pb-2 gap-1 overflow-x-auto scanline">
              <TabsTrigger
                value="overview"
                className="border border-white/5 bg-background/70 text-[11px] font-mono tracking-[0.18em] rounded-full px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary/60 transition-all duration-300 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-[0_0_16px_hsl(var(--primary)/0.6)] data-[state=active]:animate-pulse-glow"
              >
                VISÃO GERAL
              </TabsTrigger>
              <TabsTrigger
                value="network"
                className="border border-white/5 bg-background/70 text-[11px] font-mono tracking-[0.18em] rounded-full px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary/60 transition-all duration-300 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-[0_0_16px_hsl(var(--primary)/0.6)] data-[state=active]:animate-pulse-glow"
              >
                REDES &amp; HIERARQUIA
              </TabsTrigger>
              <TabsTrigger
                value="finance"
                className="border border-white/5 bg-background/70 text-[11px] font-mono tracking-[0.18em] rounded-full px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary/60 transition-all duration-300 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-[0_0_16px_hsl(var(--primary)/0.6)] data-[state=active]:animate-pulse-glow"
              >
                FINANCEIRO
              </TabsTrigger>
              <TabsTrigger
                value="monitor"
                className="border border-white/5 bg-background/70 text-[11px] font-mono tracking-[0.18em] rounded-full px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary/60 transition-all duration-300 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:shadow-[0_0_16px_hsl(var(--primary)/0.6)] data-[state=active]:animate-pulse-glow"
              >
                MONITOR
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-4 space-y-5 animate-fade-in">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl group transition-all duration-300 hover:border-primary hover:shadow-[0_0_22px_hsl(var(--primary)/0.7)] hover:-translate-y-1">
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

                <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl group transition-all duration-300 hover:border-secondary hover:shadow-[0_0_22px_hsl(var(--secondary)/0.7)] hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                      Pedidos Totais
                    </CardTitle>
                    <TrendingUp className="w-4 h-4 text-secondary group-hover:animate-pulse-glow" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-mono">{totalOrders}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Pedidos registrados em toda a rede.</p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl group transition-all duration-300 hover:border-accent hover:shadow-[0_0_22px_hsl(var(--accent)/0.7)] hover:-translate-y-1">
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

                <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl group transition-all duration-300 hover:border-primary hover:shadow-[0_0_26px_hsl(var(--primary)/0.8)] hover:-translate-y-1">
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

              {/* Gerador de Convites */}
              <section className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
                <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl flex flex-col justify-between">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                        Gerador de Convites
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Crie códigos de convite exclusivos para novos vendors da rede.
                      </p>
                    </div>
                    <ShieldAlert className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                      <Button
                        onClick={handleGenerateInvite}
                        disabled={generatingInvite}
                        className="bg-primary/10 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--primary)/0.6)] transition-all duration-300 font-mono tracking-[0.18em] uppercase text-[11px]"
                      >
                        {generatingInvite ? "Gerando..." : "Gerar Código Vendedor"}
                      </Button>
                      {generatedInviteCode && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm bg-background/60 px-3 py-1 rounded-lg border border-primary/40">
                            {generatedInviteCode}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={copyInviteToClipboard}
                            className="border-secondary/60 text-secondary hover:bg-secondary hover:text-secondary-foreground hover:shadow-[0_0_18px_hsl(var(--secondary)/0.6)]"
                          >
                            <Clipboard className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Todos os convites são registrados na tabela <span className="text-primary">invite_codes</span> com
                      role <span className="text-primary">vendor</span>.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                      Convites Recentes
                    </CardTitle>
                    <Network className="w-4 h-4 text-secondary" />
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-40 pr-2">
                      <div className="space-y-2">
                        {inviteCodes.length === 0 && (
                          <p className="text-[11px] text-muted-foreground font-mono">
                            Nenhum convite gerado até o momento.
                          </p>
                        )}
                        {[...inviteCodes]
                          .sort((a, b) => b.created_at.localeCompare(a.created_at))
                          .slice(0, 8)
                          .map((invite) => (
                            <div
                              key={invite.id}
                              className="flex items-center justify-between text-xs font-mono bg-background/70 border border-border/70 rounded-lg px-3 py-1.5"
                            >
                              <div className="flex flex-col">
                                <span className="text-primary">{invite.code}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                                  {invite.status.toUpperCase()} · {invite.role.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {invite.created_at?.slice(0, 10) ?? ""}
                              </span>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </section>
            </TabsContent>

            {/* NETWORK TAB */}
            <TabsContent value="network" className="mt-4">
              <ScrollArea className="h-[calc(100vh-260px)] pr-3">
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
                    const commission = commissionsByVendor.get(vendorId) ?? {
                      totalCommissionCents: 0,
                      lastRate: null,
                    };

                    const expiresLabel = getExpiryLabel(node.profile.vendor_access_expires_at);

                    return (
                      <div
                        key={vendorId}
                        className={`bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 group overflow-hidden ${
                          node.profile.is_blocked
                            ? "opacity-60 grayscale-[0.3] border-destructive/60"
                            : "hover:border-accent hover:shadow-[0_0_24px_hsl(var(--accent)/0.7)] hover:-translate-y-1"
                        }`}
                      >
                        {/* HEADER ROW */}
                        <div className="flex flex-col gap-3 px-4 py-3 border-b border-white/5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setExpandedVendorId((prev) => (prev === vendorId ? null : vendorId))}
                                className="flex items-center justify-center w-7 h-7 rounded-full border border-accent text-accent bg-background/80 shadow-[0_0_18px_hsl(var(--accent)/0.5)] hover:bg-accent hover:text-accent-foreground transition-all duration-300"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex flex-col">
                                <span className="text-sm font-mono">
                                  {node.profile.display_name || "Vendor sem nome"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {vendorId}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
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

                            <div className="hidden md:flex flex-col items-end text-[10px] font-mono mr-2">
                              <span className="text-muted-foreground">
                                {node.clients.length} clientes · {node.drivers.length} motoristas
                              </span>
                              <span className="text-primary mt-0.5">{formatCurrencyBRL(finance.totalCents)} total</span>
                            </div>
                          </div>

                          {/* ACTIONS ROW */}
                          <div className="flex flex-wrap items-center gap-2 justify-between">
                            <div className="flex flex-wrap gap-2 items-center">
                              <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                                <Clock3 className="w-3.5 h-3.5 text-secondary" />
                                <span
                                  className={
                                    expiresLabel === "EXPIRADO"
                                      ? "text-destructive animate-pulse font-semibold"
                                      : "text-secondary"
                                  }
                                >
                                  {expiresLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={renewDays[vendorId] ?? ""}
                                  onChange={(e) =>
                                    setRenewDays((prev) => ({ ...prev, [vendorId]: e.target.value }))
                                  }
                                  placeholder="+Dias acesso"
                                  className="w-28 bg-black/50 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-lg text-xs font-mono text-foreground h-8 px-2"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleRenewAccess(vendorId)}
                                  className="h-8 px-3 bg-primary/10 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_18px_hsl(var(--primary)/0.6)] transition-all duration-300 text-[10px] font-mono tracking-[0.16em] uppercase"
                                >
                                  RENOVAR
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={commissionRate[vendorId] ?? (commissionsByVendor.get(vendorId)?.lastRate
                                    ? String((commissionsByVendor.get(vendorId)!.lastRate! * 100).toFixed(2))
                                    : "")}
                                  onChange={(e) =>
                                    setCommissionRate((prev) => ({ ...prev, [vendorId]: e.target.value }))
                                  }
                                  placeholder="% Comissão Admin"
                                  className="w-32 bg-black/50 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-lg text-xs font-mono text-foreground h-8 px-2"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveCommissionRate(vendorId)}
                                  className="h-8 px-3 bg-primary/10 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--primary)/0.6)] transition-all duration-300 text-[10px] font-mono tracking-[0.16em] uppercase"
                                >
                                  SALVAR
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center justify-end">
                              <Button
                                size="icon"
                                variant="outline"
                                className="w-8 h-8 border-secondary/60 text-secondary hover:bg-secondary hover:text-secondary-foreground hover:shadow-[0_0_18px_hsl(var(--secondary)/0.6)]"
                                onClick={() => onImpersonate?.(vendorId)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="w-8 h-8 border-accent/60 text-accent hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_18px_hsl(var(--accent)/0.6)]"
                                onClick={() => setPinModalVendorId(vendorId)}
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className={`w-8 h-8 border-red-500/50 text-red-400 hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_18px_rgba(239,68,68,0.8)] transition-all duration-300`}
                                onClick={() => handleToggleBlock(vendorId, !!node.profile.is_blocked)}
                              >
                                {node.profile.is_blocked ? (
                                  <Unlock className="w-4 h-4" />
                                ) : (
                                  <Lock className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="w-8 h-8 border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_18px_hsl(var(--destructive)/0.7)]"
                                onClick={() =>
                                  toast({
                                    title: "Ação não implementada",
                                    description:
                                      "Remoção física de vendors deve ser feita via ferramenta de administração de dados.",
                                  })
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* COMMISSION SUMMARY */}
                          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-muted-foreground">
                            <div>
                              <span className="uppercase tracking-[0.16em]">Acumulado a pagar:&nbsp;</span>
                              <span className="text-primary">
                                {formatCurrencyBRL(commission.totalCommissionCents)}
                              </span>
                            </div>
                            {commission.lastRate !== null && (
                              <div className="flex items-center gap-1">
                                <span className="uppercase tracking-[0.16em]">Comissão atual:</span>
                                <span className="text-secondary">
                                  {(commission.lastRate * 100).toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* EXPANDED CONTENT */}
                        {isExpanded && (
                          <div className="grid md:grid-cols-2 gap-4 px-4 py-3 bg-background/40">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono tracking-[0.18em] text-secondary uppercase">
                                  CLIENTES VINCULADOS
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {node.clients.length} perfis
                                </span>
                              </div>
                              <div className="space-y-1">
                                {node.clients.length === 0 && (
                                  <p className="text-[11px] text-muted-foreground font-mono">
                                    Nenhum cliente vinculado a este vendor.
                                  </p>
                                )}
                                {node.clients.map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-secondary/40 bg-background/70 text-xs font-mono"
                                  >
                                    <span>{c.display_name || "Cliente"}</span>
                                    <span className="text-[10px] text-muted-foreground">{c.id.slice(0, 8)}...</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono tracking-[0.18em] text-amber-300 uppercase">
                                  FROTA DE MOTORISTAS
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {node.drivers.length} perfis
                                </span>
                              </div>
                              <div className="space-y-1">
                                {node.drivers.length === 0 && (
                                  <p className="text-[11px] text-muted-foreground font-mono">
                                    Nenhum motorista vinculado a este vendor.
                                  </p>
                                )}
                                {node.drivers.map((d) => (
                                  <div
                                    key={d.id}
                                    className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-amber-400/50 bg-background/70 text-xs font-mono"
                                  >
                                    <span>{d.display_name || "Motorista"}</span>
                                    <span className="text-[10px] text-muted-foreground">{d.id.slice(0, 8)}...</span>
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
            </TabsContent>

            {/* FINANCE TAB */}
            <TabsContent value="finance" className="mt-4 space-y-4">
              <section className="grid gap-4 md:grid-cols-3">
                <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                        Receita Total
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Somatório de todos os pedidos (bruto).</p>
                    </div>
                    <DollarSign className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-mono">
                      {formatCurrencyBRL(orders.reduce((acc, o) => acc + (o.total_cents ?? 0), 0))}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                        Comissão Admin
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Baseada na tabela admin_commissions.</p>
                    </div>
                    <ShieldAlert className="w-5 h-5 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-mono">
                      {formatCurrencyBRL(
                        adminCommissions.reduce((acc, c) => acc + (c.commission_cents ?? 0), 0),
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-[10px] tracking-[0.22em] text-muted-foreground font-mono uppercase">
                        Pedidos Pendentes
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Pedidos com pagamento em aberto.</p>
                    </div>
                    <Clock3 className="w-5 h-5 text-amber-300" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-mono">
                      {orders.filter((o) => o.payment_status === "pending").length}
                    </p>
                  </CardContent>
                </Card>
              </section>

              <section className="glass-panel rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono tracking-[0.18em] text-muted-foreground uppercase">
                    FINANCEIRO POR VENDOR
                  </h3>
                  <Network className="w-4 h-4 text-secondary" />
                </div>
                <ScrollArea className="h-72 pr-3">
                  <div className="space-y-2">
                    {vendorHierarchy.length === 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Nenhum vendor para exibir.
                      </p>
                    )}
                    {vendorHierarchy.map((node) => {
                      const vendorId = node.profile.id;
                      const finance = ordersByVendor.get(vendorId) ?? {
                        totalCents: 0,
                        count: 0,
                      };
                      const commission = commissionsByVendor.get(vendorId) ?? {
                        totalCommissionCents: 0,
                        lastRate: null,
                      };

                      return (
                        <div
                          key={vendorId}
                          className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 bg-background/70 text-xs font-mono hover:border-primary/60 hover:shadow-[0_0_18px_hsl(var(--primary)/0.5)] transition-all duration-300"
                        >
                          <div className="flex flex-col">
                            <span>{node.profile.display_name || "Vendor"}</span>
                            <span className="text-[10px] text-muted-foreground">{vendorId.slice(0, 10)}...</span>
                          </div>
                          <div className="flex flex-wrap gap-4 items-center text-[11px]">
                            <div>
                              <span className="text-muted-foreground mr-1">Total vendido:</span>
                              <span className="text-primary">{formatCurrencyBRL(finance.totalCents)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground mr-1">Comissão admin:</span>
                              <span className="text-accent">
                                {formatCurrencyBRL(commission.totalCommissionCents)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground mr-1">Pedidos:</span>
                              <span>{finance.count}</span>
                            </div>
                            {commission.lastRate !== null && (
                              <div>
                                <span className="text-muted-foreground mr-1">Rate:</span>
                                <span className="text-secondary">
                                  {(commission.lastRate * 100).toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </section>
            </TabsContent>

            {/* MONITOR TAB */}
            <TabsContent value="monitor" className="mt-4">
              <section className="glass-panel rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono tracking-[0.18em] text-muted-foreground uppercase">
                    MONITOR DE MENSAGENS
                  </h3>
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <ScrollArea className="h-[calc(100vh-260px)] pr-3">
                  <div className="space-y-2">
                    {latestMessages.length === 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Nenhuma mensagem registrada.
                      </p>
                    )}

                    {latestMessages.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-white/10 bg-background/70 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            Chat: {m.chat_id.slice(0, 8)}... · Remetente: {m.sender_id.slice(0, 8)}...
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {m.created_at.slice(0, 19).replace("T", " ")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="uppercase text-[10px] tracking-[0.18em] text-primary">
                            {m.type.toUpperCase()}
                          </span>
                          {m.is_read ? (
                            <span className="text-[10px] text-secondary">LIDA</span>
                          ) : (
                            <span className="text-[10px] text-amber-300">NÃO LIDA</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* PIN RESET MODAL (simple overlay) */}
      {pinModalVendorId && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="bg-black/70 border border-primary/40 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono tracking-[0.2em] text-primary uppercase">
                Redefinir PIN de Acesso
              </h2>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 border-border text-muted-foreground hover:bg-background"
                onClick={() => {
                  setPinModalVendorId(null);
                  setNewPin("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Defina um novo PIN numérico para o vendor selecionado. O valor será armazenado de forma hash (SHA-256).
            </p>
            <Input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Novo PIN (4-8 dígitos)"
              className="bg-black/50 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-lg text-white"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-border text-muted-foreground hover:bg-background"
                onClick={() => {
                  setPinModalVendorId(null);
                  setNewPin("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleResetPin}
                className="bg-primary/10 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--primary)/0.6)] transition-all duration-300"
              >
                Salvar PIN
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
