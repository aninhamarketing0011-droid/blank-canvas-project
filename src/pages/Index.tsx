import { useState } from "react";
import { Zap, Lock, Fingerprint, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginFlow } from "@/components/auth/LoginFlow";
import { RegisterFlow } from "@/components/auth/RegisterFlow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// SEO: título principal para a página inicial


// Tipo alinhado ao enum app_role do Supabase
export type RegisterCode = {
  tipo: "admin" | "vendor" | "client" | "driver";
};

const Index = () => {
  const [view, setView] = useState<"welcome" | "login" | "registerCode" | "registerForm">("welcome");
  const [registerCode, setRegisterCode] = useState<RegisterCode | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(null);
  const { toast } = useToast();

  if (typeof document !== "undefined") {
    document.title = "DARK TECH - Acesso Seguro";
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-5 animate-fade-in relative overflow-hidden bg-background">
      {view === "welcome" && (
        <>
          <div className="absolute top-10 left-6 text-[10px] text-primary/40 font-mono hidden md:block">
            SYS.ROOT.ACCESS_V5.0
            <br />
            STATUS: STANDBY
            <br />
            ENCRYPTION: AES-256
          </div>

          <header className="text-center z-10">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <Zap className="text-primary w-16 h-16 mx-auto relative z-10 drop-shadow-[0_0_15px_hsl(var(--primary))]" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary via-foreground to-secondary tracking-tight glitch-text mb-2 drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">
              DARK TECH
            </h1>
            <p className="text-primary/60 text-[10px] md:text-xs tracking-[0.6em] md:tracking-[0.8em] uppercase font-mono border-t border-b border-primary/20 py-2 inline-block">
              System Access v5.0
            </p>
          </header>

          <main className="glass-panel rounded-sm p-8 max-w-sm w-full text-center relative scanline z-10" aria-labelledby="auth-title">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

            <Lock className="text-primary/60 w-12 h-12 mx-auto mb-6" />
            <h2
              id="auth-title"
              className="text-xl font-bold font-mono mb-6 text-foreground tracking-widest"
            >
              IDENTIFICAÇÃO
            </h2>

            <section className="space-y-4" aria-label="Escolha de acesso">
              <Button
                onClick={() => setView("login")}
                className="w-full neon-button group"
              >
                <Fingerprint className="mr-2 group-hover:scale-125 transition-transform" size={18} />
                ACESSAR CONTA
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setInviteCode("");
                  setInviteError("");
                  setRegisterCode(null);
                  setView("registerCode");
                }}
                className="w-full neon-button-secondary group"
              >
                <QrCode className="mr-2 group-hover:scale-125 transition-transform" size={18} />
                INSERIR CÓDIGO
              </Button>
              <p className="text-[10px] text-muted-foreground font-mono tracking-widest pt-2">
                Use seu e-mail + PIN numérico para entrar no painel DARK TECH.
              </p>
            </section>
          </main>

          <footer className="absolute bottom-5 text-[10px] text-muted-foreground font-mono text-center px-4">
            <p>Primeiro cadastro vira ADMIN automaticamente. Depois, use o mesmo e-mail e PIN para acessar.</p>
          </footer>
        </>
      )}

      {view === "login" && (
        <LoginFlow
          onBack={() => setView("welcome")}
          onLoginSuccess={() => {
            window.location.href = "/dashboard";
          }}
        />
      )}

      {view === "registerCode" && (
        <div className="min-h-screen flex items-center justify-center p-5 animate-fade-in relative">
          <div className="w-full max-w-md relative z-10">
            <div className="glass-panel p-8 relative scanline">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

              <h2 className="text-xl font-bold font-mono text-primary mb-4 tracking-widest uppercase text-center">
                INSERIR CÓDIGO DE CONVITE
              </h2>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest text-center mb-4">
                O acesso só é liberado com um código válido gerado pelo sistema.
              </p>

              <input
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setInviteError("");
                }}
                placeholder="EX: DARK-XXXX-YYYY"
                className="tech-input w-full mb-4"
              />

              {inviteError && (
                <div className="bg-destructive/10 border-l-2 border-destructive text-destructive p-2 mb-4 text-[10px] font-mono tracking-wider uppercase text-center">
                  {inviteError}
                </div>
              )}

              <Button
                className="w-full neon-button mb-3"
                onClick={async () => {
                  if (!inviteCode.trim()) {
                    setInviteError("Informe um código de convite para continuar.");
                    return;
                  }

                  try {
                    const { data, error } = await supabase.functions.invoke("validate-invite", {
                      body: { code: inviteCode.trim() },
                    });

                    if (error) {
                      console.error("Erro validate-invite:", error);
                      setInviteError("Falha ao validar o código. Tente novamente.");
                      toast({
                        title: "Erro ao validar código",
                        description: "Falha ao validar o código. Tente novamente.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (!data || !data.role) {
                      setInviteError("Código inválido ou expirado.");
                      return;
                    }

                    const role = data.role as RegisterCode["tipo"];

                    setRegisterCode({ tipo: role });
                    setActiveInviteCode(inviteCode.trim());
                    setView("registerForm");
                  } catch (err) {
                    console.error("Exceção validate-invite:", err);
                    setInviteError("Erro inesperado ao validar o código.");
                    toast({
                      title: "Erro inesperado",
                      description: "Não foi possível validar o código agora.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                VALIDAR CÓDIGO
              </Button>

              <button
                onClick={() => setView("welcome")}
                className="w-full mt-2 text-muted-foreground text-[10px] hover:text-primary font-mono uppercase tracking-widest"
              >
                [ VOLTAR ]
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "registerForm" && registerCode && (
        <RegisterFlow
          codeData={registerCode}
          inviteCode={activeInviteCode ?? ""}
          onBack={() => setView("welcome")}
          onComplete={() => setView("welcome")}
        />
      )}
    </div>
  );
};

export default Index;
