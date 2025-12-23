import { useState } from "react";
import { Camera } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinLock } from "@/components/PinLock";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { RegisterCode } from "@/pages/Index";

interface RegisterFlowProps {
  codeData: RegisterCode;
  inviteCode?: string;
  onBack: () => void;
  onComplete: () => void;
}

const registerSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome completo.")
    .max(100, "Nome muito longo."),
  usuario: z
    .string()
    .trim()
    .min(3, "USERNAME muito curto.")
    .max(20, "USERNAME muito longo.")
    .regex(/^[A-Z0-9_-]+$/, "Use apenas letras, números, - e _."),
  whatsapp: z
    .string()
    .trim()
    .min(8, "WhatsApp muito curto.")
    .max(20, "WhatsApp muito longo."),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterFlow({ codeData, inviteCode, onBack, onComplete }: RegisterFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<RegisterFormData>({
    nome: "",
    usuario: "",
    whatsapp: "",
  });
  const [firstLock, setFirstLock] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const parsed = registerSchema.parse(formData);
      setFormData(parsed);
      setError("");
      setStep(2);
    } catch (validationError) {
      if (validationError instanceof z.ZodError && validationError.errors[0]?.message) {
        setError(validationError.errors[0].message);
      } else {
        setError("Dados inválidos. Verifique as informações digitadas.");
      }
    }
  };

  const handleLockSet = (code: string) => {
    setFirstLock(code);
    setStep(3);
  };

  const handleLockConfirm = async (code: string) => {
    if (code !== firstLock) {
      setError("Os PINs não conferem. Tente novamente.");
      setStep(2);
      setFirstLock(null);
      return;
    }

    setLoading(true);
    setError("");

    const email = `${formData.usuario.trim().toLowerCase()}@sys.app`;
    const password = `${code}#secret`;
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: formData.nome,
          username: formData.usuario,
          whatsapp: formData.whatsapp,
          invite_role: codeData.tipo,
        },
      },
    });

    if (error) {
      setLoading(false);
      const raw = (error.message || "").toLowerCase();
      let message = "Erro ao criar acesso. Tente novamente.";

      if (raw.includes("user already registered") || raw.includes("user already exists") || raw.includes("duplicate key")) {
        message = "Este USERNAME já está em uso. Escolha outro username.";
      }

      setError(message);
      toast({
        title: "Falha no cadastro",
        description: message,
        variant: "destructive",
      });
      return;
    }

    if (data.user) {
      const userId = data.user.id;

      // Vincula o código de convite ao usuário recém-criado (best-effort, não bloqueia o cadastro)
      if (inviteCode) {
        supabase.functions
          .invoke("link-invite-user", {
            body: { userId, code: inviteCode },
          })
          .catch((err) => {
            console.error("Erro ao vincular código de convite ao usuário:", err);
          });
      }

      toast({
        title: "Acesso criado",
        description:
          "Seu acesso foi registrado. Use seu USERNAME e PIN para entrar no painel.",
      });
    }

    setLoading(false);
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 animate-fade-in relative">
      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel p-8 relative scanline">
          {/* Corner markers */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

          {/* STEP 1: Dados principais */}
          {step === 1 && (
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold font-mono text-primary mb-1 tracking-widest uppercase">
                  NOVO PERFIL
                </h2>
                <p className="text-[10px] text-muted-foreground font-mono uppercase">
                  Tipo de acesso: {codeData.tipo.toUpperCase()}
                </p>
                <p className="text-[9px] text-primary/70 font-mono uppercase mt-1 tracking-[0.25em]">
                  LOGIN POR USERNAME + PIN
                </p>
              </div>

              {error && (
                <div className="p-2 bg-destructive/10 border-l-2 border-destructive text-destructive text-[10px] font-mono text-center uppercase">
                  {error}
                </div>
              )}

              <div className="flex justify-center mb-6">
                <label
                  className={`w-32 h-32 relative group cursor-pointer rounded-full border border-primary/40 bg-background/60 overflow-hidden transition-shadow duration-300 ${
                    preview ? "shadow-[0_0_35px_hsl(var(--primary)/0.8)]" : "shadow-none"
                  }`}
                >
                  <div className="absolute inset-0 border border-primary/20 rounded-full" />
                  <div className="absolute inset-2 border-t border-b border-primary/40 rounded-full animate-spin-slow" />

                  <div className="w-full h-full flex items-center justify-center rounded-full bg-background/60 group-hover:bg-primary/10 transition-colors overflow-hidden">
                    {preview ? (
                      <img
                        src={preview}
                        className="w-full h-full object-cover grayscale opacity-90"
                        alt="Preview do avatar"
                      />
                    ) : (
                      <Camera
                        size={32}
                        className="text-primary/60 group-hover:text-primary transition-colors"
                      />
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhoto}
                    className="hidden"
                  />
                  <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-primary font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    [ PORTAL AVATAR ]
                  </div>
                </label>
              </div>

              <div className="space-y-6">
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="NOME COMPLETO"
                  className="tech-input text-base"
                  required
                />
                <Input
                  value={formData.usuario}
                  onChange={(e) =>
                    setFormData({ ...formData, usuario: e.target.value.toUpperCase() })
                  }
                  placeholder="CODENAME (LOGIN VISUAL)"
                  className="tech-input text-base"
                  required
                />
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="WHATSAPP (COM DDD)"
                  className="tech-input text-base"
                  required
                />
              </div>

              <Button type="submit" className="w-full neon-button mt-8" disabled={loading}>
                {loading ? "PROCESSANDO..." : "PRÓXIMA ETAPA >>"}
              </Button>
            </form>
          )}

          {/* STEP 2 & 3: PIN */}
          {(step === 2 || step === 3) && (
            <div className="text-center">
              <h3 className="text-primary font-mono mb-2 tracking-[0.2em] uppercase text-sm border-b border-primary/20 pb-4">
                {step === 2 ? "DEFINIR CÓDIGO DE ACESSO" : "CONFIRMAR CÓDIGO"}
              </h3>
              <p className="text-[10px] text-muted-foreground mb-6 font-mono uppercase">
                Sequência numérica de 6 dígitos (PIN)
              </p>
              <PinLock onComplete={step === 2 ? handleLockSet : handleLockConfirm} disabled={loading} />
            </div>
          )}

          {step === 1 && (
            <button
              onClick={onBack}
              className="w-full mt-6 text-muted-foreground text-[10px] hover:text-primary font-mono uppercase tracking-widest"
            >
              [ CANCELAR REGISTRO ]
            </button>
          )}
          {step > 1 && (
            <button
              onClick={() => setStep((prev) => (prev === 2 ? 1 : 2))}
              className="w-full mt-6 text-muted-foreground text-[10px] hover:text-primary font-mono uppercase tracking-widest"
              disabled={loading}
            >
              [ &lt;&lt; VOLTAR ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
