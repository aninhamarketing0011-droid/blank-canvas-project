import { useState } from "react";
import { Camera, LogOut, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    if (!password.trim()) return;
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: password.trim() });
    setUpdating(false);
    if (error) {
      toast({
        title: "Erro ao atualizar senha",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return;
    }
    setPassword("");
    toast({ title: "Senha atualizada", description: "Sua senha foi alterada com sucesso." });
  };

  const handleThemeToggle = () => {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    localStorage.setItem("dark-tech-theme", isDark ? "dark" : "light");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8">
      <main className="w-full max-w-xl border border-border bg-background/80 rounded-sm shadow-lg p-6 space-y-6">
        <header className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-mono tracking-[0.25em] uppercase">Configurações</h1>
            <p className="text-[11px] text-muted-foreground font-mono tracking-[0.18em]">
              Ajustes rápidos da sua sessão segura.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={handleThemeToggle}>
            <Sun className="w-4 h-4 hidden dark:block" />
            <Moon className="w-4 h-4 dark:hidden" />
          </Button>
        </header>

        <section className="space-y-4">
          <h2 className="text-[11px] font-mono tracking-[0.22em] uppercase text-muted-foreground">
            Perfil
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center bg-muted/40">
              <Camera className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-[11px] text-muted-foreground font-mono">
              <p>Upload de foto via Storage poderá ser conectado aqui.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-mono tracking-[0.22em] uppercase text-muted-foreground">
            Segurança
          </h2>
          <div className="space-y-2 text-[11px] font-mono">
            <div className="flex gap-2 items-center">
              <Input
                type="password"
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-[11px]"
              />
              <Button
                size="sm"
                className="h-8 px-3 text-[10px] tracking-[0.18em]"
                onClick={handlePasswordChange}
                disabled={!password.trim() || updating}
              >
                ATUALIZAR
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="password"
                placeholder="PIN numérico"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-8 text-[11px]"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-[10px] tracking-[0.18em]"
                disabled
              >
                EM BREVE
              </Button>
            </div>
          </div>
        </section>

        <section className="pt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono tracking-[0.18em]">
            Sessão atual
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-3 text-[10px] tracking-[0.18em] flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-3 h-3" />
            SAIR
          </Button>
        </section>
      </main>
    </div>
  );
}
