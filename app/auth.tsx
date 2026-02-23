"use client";

import { SyntheticEvent, useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import cookie from "cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.spider.cloud";

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: { id?: string; email?: string; app_metadata?: Record<string, any> };
}

enum CookieKeys {
  ACCESS_TOKEN = "spider_access_token",
  REFRESH_TOKEN = "spider_refresh_token",
}

const COOKIE_OPTS = { sameSite: "lax" as const, secure: true, path: "/" };

function getStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("spider_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeSession(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem("spider_session", JSON.stringify(session));
    document.cookie = cookie.serialize(CookieKeys.ACCESS_TOKEN, session.access_token || "", COOKIE_OPTS);
    document.cookie = cookie.serialize(CookieKeys.REFRESH_TOKEN, session.refresh_token || "", COOKIE_OPTS);
  } else {
    localStorage.removeItem("spider_session");
    const expire = new Date(0);
    document.cookie = cookie.serialize(CookieKeys.ACCESS_TOKEN, "", { ...COOKIE_OPTS, expires: expire });
    document.cookie = cookie.serialize(CookieKeys.REFRESH_TOKEN, "", { ...COOKIE_OPTS, expires: expire });
  }
}

function isExpired(session: Session | null): boolean {
  if (!session?.expires_at) return true;
  return Math.floor(Date.now() / 1000) >= session.expires_at;
}

export const useAuthMenu = () => {
  const [trigger, setTrigger] = useState<"login" | "register">("login");
  const [open, setOpen] = useState(false);
  const [$session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored?.access_token) return;
    if (isExpired(stored)) {
      // Try refreshing
      fetch(API_URL + "/data/refresh-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(stored),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          const fresh = res?.data?.session;
          if (fresh?.access_token) {
            const merged = { ...stored, ...fresh };
            storeSession(merged);
            setSession(merged);
          } else {
            storeSession(null);
          }
        })
        .catch(() => storeSession(null));
    } else {
      setSession(stored);
    }
  }, []);

  const signIn = (session: Session) => {
    storeSession(session);
    setSession(session);
    setOpen(false);
  };

  const signOut = async () => {
    try {
      await fetch(API_URL + "/data/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: $session?.access_token || "" },
        body: JSON.stringify({ jwt: $session?.access_token }),
      });
    } catch {}
    storeSession(null);
    setSession(null);
  };

  return { email: $session?.user?.email, open, trigger, setTrigger, setOpen, $session, signIn, signOut };
};

const AuthDropdown = ({
  setTrigger, setOpen, $session, open, trigger, signIn,
}: ReturnType<typeof useAuthMenu>) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;

    if (!email || !password) {
      setIsLoading(false);
      return toast({ title: "Required", description: "Please enter email and password." });
    }

    try {
      const res = await fetch(API_URL + "/data/authenticate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(trigger === "register" ? { registering: true } : {}),
        }),
      });
      const json = await res.json();

      if (json?.error) {
        toast({ title: "Auth Error", description: json.error?.message || json.error, variant: "destructive" });
      }

      let session = json?.data?.session ?? json?.data?.user ?? json?.session ?? json?.user;

      // If registering and no session returned, try logging in
      if (trigger === "register" && !session?.access_token) {
        const loginRes = await fetch(API_URL + "/data/authenticate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const loginJson = await loginRes.json();
        session = loginJson?.data?.session ?? loginJson?.data?.user ?? loginJson?.session ?? loginJson?.user;
      }

      if (session?.access_token) {
        signIn(session);
        toast({ title: "Signed in", description: `Welcome${session.user?.email ? `, ${session.user.email}` : ""}!` });
      }
    } catch (err) {
      toast({ title: "Network error", description: "Could not reach auth server.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const onOAuth = async (provider: "github" | "discord") => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL + "/data/authenticate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          [provider]: true,
          registering: trigger === "register",
          json: true,
          redirect_to: window.location.origin,
        }),
      });
      const json = await res.json();
      const url = json?.data;
      if (url && typeof url === "string") {
        window.location.href = url;
      }
    } catch {
      toast({ title: "OAuth error", description: `Could not start ${provider} login.`, variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {$session ? null : (
        <div className="flex gap-2 items-center shrink-0">
          <DialogTrigger
            onClick={() => setTrigger("login")}
            className={`${buttonVariants({ variant: "default", size: "sm" })} uppercase font-mono text-xs`}
          >Sign In</DialogTrigger>
          <DialogTrigger
            onClick={() => setTrigger("register")}
            className={`${buttonVariants({ variant: "outline", size: "sm" })} uppercase font-mono text-xs border-primary/50`}
          >Register</DialogTrigger>
        </div>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <div className="max-w-screen-sm container text-black dark:text-white pb-6">
          <DialogTitle className="text-center">Spider</DialogTitle>
          <DialogDescription className="text-center">
            {trigger === "register" ? "Create an account to start." : "Sign in to your account."}
          </DialogDescription>
          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="auth-email" className="sr-only">Email</Label>
              <Input id="auth-email" name="email" type="email" placeholder="Email" autoComplete="email" disabled={isLoading} className="bg-muted/50" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="auth-password" className="sr-only">Password</Label>
              <Input id="auth-password" name="password" type="password" placeholder="Password" disabled={isLoading} className="bg-muted/50" />
            </div>
            <Button type="submit" disabled={isLoading} className="bg-[#3bde77] hover:bg-[#2bc866] text-black font-medium">
              {isLoading ? "Loading..." : trigger === "register" ? "Register" : "Sign In"}
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Button variant="outline" type="button" disabled={isLoading} onClick={() => onOAuth("github")} className="w-full">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </Button>
            <Button variant="outline" type="button" disabled={isLoading} onClick={() => onOAuth("discord")} className="w-full">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
              Discord
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDropdown;
