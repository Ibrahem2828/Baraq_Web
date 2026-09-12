import { QueryClient, isServer } from "@tanstack/react-query";
import { APP_DEFAULTS } from "@/config/constants";
import { ApiError } from "@/lib/api/errors";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: APP_DEFAULTS.queryStaleTimeMs,
        retry: (failureCount, error) => {
          if (
            error instanceof ApiError &&
            (error.code === "UNAUTHORIZED" || error.code === "VALIDATION")
          ) {
            return false;
          }
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** SSR-safe QueryClient factory: a fresh client per request on the server, one singleton in the browser. */
export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
