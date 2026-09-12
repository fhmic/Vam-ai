type AuthCallbackDeps = {
  searchParams: URLSearchParams;
  exchangeCodeForSession: (code: string) => Promise<{ error: { message?: string } | null } | null>;
  setSession: (params: { access_token: string; refresh_token: string }) => Promise<{ error: { message?: string } | null } | null>;
};

function getRecoveryToken(searchParams: URLSearchParams) {
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && type) {
    return { tokenHash, type };
  }

  const hash = searchParams.get("hash") ?? searchParams.get("fragment");
  if (!hash) {
    return null;
  }

  const hashParams = new URLSearchParams(hash);
  const hashToken = hashParams.get("token_hash");
  const hashType = hashParams.get("type");

  if (hashToken && hashType) {
    return { tokenHash: hashToken, type: hashType };
  }

  return null;
}

export async function handleAuthCallback({
  searchParams,
  exchangeCodeForSession,
  setSession,
}: AuthCallbackDeps): Promise<string> {
  const code = searchParams.get("code");
  const recoveryToken = getRecoveryToken(searchParams);
  const type = searchParams.get("type") ?? recoveryToken?.type ?? null;

  if (code) {
    const result = await exchangeCodeForSession(code);
    if (!result?.error) {
      return type === "recovery" ? "/update-password" : "/dashboard";
    }
  }

  if (recoveryToken || searchParams.get("access_token") || searchParams.get("refresh_token")) {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const result = await setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (!result?.error) {
        return type === "recovery" ? "/update-password" : "/dashboard";
      }
    }
  }

  return "/sign-in?error=auth_callback_failed";
}
