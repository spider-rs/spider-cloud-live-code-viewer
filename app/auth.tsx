"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Auth } from "@supabase/auth-ui-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient, Session } from "@supabase/supabase-js";
import cookie from "cookie";

enum CookieKeys {
  ACCESS_TOKEN = "supabase/access_token",
  REFRESH_TOKEN = "supabase/refresh_token",
  USER_ROLE_SET = "app/user_role",
}

const expireAuthCookies = () => {
  const date = new Date();
  date.setDate(date.getDate() - 2);
  document.cookie = cookie.serialize(CookieKeys.ACCESS_TOKEN, "", {
    expires: date,
  });
  // keep refresh token around for re-auth
  document.cookie = cookie.serialize(CookieKeys.REFRESH_TOKEN, "", {
    expires: date,
  });
};

const windowExist = typeof window !== "undefined";

export const supabase = createClient(
  String(process.env.NEXT_PUBLIC_SUPABASE_URL),
  String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  {
    auth: {
      persistSession: windowExist,
      autoRefreshToken: windowExist,
    },
  },
);

// modal states
enum Triggers {
  "register",
  "login",
}

// the authentication menu main hook to determine user.
export const useAuthMenu = () => {
  const [trigger, setTrigger] = useState<Triggers>(Triggers.login);
  const [open, setOpen] = useState(false);
  const [$session, setSession] = useState<Session | null>();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase?.auth?.onAuthStateChange(async (event, newSession) => {
      const nextToken = newSession?.access_token;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setOpen(false);
      }

      // sign out of the session
      if (event === "SIGNED_OUT") {
        expireAuthCookies();
        setSession(null);
        return;
      }

      if (!newSession && $session?.refresh_token) {
        try {
          const freshSession = await supabase?.auth?.refreshSession($session);

          if (freshSession?.data?.session) {
            newSession = freshSession.data.session;
          }
        } catch (e) {
          console.error(e);
        }
      } else if (newSession) {
        try {
          document.cookie = cookie.serialize(
            CookieKeys.ACCESS_TOKEN,
            nextToken || "",
            {
              sameSite: "lax",
              secure: !process.env.DEV,
              path: "/",
            },
          );
          // keep refresh token around for re-auth
          document.cookie = cookie.serialize(
            CookieKeys.REFRESH_TOKEN,
            newSession?.refresh_token || "",
            {
              sameSite: "lax",
              secure: !process.env.DEV,
              path: "/",
            },
          );
        } catch (e) {
          console.error(e);
        }
      }

      setSession(newSession);
    });

    // refresh the session every reload.
    if ($session?.access_token) {
      const currentTime = Math.floor(Date.now() / 1000);
      const expiryTime = $session?.expires_at;

      // refresh the token.
      if (expiryTime && currentTime >= expiryTime) {
        supabase?.auth
          ?.refreshSession($session)
          .then((data) => {
            if (data?.data) {
              setSession(data?.data?.session);
            }
          })
          .catch((e) => {
            console.error(e);
          });
      }
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return {
    email: $session?.user.email,
    open,
    trigger,
    setTrigger,
    setOpen,
    $session,
  };
};

// auth dropdown menu content
const AuthDropdown = ({
  setTrigger,
  setOpen,
  $session,
  open,
  trigger,
}: ReturnType<typeof useAuthMenu>) => {
  const onLoginEvent = () => setTrigger(Triggers.login);
  const onRegisterEvent = () => setTrigger(Triggers.register);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {$session ? null : (
        <div className="flex gap-3 items-center">
          <DialogTrigger
            onClick={onLoginEvent}
            className={`${buttonVariants({
              variant: "default",
            })} uppercase font-mono bg-black text-white dark:bg-white dark:text-black`}
          >
            <span>Sign In</span>
          </DialogTrigger>
          <DialogTrigger
            onClick={onRegisterEvent}
            className={`${buttonVariants({
              variant: "outline",
            })} uppercase font-mono dark:border-white border-black`}
          >
            <span>Register</span>
          </DialogTrigger>
        </div>
      )}

      <DialogContent className="sm:max-w-[425px]">
        <>
          <div className="max-w-screen-sm container text-black dark:text-white pb-10">
            <DialogTitle className="capitalize text-center">
              Spider Cloud VSCode Live Preview
            </DialogTitle>
            <DialogDescription className="text-center">
              Authenticate to start.
            </DialogDescription>

            <div className="py-4">
              <Auth
                supabaseClient={supabase}
                view={trigger === Triggers.register ? "sign_up" : undefined}
                appearance={{
                  extend: false,
                  className: {
                    divider: "w-full h-0.5 bg-gray-200 dark:bg-gray-800 my-4",
                    label: "block py-1",
                    container: "grid gap-3",
                    button:
                      "px-3 py-2 rounded border-2 hover:bg-blue-300 dark:hover:bg-blue-600 dark:hover:text-gray-200 hover:text-gray-600 dark:hover:border-blue-500 hover:border-blue-500 flex gap-2 place-content-center place-items-center",
                    input:
                      "px-3 py-2 rounded border-2 flex-1 w-full bg-transparent",
                    anchor: "text-center underline hover:text-blue-500",
                    message: "block w-full py-2 text-red-500 text-center",
                  },
                }}
                providers={["github", "discord"]}
                redirectTo="https://vscode.spider.cloud"
                localization={{
                  variables: {
                    sign_up: {
                      password_label: "Password",
                    },
                    sign_in: {
                      password_label: "Password",
                    },
                  },
                }}
              />
            </div>
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDropdown;
