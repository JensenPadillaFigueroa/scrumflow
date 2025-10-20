import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Si es error de autenticación, limpiar estado y redirigir
    if (res.status === 401 || res.status === 403) {
      console.log("🔒 Auth error detected:", res.status, res.statusText, "URL:", res.url);
      // Obtener el mensaje de error solo una vez
      const text = await res.text();
      // Verificar si realmente es problema de sesión
      try {
        const sessionCheck = await fetch("/api/session", { credentials: "include" });
        const sessionData = await sessionCheck.json();
        if (sessionData.user) {
          console.log("🔒 Session is valid, but request failed. Not treating as logout.");
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
      } catch (e) {
        console.log("🔒 Session check failed (network or parse):", e);
      }

      // Notificar a la app sin redirigir automáticamente
      try {
        window.dispatchEvent(
          new CustomEvent('auth:lost', { detail: { status: res.status, url: res.url } })
        );
      } catch {}

      throw new Error(`${res.status}: ${text || res.statusText}`);
    }

    const genericText = res.statusText || 'Request failed';
    throw new Error(`${res.status}: ${genericText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Refrescar al volver a la ventana
      staleTime: 2 * 60 * 1000, // 2 minutos de caché
      retry: (failureCount, error) => {
        // No reintentar errores de autenticación
        if (error.message.includes('401') || error.message.includes('403')) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // No reintentar errores de autenticación
        if (error.message.includes('401') || error.message.includes('403')) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});
