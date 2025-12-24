import { supabase } from "@/integrations/supabase/client";
import {
  saveManualSession,
  clearManualSession,
  getManualSession,
} from "@/lib/manualSession";
import type {
  AuthError,
  AuthResult,
  LoginCredentials,
  ManualAuthSession,
} from "./types";

class ManualAuthService {
  private static instance: ManualAuthService;

  private constructor() {}

  public static getInstance(): ManualAuthService {
    if (!ManualAuthService.instance) {
      ManualAuthService.instance = new ManualAuthService();
    }
    return ManualAuthService.instance;
  }

  private handleError(error: unknown, fallbackMessage: string): AuthError {
    if (error && typeof error === "object" && "message" in error) {
      const anyError = error as { message?: string; code?: string };
      return {
        code: anyError.code || "unknown",
        message: anyError.message || fallbackMessage,
        originalError: error,
      };
    }

    return {
      code: "unknown",
      message: fallbackMessage,
      originalError: error,
    };
  }

  /**
   * Login por USERNAME + PIN usando a edge function `manual-auth`.
   * Persiste o resultado em localStorage via `saveManualSession`.
   */
  public async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.functions.invoke("manual-auth", {
        body: {
          action: "login",
          username: credentials.username,
          pin: credentials.pin,
        },
      });

      if (error || !data) {
        const apiMessage = (data as any)?.error;
        const authError = this.handleError(error, apiMessage || "Falha na autenticação. Verifique USERNAME e PIN.");

        return {
          success: false,
          error: authError,
        };
      }

      const payload = data as ManualAuthSession;
      saveManualSession(payload);

      return {
        success: true,
        session: payload,
      };
    } catch (err) {
      return {
        success: false,
        error: this.handleError(err, "Erro inesperado ao autenticar"),
      };
    }
  }

  /**
   * Logout manual: limpa o storage local. Toda a lógica é baseada em database + edge function,
   * sem qualquer dependência de e-mail ou Supabase Auth por e-mail/senha.
   */
  public async logout(): Promise<void> {
    clearManualSession();
  }

  /**
   * Retorna a sessão atual (se existir) a partir do storage local.
   * O vínculo "real" de permissões continua sendo feito via tabelas do database (profiles, user_roles, etc.).
   */
  public getCurrentSession(): ManualAuthSession | null {
    return getManualSession();
  }
}

export const authService = ManualAuthService.getInstance();
