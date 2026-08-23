import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect, useRef } from 'react';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useAuth,
} from "@clerk/react";
import { shadcn } from '@clerk/themes';
import { Router as WouterRouter, Switch, Route, useLocation, Redirect } from 'wouter';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";

import { Toaster } from 'sonner';

import Landing from '@/pages/Landing1';
import Dashboard from '@/pages/Dashboard';
import Subscriptions from '@/pages/Subscriptions';
import Analytics from '@/pages/Analytics';
import CalendarPage from '@/pages/Calendar';
import Reminders from '@/pages/Reminders';
import Settings from '@/pages/Settings';
import Health from '@/pages/Health';
import Shell from '@/components/layout/Shell';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
//const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(38, 80%, 50%)",
    colorForeground: "hsl(24, 10%, 10%)",
    colorMutedForeground: "hsl(25, 8%, 45%)",
    colorDanger: "hsl(0, 72%, 51%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(0, 0%, 100%)",
    colorInputForeground: "hsl(24, 10%, 10%)",
    colorNeutral: "hsl(30, 8%, 90%)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white dark:bg-slate-900 rounded-2xl w-[440px] max-w-full overflow-hidden border border-border shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary font-semibold hover:text-primary/90",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground bg-white dark:bg-slate-900 px-2",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-green-600",
    alertText: "text-destructive",
    logoBox: "mx-auto mb-4",
    logoImage: "h-10 object-contain",
    socialButtonsBlockButton: "border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
    formButtonPrimary: "bg-primary text-primary-foreground hover:brightness-110 transition-all h-10 shadow-sm active:scale-[0.98]",
    formFieldInput: "bg-background border-border text-foreground h-10 placeholder:text-muted-foreground/50",
    footerAction: "bg-slate-50 dark:bg-slate-900/50 pt-6 border-t border-border",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/20 text-destructive",
    otpCodeFieldInput: "border-border text-foreground focus:ring-primary",
    formFieldRow: "mb-4",
    main: "p-8",
  },
};

const queryClient = new QueryClient();

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}




function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
   <>
      <Show when="signed-in">
        <Shell>
          <Component />
        </Shell>
     </Show>
      <Show when="signed-out">
        <Redirect to="/" />
     </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthTokenProvider() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      return await getToken();
    });

    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}


function Router() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      //proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AuthTokenProvider />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
          <Route path="/subscriptions"><ProtectedRoute component={Subscriptions} /></Route>
          <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
          <Route path="/calendar"><ProtectedRoute component={CalendarPage} /></Route>
          <Route path="/reminders"><ProtectedRoute component={Reminders} /></Route>
          <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
          <Route path="/health"><ProtectedRoute component={Health} /></Route>
          
          <Route>
            <div className="flex min-h-[100dvh] items-center justify-center bg-background">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-2">404</h1>
                <p className="text-muted-foreground mb-4">Page not found</p>
                <a href="/" className="text-primary hover:underline">Go home</a>
              </div>
            </div>
          </Route>
        </Switch>
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

//function App() {
  //return (
   // <div style={{ padding: "40px", fontSize: "32px" }}>
     // 🚀 Traqqy works!
    //</div>
 // );
//}

function App() {
  return (
    <WouterRouter base={basePath}>
      <Router />
    </WouterRouter>
  );
}
export default App;