# Fantasy Assistant

A starter site and local Yahoo connection test for a personal Fantasy Football assistant. The planned app will analyze league and roster data to suggest lineups, waiver pickups, and trade ideas. The current local server tests read-only access; it does not make recommendations or roster changes yet.

## Site

- Homepage: <https://dunhamde.github.io/fantasy-assistant/>
- Yahoo redirect URI: <https://dunhamde.github.io/fantasy-assistant/callback.html>

The public site is hosted on GitHub Pages from the `main` branch root. It contains no credentials or tokens. The Yahoo app uses **Public Client**, **Fantasy Sports – Read**, and Authorization Code with PKCE. The Client ID is public, but never commit a Client Secret or OAuth token to this repository.

## Run the local connection test

1. Install Node.js 20 or newer if it is not already installed.
2. In this repository, run `node server/index.js`.
3. Open <http://127.0.0.1:8765/> and select **Connect Yahoo**.
4. Approve read-only access on Yahoo. Yahoo returns to the GitHub Pages callback, which sends the authorization response to the local app. The local app exchanges it for a short-lived token and lists your NFL leagues.

The server listens only on your computer (`127.0.0.1`). It keeps the PKCE verifier in memory for ten minutes and does not save tokens. Each test requires a fresh Yahoo connection. The local server must stay running until Yahoo redirects back.

If Yahoo login succeeds but the Fantasy API responds `403: This application is not authorized to perform this action`, use Yahoo's [application confirmation form](https://sports.yahoo.com/developer/application-confirmation/) to submit this app's Client ID. Yahoo says Fantasy API access is provisioned after it receives the signed agreement and developer account information.

Yahoo currently states that the Fantasy Sports API is read-only, so roster moves and trades must be made in Yahoo Fantasy.
