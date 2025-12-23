import { useState } from "react";
import { Delete, ShieldCheck, User } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinLock } from "@/components/PinLock";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoginFlowProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Informe um USERNAME válido.")
    .max(20, "USERNAME muito longo."),
});

export function LoginFlow({ onBack, onLoginSuccess }: LoginFlowProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = loginSchema.parse({ username });
      setUsername(parsed.username);
      setError("");
      setStep(2);
    } catch (validationError) {
      if (validationError instanceof z.ZodError && validationError.errors[0]?.message) {
        setError(validationError.errors[0].message);
      } else {
        setError("USERNAME inválido.");
      }
    }
  };

  const handleUnlock = async (code: string) => {
    setError("");
    setLoading(true);

    const email = `${username.trim().toLowerCase()}@sys.app`;
    const password = `${code}#secret`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      const raw = (error.message || "").toLowerCase();
      let userMessage = "Falha na autenticação. Verifique USERNAME e PIN.";

      if (raw.includes("invalid login") || raw.includes("invalid credentials") || raw.includes("invalid email or password") || raw.includes("invalid password")) {
        userMessage = "Username ou PIN incorretos.";
      } else if (raw.includes("email not confirmed")) {
        userMessage =
          "Seu acesso ainda não foi liberado pelo sistema. Fale com o administrador para ativar sua conta.";
      }

      setError(userMessage);
      toast({
        title: "Acesso negado",
        description: userMessage,
        variant: "destructive",
      });
      return;
    }

    onLoginSuccess();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 animate-fade-in relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel p-8 relative scanline">
          {/* Corner markers */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

          {step === 1 && (
            <div className="text-center">
              <div className="mb-8 relative inline-block">
                <div className="absolute -inset-4 border border-dashed border-primary/50 rounded-full animate-spin-slow" />
                <div className="absolute -inset-2 border-t border-b border-primary rounded-full animate-spin" />
                <div className="relative p-4 rounded-full bg-background border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
                  <User size={32} className="text-primary" />
                </div>
              </div>

              <h2 className="text-lg font-bold font-mono text-primary tracking-widest mb-6 uppercase glitch-text">
                QUEM É VOCÊ?
              </h2>

              <form onSubmit={handleUserSubmit}>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="USERNAME"
                  className="tech-input mb-6"
                  autoFocus
                  required
                />

                {error && (
                  <div className="bg-destructive/10 border-l-2 border-destructive text-destructive p-2 mb-4 text-[10px] font-mono tracking-wider uppercase">
                    ⚠ {error}
                  </div>
                )}

                <Button type="submit" className="w-full neon-button">
                  INICIAR
                </Button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-24 h-24 rounded-full border-2 border-primary p-1 relative">
                  <div className="absolute inset-0 border-t-2 border-primary animate-spin rounded-full" />
                  <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
                    <ShieldCheck className="text-primary animate-pulse" size={40} />
                  </div>
                </div>
              </div>

              <h3 className="text-foreground font-mono mb-2 tracking-[0.2em] uppercase text-sm">
                BEM-VINDO
              </h3>
              <p className="text-primary font-bold text-2xl font-mono mb-6 glitch-text">
                {username || "USUÁRIO"}
              </p>

              <div className="mb-4">
                <div className="text-[10px] text-primary/60 mb-4 font-mono uppercase tracking-widest border-b border-primary/20 pb-2">
                  Insira Credencial de Segurança (PIN)
                </div>
                <PinLock onComplete={handleUnlock} disabled={loading} />
                {error && (
                  <div className="bg-destructive/10 border-l-2 border-destructive text-destructive p-2 mt-4 text-[10px] font-mono tracking-wider uppercase">
                    ⚠ {error}
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={onBack}
            className="mt-6 w-full text-muted-foreground text-[10px] hover:text-primary font-mono uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Delete size={16} />
            [ VOLTAR AO INÍCIO ]
          </button>
        </div>
      </div>
    </div>
  );
}
