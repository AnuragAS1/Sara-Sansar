"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

declare global {
  interface Window {
    FB?: {
      init: (opts: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (
        cb: (res: { status: string; authResponse?: { accessToken: string } }) => void,
        opts: { scope: string }
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function FacebookButton({ onError }: { onError?: (msg: string) => void }) {
  const { loginFacebook } = useAuth();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  useEffect(() => {
    if (!appId) return;
    if (window.FB) { setReady(true); return; }

    window.fbAsyncInit = () => {
      window.FB!.init({ appId, cookie: true, xfbml: false, version: "v18.0" });
      setReady(true);
    };

    const id = "fb-jssdk";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.defer = true;
    s.src = "https://connect.facebook.net/en_US/sdk.js";
    document.body.appendChild(s);
  }, [appId]);

  const handle = () => {
    if (!ready || !window.FB) return;
    setBusy(true);
    window.FB.login(
      async (response) => {
        try {
          if (response.status === "connected" && response.authResponse?.accessToken) {
            await loginFacebook(response.authResponse.accessToken);
          } else {
            onError?.("Facebook login was cancelled.");
          }
        } catch (err) {
          onError?.(err instanceof Error ? err.message : "Facebook login failed.");
        } finally {
          setBusy(false);
        }
      },
      { scope: "email,public_profile" }
    );
  };

  if (!appId) {
    return (
      <button
        type="button"
        disabled
        className="btn-ghost w-full opacity-50 cursor-not-allowed"
        title="Set NEXT_PUBLIC_FACEBOOK_APP_ID to enable"
      >
        <FbIcon /> Continue with Facebook
        <span className="text-[10px] text-mute ml-2">(set FB_APP_ID)</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={!ready || busy}
      className="btn-ghost w-full"
    >
      <FbIcon />
      {busy ? "Connecting…" : "Continue with Facebook"}
    </button>
  );
}

function FbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
      <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.49 0-1.955.925-1.955 1.874V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z"/>
    </svg>
  );
}
