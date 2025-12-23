import { useEffect, useMemo, useState } from "react";
import { Shield, UserCircle2, Users, Timer, Lock, Unlock, ShoppingBag, Truck, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface VendorLink {
  id: string;
  user_id: string;
  is_blocked: boolean;
  access_expires_at: string | null;
  created_at: string;
}

interface VendorNode {
  id: string;
  display_name: string | null;
  is_blocked: boolean;
  access_expires_at: string | null;
  mercado_pago_enabled: boolean;
  created_at: string;
  clients: VendorLink[];
  drivers: VendorLink[];
}

type AdminTab = "visao" | "redes" | "financeiro" | "monitor" | "codigos";


export default function Dashboard() {
  const { user, loading } = useSupabaseAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [adminTab, setAdminTab] = useState<AdminTab>("visao");
  const [vendors, setVendors] = useState<VendorNode[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeRows, setFinanceRows] = useState<
    { vendor_id: string; total_cents: number; order_count: number; total_commission_cents: number }[]
  >([]);
  const [timerInputs, setTimerInputs] = useState<Record<string, string>>({});
  const [vendorProfile, setVendorProfile] = useState<{
    is_blocked: boolean;
    vendor_access_expires_at: string | null;
  } | null>(null);
  const [vendorAccessStatus, setVendorAccessStatus] = useState<
    "blocked" | "expired" | "no_timer" | "active"
  >("no_timer");
  const [vendorRemainingText, setVendorRemainingText] = useState<string>("");
  const [vendorTab, setVendorTab] = useState<"dashboard" | "monitor" | "users">("dashboard");

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const [{ data: rolesData, error: rolesError }, { data: profileData, error: profileError }] =
        await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase
            .from("profiles")
            .select("display_name, username, is_blocked, vendor_access_expires_at")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

      if (rolesError || profileError) {
        throw new Error("Erro ao carregar dados");
      }

      setRoles(rolesData?.map((r) => r.role) ?? []);
      setDisplayName(
        profileData?.display_name ||
          profileData?.username ||
          user.email?.split("@")[0]?.toUpperCase() ||
          "OPERADOR",
      );
      setVendorProfile(
        profileData
          ? {
              is_blocked: profileData.is_blocked ?? false,
              vendor_access_expires_at: profileData.vendor_access_expires_at ?? null,
            }
          : null,
      );
    };

    loadData().catch(() => {
      toast({
        title: "Erro ao carregar painel",
        description: "Não foi possível carregar seus dados de acesso.",
        variant: "destructive",
      });
    });
  }, [user, toast]);

  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (!isAdmin) return;

    const loadVendorsHierarchy = async () => {
      setLoadingVendors(true);
      try {
        const [vendorsRes, clientsRes, driversRes] = await Promise.all([
          supabase
            .from("vendors")
            .select("id, display_name, is_blocked, access_expires_at, mercado_pago_enabled, created_at"),
          supabase
            .from("vendor_clients")
            .select("id, vendor_id, client_id, is_blocked, access_expires_at, created_at"),
          supabase
            .from("vendor_drivers")
            .select("id, vendor_id, driver_id, is_blocked, access_expires_at, created_at"),
        ]);

        if (vendorsRes.error) throw vendorsRes.error;
        if (clientsRes.error) throw clientsRes.error;
        if (driversRes.error) throw driversRes.error;

        const vendorBase: Record<string, VendorNode> = {};

        (vendorsRes.data ?? []).forEach((v: any) => {
          vendorBase[v.id as string] = {
            id: v.id as string,
            display_name: (v.display_name as string | null) ?? null,
            is_blocked: (v.is_blocked as boolean) ?? false,
            access_expires_at: (v.access_expires_at as string | null) ?? null,
            mercado_pago_enabled: (v.mercado_pago_enabled as boolean) ?? false,
            created_at: v.created_at as string,
            clients: [],
            drivers: [],
          };
        });

        const clientsByVendor: Record<string, VendorLink[]> = {};
        (clientsRes.data ?? []).forEach((c: any) => {
          const vendorId = c.vendor_id as string;
          if (!clientsByVendor[vendorId]) clientsByVendor[vendorId] = [];
          clientsByVendor[vendorId].push({
            id: c.id as string,
            user_id: c.client_id as string,
            is_blocked: (c.is_blocked as boolean) ?? false,
            access_expires_at: (c.access_expires_at as string | null) ?? null,
            created_at: c.created_at as string,
          });
        });

        const driversByVendor: Record<string, VendorLink[]> = {};
        (driversRes.data ?? []).forEach((d: any) => {
          const vendorId = d.vendor_id as string;
          if (!driversByVendor[vendorId]) driversByVendor[vendorId] = [];
          driversByVendor[vendorId].push({
            id: d.id as string,
            user_id: d.driver_id as string,
            is_blocked: (d.is_blocked as boolean) ?? false,
            access_expires_at: (d.access_expires_at as string | null) ?? null,
            created_at: d.created_at as string,
          });
        });

        Object.values(vendorBase).forEach((v) => {
          v.clients = clientsByVendor[v.id] ?? [];
          v.drivers = driversByVendor[v.id] ?? [];
        });

        setVendors(Object.values(vendorBase));
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a hierarquia de vendedores.",
          variant: "destructive",
        });
      } finally {
        setLoadingVendors(false);
      }
    };

    loadVendorsHierarchy();
  }, [isAdmin, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const handleTimerChange = (vendorId: string, value: string) => {
    setTimerInputs((prev) => ({ ...prev, [vendorId]: value }));
  };

  const handleUpdateVendorTimer = async (vendorId: string) => {
    const days = Number(timerInputs[vendorId] ?? "");
    if (!Number.isFinite(days) || days <= 0) {
      toast({
        title: "Dias inválidos",
        description: "Informe um número de dias maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({ vendor_access_expires_at: expiresAt })
      .eq("id", vendorId);

    if (error) {
      toast({
        title: "Erro ao configurar timer",
        description: "Não foi possível atualizar o tempo de acesso do vendedor.",
        variant: "destructive",
      });
      return;
    }

    setVendors((prev) =>
      prev.map((v) => (v.id === vendorId ? { ...v, vendor_access_expires_at: expiresAt } : v)),
    );

    toast({
      title: "Timer atualizado",
      description: "O tempo de acesso do vendedor foi configurado com sucesso.",
    });
  };

  const handleToggleVendorBlock = async (vendorId: string, currentlyBlocked: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: !currentlyBlocked })
      .eq("id", vendorId);

    if (error) {
      toast({
        title: "Erro ao atualizar bloqueio",
        description: "Não foi possível alterar o status de bloqueio do vendedor.",
        variant: "destructive",
      });
      return;
    }

    setVendors((prev) =>
      prev.map((v) => (v.id === vendorId ? { ...v, is_blocked: !currentlyBlocked } : v)),
    );

    toast({
      title: currentlyBlocked ? "Vendedor desbloqueado" : "Vendedor bloqueado",
      description: currentlyBlocked
        ? "O vendedor voltou a ter acesso aos módulos."
        : "O vendedor foi bloqueado e perderá acesso aos módulos.",
    });
  };

  const formatRemainingTime = (expiresAt: string | null) => {
    if (!expiresAt) return "Sem timer configurado";
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return "ACESSO EXPIRADO";

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    return `${days}d ${hours}h restantes`;
  };

  const formatCurrencyBRL = (valueInCents: number) =>
    (valueInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  useEffect(() => {
    if (!vendorProfile) {
      setVendorAccessStatus("no_timer");
      setVendorRemainingText("");
      return;
    }

    if (vendorProfile.is_blocked) {
      setVendorAccessStatus("blocked");
      setVendorRemainingText("ACESSO BLOQUEADO PELO ADMIN");
      return;
    }

    if (!vendorProfile.vendor_access_expires_at) {
      setVendorAccessStatus("no_timer");
      setVendorRemainingText("SEM TIMER DE ACESSO CONFIGURADO");
      return;
    }

    const updateRemaining = () => {
      const text = formatRemainingTime(vendorProfile.vendor_access_expires_at);
      if (text === "ACESSO EXPIRADO") {
        setVendorAccessStatus("expired");
      } else {
        setVendorAccessStatus("active");
      }
      setVendorRemainingText(text.toUpperCase());
    };

    updateRemaining();

    const interval = window.setInterval(updateRemaining, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [vendorProfile]);

  const totalVendors = vendors.length;
  const totalClients = vendors.reduce((acc, v) => acc + v.clients.length, 0);
  const totalDrivers = vendors.reduce((acc, v) => acc + v.drivers.length, 0);
  const blockedVendors = vendors.filter((v) => v.is_blocked).length;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-panel px-6 py-4 text-xs font-mono tracking-[0.3em] text-primary uppercase">
          Carregando acesso seguro...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-stretch justify-start px-4 py-8 md:px-8 bg-background relative overflow-hidden">
      <div className="absolute top-6 left-4 text-[10px] text-primary/40 font-mono hidden md:block">
        DARK TECH // CONTROL NODE
        <br />
        USER SESSION: ATIVA
        <br />
        PERMISSÕES: {roles.join(", ") || "client"}
      </div>

      <main className="glass-panel max-w-5xl w-full mx-auto p-6 md:p-8 relative scanline animate-fade-in">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full animate-pulse-glow" />
              <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full border border-primary/40 flex items-center justify-center bg-background">
                <UserCircle2 className="text-primary" size={30} />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.3em]">
                ACESSO AUTORIZADO
              </p>
              <h1 className="text-2xl md:text-3xl font-mono text-primary glitch-text mt-1 leading-tight">
                {displayName}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1">
                {roles.map((roleTag) => (
                  <span
                    key={roleTag}
                    className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] rounded-full bg-muted/60 text-muted-foreground border border-border"
                  >
                    {roleTag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 text-[10px] font-mono text-muted-foreground">
            <div className="text-right">
              <p>{user.email}</p>
              <p>ID: {user.id.slice(0, 8)}...</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="neon-button-secondary h-8 px-3 text-[10px] tracking-[0.2em]"
              onClick={handleLogout}
            >
              ENCERRAR SESSÃO
            </Button>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="border border-primary/40 bg-background/70 p-4 rounded-sm hover-scale">
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.25em] mb-2">
              NÍVEL DE ACESSO
            </p>
            <div className="flex items-center gap-2">
              <Shield className="text-primary" size={18} />
              <p className="font-mono text-sm text-foreground">
                {isAdmin ? "ADMINISTRADOR DO SISTEMA" : roles.includes("vendor") ? "PAINEL VENDEDOR" : roles.includes("driver") ? "PAINEL MOTORISTA" : roles.includes("client") ? "PAINEL CLIENTE" : "OPERADOR"}
              </p>
            </div>
          </div>

          <div className="border border-secondary/40 bg-background/70 p-4 rounded-sm flex flex-col justify-between hover-scale">
            <p className="text-[10px] text-secondary font-mono uppercase tracking-[0.25em] mb-1">
              STATUS DO SISTEMA
            </p>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.18em]">
              Sessão protegida com PIN numérico e trilha de auditoria. Mantenha suas credenciais em
              segurança.
            </p>
          </div>

          <div className="border border-accent/40 bg-background/70 p-4 rounded-sm flex flex-col justify-between hover-scale">
            <p className="text-[10px] text-accent font-mono uppercase tracking-[0.25em] mb-1 text-right">
              DISPOSITIVOS MÓVEIS
            </p>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.18em] text-right">
              Interface otimizada para Android / iOS. Use em pé (vertical) para melhor leitura dos
              painéis.
            </p>
          </div>
        </section>

        <section className="border border-primary/30 bg-background/70 p-4 rounded-sm text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-6">
          {isAdmin ? (
            <p>
              Você é o ADMIN principal. Use os módulos abaixo para gerenciar vendedores, clientes,
              motoristas e o acesso seguro ao DARK TECH.
            </p>
          ) : (
            <p>
              Acesso autenticado. Seu perfil está pronto para ser conectado aos módulos de pedidos,
              chat e entregas do DARK TECH.
            </p>
          )}
        </section>

        {isAdmin && (
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border pb-3 mb-2">
              <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                <Users className="text-primary" size={16} />
                <span>PAINEL ADMIN</span>
              </div>
              <div className="inline-flex rounded-full border border-border bg-background/80 p-1 text-[10px] font-mono uppercase tracking-[0.15em]">
                <button
                  type="button"
                  onClick={() => setAdminTab("dashboard")}
                  className={`px-3 py-1 rounded-full flex items-center gap-1 transition-colors ${
                    adminTab === "dashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Shield size={10} />
                  VISÃO GERAL
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("usuarios")}
                  className={`px-3 py-1 rounded-full flex items-center gap-1 transition-colors ${
                    adminTab === "usuarios" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Users size={10} />
                  USUÁRIOS
                </button>
              </div>
            </div>

            {adminTab === "dashboard" && (
              <div className="border border-primary/30 bg-background/60 p-4 text-[10px] font-mono text-muted-foreground uppercase tracking-[0.18em]">
                <p>
                  Nesta visão você verá resumos de vendedores, convites, comissões e segurança. Por
                  enquanto, utilize a aba USUÁRIOS para controlar a hierarquia e timers de acesso.
                </p>
              </div>
            )}

            {adminTab === "usuarios" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  <Timer className="text-secondary" size={14} />
                  <span>HIERARQUIA VENDEDOR &gt; CLIENTES / MOTORISTAS</span>
                </div>

                {loadingVendors ? (
                  <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
                    Carregando hierarquia de usuários...
                  </div>
                ) : vendorsWithConnectionsSplit.length === 0 ? (
                  <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
                    Nenhum vendedor cadastrado ainda.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {vendorsWithConnectionsSplit.map((vendor) => (
                      <details
                        key={vendor.id}
                        className="group border border-accent/50 bg-card/80 rounded-sm p-4 hover-scale transition-colors"
                      >
                        <summary className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer list-none">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent">
                              VENDEDOR
                            </span>
                            <span className="font-mono text-sm text-foreground">
                              {vendor.display_name || vendor.username || vendor.id.slice(0, 8)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              WhatsApp: {vendor.whatsapp || "não informado"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono flex flex-wrap gap-1 items-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] ${vendor.is_blocked ? "border-destructive text-destructive" : "border-primary text-primary"}`}
                              >
                                {vendor.is_blocked ? <Lock size={10} /> : <Unlock size={10} />}
                                {vendor.is_blocked ? "BLOQUEADO" : "ATIVO"}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {formatRemainingTime(vendor.vendor_access_expires_at)}
                              </span>
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 items-stretch md:items-end">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                className="w-20 bg-background/60 border border-border px-2 py-1 text-[10px] font-mono outline-none focus:border-primary"
                                placeholder="dias"
                                value={timerInputs[vendor.id] ?? ""}
                                onChange={(e) => handleTimerChange(vendor.id, e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2 text-[9px] tracking-[0.16em] flex items-center"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleUpdateVendorTimer(vendor.id);
                                }}
                              >
                                <Timer className="mr-1" size={10} />
                                TIMER
                              </Button>
                            </div>

                            <Button
                              type="button"
                              variant={vendor.is_blocked ? "outline" : "destructive"}
                              size="sm"
                              className="h-7 px-2 text-[9px] tracking-[0.16em] flex items-center gap-1"
                              onClick={(e) => {
                                e.preventDefault();
                                handleToggleVendorBlock(vendor.id, vendor.is_blocked);
                              }}
                            >
                              {vendor.is_blocked ? (
                                <>
                                  <Unlock size={10} />
                                  DESBLOQ.
                                </>
                              ) : (
                                <>
                                  <Lock size={10} />
                                  BLOQUEAR
                                </>
                              )}
                            </Button>
                          </div>
                        </summary>

                        <div className="mt-4 grid md:grid-cols-2 gap-4 text-[10px] font-mono uppercase tracking-[0.16em]">
                          <div className="border border-secondary/40 bg-background/60 p-3">
                            <p className="text-secondary mb-2">CLIENTES VINCULADOS</p>
                            {vendor.clients.length === 0 ? (
                              <p className="text-muted-foreground">Nenhum cliente vinculado.</p>
                            ) : (
                              <ul className="space-y-2">
                                {vendor.clients.map((c) => (
                                  <li
                                    key={c.id}
                                    className="border border-secondary/40 bg-background/80 px-2 py-1 flex flex-col gap-0.5"
                                  >
                                    <span className="text-secondary-foreground">
                                      {c.associate_profile?.display_name ||
                                        c.associate_profile?.username ||
                                        c.associate_id.slice(0, 8)}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground">
                                      WhatsApp:{" "}
                                      {c.associate_profile?.whatsapp || "não informado"}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground">
                                      Status conexão: {c.is_blocked ? "BLOQUEADA" : c.status}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="border border-destructive/40 bg-background/60 p-3">
                            <p className="text-destructive mb-2">MOTORISTAS DA FROTA</p>
                            {vendor.drivers.length === 0 ? (
                              <p className="text-muted-foreground">Nenhum motorista vinculado.</p>
                            ) : (
                              <ul className="space-y-2">
                                {vendor.drivers.map((d) => (
                                  <li
                                    key={d.id}
                                    className="border border-destructive/40 bg-background/80 px-2 py-1 flex flex-col gap-0.5"
                                  >
                                    <span className="text-destructive-foreground">
                                      {d.associate_profile?.display_name ||
                                        d.associate_profile?.username ||
                                        d.associate_id.slice(0, 8)}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground">
                                      WhatsApp:{" "}
                                      {d.associate_profile?.whatsapp || "não informado"}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground">
                                      Status conexão: {d.is_blocked ? "BLOQUEADA" : d.status}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
