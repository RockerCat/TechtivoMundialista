"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle, Hash, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { LOADING_MESSAGES } from "@/lib/loading-messages";

interface LoginFormProps {
  inviteCode: string | null;
}

type JoinStatus =
  | { phase: "joining" }
  | { phase: "success"; groupName: string }
  | { phase: "error"; userMsg: string; devDetail?: string };

export default function LoginForm({ inviteCode }: LoginFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<JoinStatus | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStatusIdx(i => (i + 1) % LOADING_MESSAGES.length), 3000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setJoinStatus(null);
    setLoading(true);

    console.log("[LoginForm] handleSubmit →", { email, inviteCode });

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(getAuthErrorMessage(authError));
      setLoading(false);
      return;
    }

    console.log("[loginInvite] signIn OK → userId:", (await supabase.auth.getUser()).data.user?.id ?? "unknown");

    if (inviteCode) {
      setJoinStatus({ phase: "joining" });

      console.log("[loginInviteJoin] calling join_group_for_user RPC directly →", {
        inviteCode,
        reason: "Server Actions are intercepted by middleware on /login after auth cookies are set; using browser client instead",
      });

      // ── Idempotency check ───────────────────────────────────────────
      // If the user is already a member (e.g. clicked the invite link twice),
      // skip the RPC and redirect immediately.
      const { data: existing } = await supabase
        .from("group_members")
        .select("group_id")
        .maybeSingle();

      if (existing?.group_id) {
        console.log("[loginInviteJoin] user already member of group_id:", existing.group_id, "→ treating as success");
        const { data: existingGroup } = await supabase
          .from("groups")
          .select("name")
          .eq("id", existing.group_id)
          .maybeSingle();
        setJoinStatus({ phase: "success", groupName: existingGroup?.name ?? "La Penúltima" });
        setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1500);
        return;
      }

      // ── Join via RPC ────────────────────────────────────────────────
      // Use the same browser Supabase client that just ran signInWithPassword.
      // Its in-memory session JWT is immediately available — no cookie-flush
      // race condition that would affect a Server Action POST.
      const { data: groupId, error: joinError } = await supabase.rpc(
        "join_group_for_user",
        { p_invite_code: inviteCode }
      );

      console.log("[loginInviteJoin] RPC result →", {
        groupId,
        error:     joinError?.message  ?? null,
        errorCode: joinError?.code     ?? null,
      });

      if (joinError) {
        const msg = joinError.message;
        let userMsg: string;
        if (msg === "invalid_code") {
          userMsg = "Invitación inválida o expirada.";
        } else if (msg === "not_authenticated") {
          userMsg = "Problema de autenticación. Cierra sesión e intenta de nuevo.";
        } else {
          userMsg = "Iniciaste sesión, pero no se pudo unir al grupo. Intenta de nuevo.";
        }
        setJoinStatus({ phase: "error", userMsg, devDetail: msg });
        setLoading(false);
        return;
      }

      console.log("[joinGroupExistingUser] RPC success → groupId:", groupId);

      const { data: group } = await supabase
        .from("groups")
        .select("name")
        .eq("id", groupId as string)
        .maybeSingle();

      console.log("[joinGroupExistingUser] group name:", group?.name ?? "(not found)");

      setJoinStatus({ phase: "success", groupName: group?.name ?? "La Penúltima" });
      console.log("[loginInviteJoin] join SUCCESS ✓, redirecting to /dashboard in 1.5s");
      setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1500);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      <div className="text-center mb-8">
        <Link href="/login" className="inline-flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#00c85a] flex items-center justify-center">
            <span className="text-xl leading-none">🏆</span>
          </div>
          <span className="font-bold text-xl text-[#f1f5f9]">
            La <span className="text-[#00c85a]">Penúltima</span>
          </span>
        </Link>
        <h1 className="text-2xl font-black text-[#f1f5f9]">La Penúltima</h1>
        <p className="text-sm text-[#94a3b8] mt-1">El lugar donde se sufre pero se gana</p>
      </div>

      {inviteCode && (
        <div className="mb-4 flex items-center gap-3 bg-[#00c85a]/8 border border-[#00c85a]/20 rounded-xl p-3">
          <div className="w-8 h-8 rounded-lg bg-[#00c85a]/15 flex items-center justify-center shrink-0">
            <Hash size={14} className="text-[#00c85a]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#94a3b8]">Código de invitación</p>
            <p className="text-sm font-bold font-mono text-[#f1f5f9]">{inviteCode}</p>
          </div>
        </div>
      )}

      <Card variant="glow-green" className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Correo electrónico" type="email" placeholder="tú@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail size={16} />} required autoComplete="email" autoFocus />
          <Input label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock size={16} />} required autoComplete="current-password" />

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-[#94a3b8] hover:text-[#00c85a] transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
              <p className="text-xs text-[#ef4444] leading-relaxed">{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {inviteCode ? "Ingresar y unirme al grupo" : "Ingresar"}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#1e1e35] text-center">
          <p className="text-sm text-[#94a3b8]">
            ¿No tienes cuenta?{" "}
            <Link
              href={inviteCode ? `/signup?invite=${inviteCode}` : "/join"}
              className="text-[#00c85a] font-semibold hover:text-[#00e87a]"
            >
              {inviteCode ? "Crear cuenta" : "Únete por invitación"}
            </Link>
          </p>
        </div>
      </Card>

      <div className="flex items-center justify-center gap-2 mt-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-live-pulse" />
        <span className="text-xs font-mono text-[#3b82f6] uppercase tracking-widest">
          {LOADING_MESSAGES[statusIdx]}
        </span>
      </div>
    </div>
  );
}

// ── Shared join status card ──────────────────────────────────────────────

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
        <Loader2 size={28} className="animate-spin text-[#00c85a] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#f1f5f9]">Uniéndote al grupo...</p>
      </Card>
    );
  }

  if (status.phase === "success") {
    return (
      <Card variant="glow-green" className="p-6 text-center">
        <CheckCircle2 size={28} className="text-[#00c85a] mx-auto mb-3" />
        <p className="text-base font-black text-[#f1f5f9] mb-1">¡Te uniste al grupo!</p>
        <p className="text-sm text-[#94a3b8] mb-5">{status.groupName}</p>
        <p className="text-xs text-[#64748b]">Redirigiendo al dashboard...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-2 mb-4">
        <AlertCircle size={18} className="text-[#ef4444] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-[#f1f5f9] mb-1">No se pudo unir al grupo</p>
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
        Tu sesión es válida. Puedes continuar al dashboard e intentar unirte desde allí.
      </p>

      <div className="flex gap-2">
        <button onClick={onRetry} className="flex-1 h-9 text-xs font-semibold text-[#94a3b8] bg-[#20203a] border border-[#2a2a45] rounded-xl hover:text-[#f1f5f9] transition-colors">
          Reintentar
        </button>
        <button onClick={onContinue} className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-bold text-[#0a0a12] bg-[#00c85a] rounded-xl hover:bg-[#00e87a] transition-colors">
          Ir al dashboard <ArrowRight size={12} />
        </button>
      </div>
    </Card>
  );
}
