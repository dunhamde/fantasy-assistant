# Fantasy Assistant

A starter site for a personal Yahoo Fantasy Football assistant. The planned app will analyze league and roster data to suggest lineups, waiver pickups, and trade ideas. This first version is a public landing page and OAuth callback placeholder; it does not connect to Yahoo or make recommendations yet.

## Site

- Homepage: <https://dunhamde.github.io/fantasy-assistant/>
- Yahoo redirect URI: <https://dunhamde.github.io/fantasy-assistant/callback.html>

This site is hosted on GitHub Pages from the `main` branch root. It contains no credentials or tokens. When registering it with Yahoo, select **Public Client** and **Fantasy Sports – Read**. A browser-based integration will need Authorization Code with PKCE. Never commit a client secret or refresh token to this public repository.

Yahoo currently states that the Fantasy Sports API is read-only, so roster moves and trades must be made in Yahoo Fantasy.
