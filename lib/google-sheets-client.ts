// ─── Raw fetch-based Google Sheets API client ────────────────────────────────
// No gapi dependency needed. Called from the React context after OAuth.

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export type SheetsError = { code: number; message: string };

export async function createSheet(
  accessToken: string,
  title: string,
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const res = await fetch(SHEETS_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: "Players" } }],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const err: SheetsError = body?.error ?? { code: res.status, message: res.statusText };
    throw new Error(`Google Sheets: create failed (${err.code}) — ${err.message}`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId as string,
    spreadsheetUrl: data.spreadsheetUrl as string,
  };
}

export async function writeToSheet(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: (string | number)[][],
): Promise<void> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values,
      majorDimension: "ROWS",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const err: SheetsError = body?.error ?? { code: res.status, message: res.statusText };
    throw new Error(`Google Sheets: write failed (${err.code}) — ${err.message}`);
  }
}
