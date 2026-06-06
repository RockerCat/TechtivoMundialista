"use client";

import Link from "next/link";
import TechtivoWordmark from "@/components/ui/TechtivoWordmark";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Hash, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage, validatePassword } from "@/lib/auth-errors";
import type { Session } from "@supabase/supabase-js";

interface SignupFormProps {
  inviteCode: string | null;
  groupName: string | null;
}

type JoinStatus =
  | { phase: "joining" }
  | { phase: "success"; groupName: string }
  | { phase: "error"; userMsg: string; devDetail?: string };

export default function SignupForm({ inviteCode, groupName }: SignupFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<JoinStatus | null>(null);

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (passwordError) setPasswordError(validatePassword(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setJoinStatus(null);

    const pwdErr = validatePassword(password);
    if (pwdErr) { setPasswordError(pwdErr); return; }
    setPasswordError(null);
    setLoading(true);

    console.log("[signupInvite] handleSubmit →", {
      email,
      inviteCode,
      groupName,
      hasInviteCode: !!inviteCode,
    });

    // ── 1. Create account ─────────────────────────────────────────────
    // Use the browser client — we'll reuse this same instance for the
    // join RPC so the in-memory session is guaranteed to be available.
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (authError) {
      console.error("[signupInvite] signUp error:", authError.message);
      setError(getAuthErrorMessage(authError));
      setLoading(false);
      return;
    }

    console.log("[signupInvite] signUp result →", {
      userId:         data.user?.id ?? null,
      sessionExists:  !!data.session,
    });

    // ── 2. Resolve session ────────────────────────────────────────────
    // With email confirmation OFF, signUp returns a session inline.
    // If not (misconfiguration), fall back to signInWithPassword so the
    // flow never shows a "check your email" screen for this internal app.
    let session: Session | null = data.session;

    if (!session && data.user) {
      console.log("[signupInvite] no inline session — attempting signInWithPassword fallback");
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log("[signupInvite] signInWithPassword fallback →", {
        sessionExists: !!signInData.session,
        error:         signInErr?.message ?? null,
      });
      if (signInErr || !signInData.session) {
        setError(
          "Cuenta creada, pero no se pudo iniciar sesión automáticamente. " +
          "El administrador debe desactivar la confirmación de correo en " +
          "Supabase → Authentication → Providers → Email → Confirm email."
        );
        setLoading(false);
        return;
      }
      session = signInData.session;
    }

    if (!session) {
      console.error("[signupInvite] no session after signUp + fallback — aborting");
      setError("No se pudo crear la sesión. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    console.log("[signupInvite] session confirmed → userId:", session.user.id);

    // ── 3. Join the group ─────────────────────────────────────────────
    // IMPORTANT: We call join_group_for_user directly on the browser
    // Supabase client — NOT via a Server Action. The browser client
    // already has the session JWT in memory from the signUp call above.
    // A Server Action would need to read the JWT from cookies, but those
    // cookies may not be flushed into the outgoing request headers before
    // the Server Action POST fires, causing auth.uid() = null in the DB.
    if (inviteCode) {
      setJoinStatus({ phase: "joining" });

      console.log("[signupInvite][joinGroupAfterSignup] calling join_group_for_user RPC →", {
        inviteCode,
        userId: session.user.id,
      });

      const { data: groupId, error: joinError } = await supabase.rpc(
        "join_group_for_user",
        { p_invite_code: inviteCode }
      );

      console.log("[signupInvite][joinGroupAfterSignup] RPC result →", {
        groupId,
        error:     joinError?.message  ?? null,
        errorCode: joinError?.code     ?? null,
        errorHint: joinError?.hint     ?? null,
      });

      if (joinError) {
        setJoinStatus({
          phase:     "error",
          userMsg:   "La cuenta fue creada, pero no se pudo unir al grupo. Intenta iniciar sesión con el enlace de invitación.",
          devDetail: joinError.message,
        });
        setLoading(false);
        return;
      }

      // Fetch group name for the success card
      const { data: group } = await supabase
        .from("groups")
        .select("name")
        .eq("id", groupId as string)
        .maybeSingle();

      console.log("[signupInvite][joinGroupAfterSignup] join SUCCESS ✓ → groupId:", groupId, "name:", group?.name);

      setJoinStatus({
        phase:     "success",
        groupName: group?.name ?? groupName ?? "Techtivo Pollita",
      });

      setTimeout(() => {
        console.log("[signupInvite] redirecting to /dashboard");
        router.push("/dashboard");
        router.refresh();
      }, 1500);
      return;
    }

    // No invite code (shouldn't reach here due to signup page gate, but handle gracefully)
    console.log("[signupInvite] no invite code — redirecting to /dashboard");
    router.push("/dashboard");
    router.refresh();
    setLoading(false);
  }

  // ── Join status overlay ──────────────────────────────────────────────
  if (joinStatus) {
    return (
      <div className="w-full max-w-sm animate-fade-in-up">
        <JoinStatusCard
          status={joinStatus}
          onContinue={() => { router.push("/dashboard"); router.refresh(); }}
          onRetry={() => setJoinStatus(null)}
        />
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      <div className="text-center mb-8">
        <Link href="/login" className="inline-flex mb-6">
          <TechtivoWordmark width={140} height={30} subtitleClassName="text-xs" />
        </Link>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Únete a Techtivo Pollita</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          {inviteCode
            ? "Únete al grupo y deja tu penúltima palabra."
            : "Demuestra que sabes más fútbol que nadie."}
        </p>
      </div>

      {inviteCode && (
        <div className="mb-4 flex items-center gap-3 bg-[#38BDF8]/8 border border-[#38BDF8]/20 rounded-xl p-3">
          <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 flex items-center justify-center shrink-0">
            <Hash size={14} className="text-[#38BDF8]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#94a3b8]">Te invitaron a jugar</p>
            <p className="text-sm font-bold text-[#f1f5f9] truncate">
              {groupName ?? "un grupo de Techtivo Pollita"}
            </p>
          </div>
          <Badge variant="green">{inviteCode}</Badge>
        </div>
      )}

      <Card variant="glow-green" className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nombre de usuario" type="text" placeholder="ej. goleador_9" value={username} onChange={(e) => setUsername(e.target.value)} leftIcon={<User size={16} />} hint="Así te van a ver" required autoFocus />
          <Input label="Correo electrónico" type="email" placeholder="tú@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail size={16} />} required autoComplete="email" />
          <Input label="Contraseña" type="password" placeholder="Mín. 8 caracteres" value={password} onChange={(e) => handlePasswordChange(e.target.value)} leftIcon={<Lock size={16} />} error={passwordError ?? undefined} required autoComplete="new-password" minLength={8} />

          {error && (
            <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
              <p className="text-xs text-[#ef4444] leading-relaxed">{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {inviteCode ? "Crear cuenta y unirme" : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-xs text-[#64748b] text-center mt-4">
          Al registrarte aceptas nuestros{" "}
          <span className="text-[#94a3b8] hover:text-[#94a3b8] cursor-pointer">términos</span>.
        </p>

        <div className="mt-4 pt-4 border-t border-[#1e1e35] text-center">
          <p className="text-sm text-[#94a3b8]">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-[#38BDF8] font-semibold hover:text-[#7DD3FC]">Ingresar</Link>
          </p>
        </div>
      </Card>

      {inviteCode && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-live-pulse" />
          <span className="text-xs font-mono text-[#38BDF8] uppercase tracking-widest">Invitación validada</span>
        </div>
      )}
    </div>
  );
}

// ── Join status card ────────────────────────────────────────────────────

function JoinStatusCard({
  status,
  onContinue,
  onRetry,
}: {
  status: JoinStatus;
  onContinue: () => void;
  onRetry: () => void;
}) {
  if (status.phase === "joining") {
    return (
      <Card className="p-6 text-center">
        <Loader2 size={28} className="animate-spin text-[#38BDF8] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#f1f5f9]">Uniéndote al grupo...</p>
      </Card>
    );
  }

  if (status.phase === "success") {
    return (
      <Card variant="glow-green" className="p-6 text-center">
        <CheckCircle2 size={28} className="text-[#38BDF8] mx-auto mb-3" />
        <p className="text-base font-black text-[#f1f5f9] mb-1">¡Te uniste al grupo!</p>
        <p className="text-sm text-[#94a3b8] mb-5">{status.groupName}</p>
        <p className="text-xs text-[#64748b]">Redirigiendo al dashboard...</p>
      </Card>
    );
  }

  // Error
  return (
    <Card className="p-6">
      <div className="flex items-start gap-2 mb-4">
        <AlertCircle size={18} className="text-[#ef4444] mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#f1f5f9] mb-1">
            No se pudo unir al grupo
          </p>
          <p className="text-xs text-[#ef4444]">{status.userMsg}</p>
        </div>
      </div>

      {status.devDetail && (
        <div className="bg-[#0a0a12] border border-[#f59e0b]/30 rounded-xl px-3 py-2.5 mb-4">
          <p className="text-[10px] text-[#f59e0b] font-mono uppercase tracking-widest mb-1">
            🔧 Error de desarrollo
          </p>
          <pre className="text-[10px] text-[#94a3b8] font-mono whitespace-pre-wrap break-all leading-relaxed">
            {status.devDetail}
          </pre>
        </div>
      )}

      <p className="text-xs text-[#64748b] mb-4">
        Tu cuenta fue creada correctamente. Puedes intentar unirte de nuevo desde el dashboard.
      </p>

      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="flex-1 h-9 text-xs font-semibold text-[#94a3b8] bg-[#20203a] border border-[#2a2a45] rounded-xl hover:text-[#f1f5f9] transition-colors"
        >
          Reintentar
        </button>
        <button
          onClick={onContinue}
          className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-bold text-[#0a0a12] bg-[#38BDF8] rounded-xl hover:bg-[#7DD3FC] transition-colors"
        >
          Ir al dashboard
          <ArrowRight size={12} />
        </button>
      </div>
    </Card>
  );
}

