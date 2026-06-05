import type { AuthError } from "@supabase/supabase-js";

/**
 * Maps Supabase auth errors to friendly LATAM Spanish messages.
 */
export function getAuthErrorMessage(error: AuthError | Error): string {
  const msg = error.message.toLowerCase();

  // Login errors
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return "Correo o contraseña incorrectos. Intenta de nuevo.";
  }
  if (msg.includes("email not confirmed")) {
    return "Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.";
  }

  // Signup errors
  if (msg.includes("user already registered") || msg.includes("already registered") || msg.includes("already exists")) {
    return "Ya existe una cuenta con este correo. Intenta ingresar.";
  }
  if (msg.includes("password should be at least") || (msg.includes("password") && msg.includes("characters"))) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (msg.includes("unable to validate email address") || msg.includes("invalid email")) {
    return "El correo electrónico no es válido.";
  }

  // Rate limiting
  if (msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("over_email_send_rate_limit")) {
    return "Demasiados intentos. Espera un momento e intenta de nuevo.";
  }
  if (msg.includes("for security purposes") && msg.includes("seconds")) {
    const seconds = msg.match(/(\d+) seconds/)?.[1];
    return seconds
      ? `Por seguridad, espera ${seconds} segundos antes de intentar de nuevo.`
      : "Por seguridad, espera un momento antes de intentar de nuevo.";
  }

  // Network / server
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
    return "Problema de conexión. Verifica tu internet e intenta de nuevo.";
  }
  if (msg.includes("signup is disabled") || msg.includes("signups not allowed")) {
    return "El registro está deshabilitado en este momento.";
  }

  return "Algo salió mal. Intenta de nuevo.";
}

/**
 * Client-side password validation — returns a Spanish error message or null.
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return null;
}
