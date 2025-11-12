import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Splash from "@/components/splash";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Wishlist from "@/pages/wishlist";
import Kanban from "@/pages/kanban";
import UserManagementPage from "@/pages/user-management";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

/** Consulta de sesión con persistencia automática */
function useSession() {
  return useQuery({
    queryKey: ["/api/session"],
    queryFn: async () => {
      const res = await fetch("/api/session", { credentials: "include" });
      if (!res.ok) {
        // console.log("🔒 Session check failed (non-OK status):", res.status);
        // Lanzar error para que React Query conserve el último dato válido
        throw new Error(`Session endpoint ${res.status}`);
      }
      const data = await res.json() as { user: null | { email: string } };
      if (data.user) {
        // console.log("✅ Session active:", data.user.email);
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
    retry: 2, // Reintentar 2 veces
    retryDelay: 1000, // Esperar 1s entre reintentos
    refetchOnWindowFocus: true, // Refrescar cuando la ventana recibe foco
    refetchOnMount: true, // Siempre refrescar al montar
    refetchOnReconnect: true, // Refrescar al reconectar
    // NO usar refetchInterval: las queries de proyectos/tareas ya hacen requests
    // y el backend tiene rolling:true que renueva la sesión automáticamente
  });
}

/** Puerta de autenticación para rutas privadas */
function AuthGate({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data, isLoading, error, refetch } = useSession();
  const { toast } = useToast();
  const [graceUntil, setGraceUntil] = useState<number>(0);
  const noUserCountRef = useRef<number>(0);

  // Escuchar evento global de pérdida de sesión y no redirigir de inmediato
  useEffect(() => {
    const onAuthLost = () => {
      // 30s de gracia para evitar redirección repentina
      setGraceUntil(Date.now() + 30_000);
      noUserCountRef.current = 0;
      toast({
        title: "Sesión inactiva",
        description: "Intentaremos restaurar tu sesión automáticamente.",
      });
      // Reintentar obtener la sesión en 2s
      setTimeout(() => refetch(), 2000);
    };
    window.addEventListener("auth:lost", onAuthLost);
    return () => window.removeEventListener("auth:lost", onAuthLost);
  }, [refetch, toast]);

  useEffect(() => {
    if (isLoading) return;

    // Si hay usuario, resetear contador
    if (data?.user) {
      noUserCountRef.current = 0;
      return;
    }

    // Si no hay usuario, pero estamos en ventana de gracia, no redirigir
    if (Date.now() < graceUntil) {
      return;
    }

    // Requerir 2 comprobaciones consecutivas sin usuario antes de redirigir
    noUserCountRef.current += 1;
    if (noUserCountRef.current >= 2) {
      // console.log("🔒 AuthGate: Confirmed no session, redirecting to login");
      setLocation("/login");
    } else {
      // Intentar refetch inmediato una vez
      refetch();
    }
  }, [isLoading, data, graceUntil, setLocation, refetch]);

  // Si estamos en login, no mostrar nada
  if (location === "/login") {
    return null;
  }

  if (isLoading) {
    // loader mínimo para evitar parpadeos
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500 text-sm">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  // Si hay error pero estamos cargando, mostrar loader
  if (error && isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500 text-sm">
        <div className="animate-pulse">Verifying session…</div>
      </div>
    );
  }

  if (!data?.user) {
    // console.log("🔒 AuthGate: No user found, should redirect");
    return null; // redirigiendo
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Pública */}
      <Route path="/login" component={LoginPage} />

      {/* Privadas */}
      <Route path="/" component={() => (
        <AuthGate>
          <Dashboard />
        </AuthGate>
      )} />
      <Route path="/projects" component={() => (
        <AuthGate>
          <Projects />
        </AuthGate>
      )} />
      <Route path="/projects/:id" component={() => (
        <AuthGate>
          <ProjectDetail />
        </AuthGate>
      )} />
      <Route path="/wishlist" component={() => (
        <AuthGate>
          <Wishlist />
        </AuthGate>
      )} />
      <Route path="/kanban" component={() => (
        <AuthGate>
          <Kanban />
        </AuthGate>
      )} />
      <Route path="/admin/users" component={() => (
        <AuthGate>
          <UserManagementPage />
        </AuthGate>
      )} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const hideChrome = location === "/login"; // oculta Sidebar en login (ajusta si agregas /signup)

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Splash /> {/* appears on launch, fades out automatically */}
        <div className="min-h-screen flex bg-slate-50">
          {!hideChrome && <Sidebar />}
          <main className={hideChrome ? "flex-1" : "flex-1 lg:ml-64"}>
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
