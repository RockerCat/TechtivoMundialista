import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/reset-password";

  // Reject external redirects: next must be a root-relative internal path.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/reset-password";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/reset-password?error=missing_code`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/reset-password?error=invalid_link`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
