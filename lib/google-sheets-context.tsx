"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createSheet, writeToSheet } from "./google-sheets-client";

// ─── Google Identity Services types (loaded at runtime from CDN) ──────────────

interface GisTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GisError {
  type: string;
  message: string;
}

interface GisTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GisOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GisTokenResponse) => void;
    error_callback?: (error: GisError) => void;
  }) => GisTokenClient;
}

interface GisAccounts {
  oauth2: GisOAuth2;
}

interface GisWindow {
  google?: { accounts: GisAccounts };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type SheetStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "exporting"
  | "done"
  | "error";

interface GoogleSheetsContextValue {
  status: SheetStatus;
  error: string | null;
  sheetUrl: string | null;
  exportToSheet: (
    headers: string[],
    rows: (string | number)[][],
    title?: string,
  ) => Promise<void>;
  reset: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const GoogleSheetsContext = createContext<GoogleSheetsContextValue | null>(null);

function loadGisScript(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if ((window as GisWindow).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function GoogleSheetsProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<{
    status: SheetStatus;
    error: string | null;
    sheetUrl: string | null;
  }>({ status: "idle", error: null, sheetUrl: null });

  const tokenRef = useRef<string | null>(null);

  const exportToSheet = useCallback(
    async (
      headers: string[],
      rows: (string | number)[][],
      title?: string,
    ) => {
      try {
        // Step 1 — authenticate if no token yet
        if (!tokenRef.current) {
          setState({ status: "connecting", error: null, sheetUrl: null });

          await loadGisScript();

          const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
          if (!clientId) {
            throw new Error(
              "Google Client ID not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local",
            );
          }

          const token = await new Promise<string>((resolve, reject) => {
            const gis = (window as GisWindow).google?.accounts?.oauth2;
            if (!gis) {
              reject(new Error("Google Identity Services not loaded"));
              return;
            }
            const client = gis.initTokenClient({
              client_id: clientId,
              scope: "https://www.googleapis.com/auth/spreadsheets",
              callback: (response: GisTokenResponse) => {
                if (response.access_token) {
                  resolve(response.access_token);
                } else if (response.error === "access_denied") {
                  reject(
                    new Error(
                      "Access denied — you cancelled the authorization",
                    ),
                  );
                } else {
                  reject(
                    new Error(
                      response.error_description ?? "OAuth failed",
                    ),
                  );
                }
              },
              error_callback: (err: GisError) => {
                  if (err.type === "popup_closed") {
                    reject(new Error("Sign-in popup was closed"));
                  } else if (err.type === "popup_failed_to_open") {
                    reject(
                      new Error(
                        "Pop-up blocked. Allow pop-ups for this site and try again.",
                      ),
                    );
                  } else {
                    reject(
                      new Error(err.message ?? "Authentication failed"),
                    );
                  }
                },
              },
            );
            client.requestAccessToken();
          });

          tokenRef.current = token;
        }

        // Step 2 — create sheet and write data
        setState({ status: "exporting", error: null, sheetUrl: null });

        const sheetTitle =
          title ??
          `FPL Players - ${new Date().toISOString().slice(0, 10)}`;

        const { spreadsheetId, spreadsheetUrl } = await createSheet(
          tokenRef.current,
          sheetTitle,
        );

        const values = [headers, ...rows];
        await writeToSheet(
          tokenRef.current,
          spreadsheetId,
          "Players!A1",
          values,
        );

        setState({
          status: "done",
          error: null,
          sheetUrl: spreadsheetUrl,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        // Clear a stale token so next attempt re-auths
        if (
          message.includes("401") ||
          message.includes("token") ||
          message.includes("access_denied")
        ) {
          tokenRef.current = null;
        }
        setState({ status: "error", error: message, sheetUrl: null });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    tokenRef.current = null;
    setState({ status: "idle", error: null, sheetUrl: null });
  }, []);

  return (
    <GoogleSheetsContext.Provider
      value={{ ...state, exportToSheet, reset }}
    >
      {children}
    </GoogleSheetsContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useGoogleSheets(): GoogleSheetsContextValue {
  const ctx = useContext(GoogleSheetsContext);
  if (!ctx) {
    throw new Error(
      "useGoogleSheets must be used within a <GoogleSheetsProvider>",
    );
  }
  return ctx;
}
