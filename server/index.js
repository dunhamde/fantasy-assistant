"use strict";

const http = require("node:http");
const { randomUrlSafe, challengeFor } = require("./auth");

const CLIENT_ID = "dj0yJmk9akZlTHBNYm5abXhqJmQ9WVdrOVNYWkdVRGx2VDBNbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTg5";
const REDIRECT_URI = "https://dunhamde.github.io/fantasy-assistant/callback.html";
const FANTASY_ENDPOINT = "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nfl/leagues?format=json";
const PORT = 8765;
const pending = new Map();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · Fantasy Assistant</title><style>body{font-family:system-ui,sans-serif;background:#101828;color:#f5f7fb;margin:0;padding:30px}main{max-width:850px;margin:7vh auto;background:#1b2940;border:1px solid #41506a;border-radius:20px;padding:36px}h1{font-size:clamp(28px,5vw,42px);line-height:1.1}p{color:#c4cedf;line-height:1.6}a{color:#b7a2ff}a.button{display:inline-block;background:#b7a2ff;color:#152035;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:14px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0d1729;padding:18px;border-radius:12px;color:#d9e5f5;font-size:12px}li{margin:8px 0}details{margin-top:24px}footer{max-width:850px;margin:auto;color:#a5b5ca;font-size:12px}</style></head><body><main>${body}</main><footer><a href="https://football.fantasysports.yahoo.com/">Fantasy data provided by Yahoo Fantasy</a></footer></body></html>`;
}

function sendPage(res, status, title, body) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" });
  res.end(page(title, body));
}

function extractLeagues(value, found = new Map()) {
  if (!value || typeof value !== "object") return found;
  if (typeof value.league_key === "string") found.set(value.league_key, value.name || value.league_key);
  for (const child of Object.values(value)) extractLeagues(child, found);
  return found;
}

async function exchangeCode(code, verifier) {
  const response = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code, code_verifier: verifier }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(`Yahoo token exchange failed (${response.status}: ${data.error || "unknown error"}).`);
  return data.access_token;
}

async function readLeagues(accessToken) {
  const response = await fetch(FANTASY_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  const body = await response.text();
  if (!response.ok) throw new Error(`Yahoo Fantasy API returned ${response.status}. ${body.includes("additional_authorization_required") ? "Yahoo may still need to provision this Client ID for Fantasy API access." : "Check Fantasy Sports – Read permission and Yahoo provisioning."}`);
  try { return JSON.parse(body); } catch { throw new Error("Yahoo returned an unexpected non-JSON Fantasy API response."); }
}

function startAuthorization(res) {
  const state = randomUrlSafe();
  const verifier = randomUrlSafe();
  const now = Date.now();
  for (const [key, value] of pending) if (now - value.issued > 600_000) pending.delete(key);
  pending.set(state, { verifier, issued: now });
  const authorization = new URL("https://api.login.yahoo.com/oauth2/request_auth");
  authorization.search = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: "code", scope: "fspt-r", state, code_challenge: challengeFor(verifier), code_challenge_method: "S256" }).toString();
  res.writeHead(302, { Location: authorization.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  res.end();
}

async function finishAuthorization(url, res) {
  const state = url.searchParams.get("state");
  const session = state ? pending.get(state) : null;
  if (state) pending.delete(state);
  if (url.searchParams.get("error")) return sendPage(res, 400, "Yahoo authorization declined", `<h1>Yahoo authorization did not complete</h1><p>${escapeHtml(url.searchParams.get("error"))}</p><a href="/">Try again</a>`);
  const code = url.searchParams.get("code");
  if (!session || !code || Date.now() - session.issued > 600_000) return sendPage(res, 400, "Session expired", "<h1>Connection expired</h1><p>Start a new Yahoo connection from the local app.</p><a href="/">Try again</a>");
  try {
    const accessToken = await exchangeCode(code, session.verifier);
    const data = await readLeagues(accessToken);
    const leagues = [...extractLeagues(data)].map(([key, name]) => `<li>${escapeHtml(name)} <small>(${escapeHtml(key)})</small></li>`).join("");
    return sendPage(res, 200, "Yahoo connected", `<h1>Yahoo Fantasy connected</h1><p>The app successfully read your NFL fantasy league data. This connection test does not save tokens or make roster changes.</p>${leagues ? `<h2>Your leagues</h2><ul>${leagues}</ul>` : "<p>No current NFL leagues were found in the response.</p>"}<a href="/">Back to Fantasy Assistant</a><details><summary>View API response</summary><pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre></details>`);
  } catch (error) {
    return sendPage(res, 502, "Yahoo connection failed", `<h1>Yahoo connection failed</h1><p>${escapeHtml(error.message)}</p><a href="/">Try again</a>`);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method !== "GET") return sendPage(res, 405, "Method not allowed", "<h1>Method not allowed</h1>");
  if (url.pathname === "/start") return startAuthorization(res);
  if (url.pathname === "/finish") return void finishAuthorization(url, res);
  if (url.pathname === "/health") { res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); return res.end(JSON.stringify({ ready: true })); }
  if (url.pathname !== "/") return sendPage(res, 404, "Not found", "<h1>Page not found</h1>");
  return sendPage(res, 200, "Connect Yahoo", "<h1>Connect Yahoo Fantasy</h1><p>Authorize read-only access to check that your NFL leagues are available. This test runs on your computer and does not save your tokens.</p><a class=\"button\" href=\"/start\">Connect Yahoo</a>");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Fantasy Assistant is ready at http://127.0.0.1:${PORT}/`);
});
