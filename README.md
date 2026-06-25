# Rust Discord Bot

Discord bot plus a small web panel for Rust server/team management.

## What It Can Do

- `/online` shows Rust+ team members.
- `/server` shows Rust+ server info and population when available.
- `/map` posts the current Rust+ map image.
- `/switch entity_id state` controls Rust smart switches.
- `/wipe list` and `/wipe set` track wipe schedules.
- `/role give` and `/role remove` manage Discord roles for admins.
- Web panel runs at `http://localhost:3001` by default.

## Setup In VS Code

1. Open this folder in VS Code.
2. Copy `.env.example` to `.env`.
3. Fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `DISCORD_GUILD_ID`.
4. Run `npm.cmd run deploy:commands`.
5. Run `npm.cmd run dev`.

PowerShell may block plain `npm` on this PC, so use `npm.cmd` in the VS Code terminal.

## Discord Bot Setup

Create an app at the Discord Developer Portal, add a bot, copy its token, and invite it to your server with these bot permissions:

- Use Slash Commands
- Send Messages
- Embed Links
- Attach Files
- Manage Roles

For role management, keep the bot's Discord role above the roles it needs to give or remove.

## Rust+ Setup

Rust+ requires server pairing details:

- `RUST_SERVER_IP`
- `RUST_APP_PORT`
- `RUST_PLAYER_ID`
- `RUST_PLAYER_TOKEN`

The Rust server must have `app.port` configured and open in its firewall. After pairing, add the details to `.env`, restart the bot, and Rust+ commands will work.

## Hosting

For a beginner-friendly web panel, deploy this project to Railway, Render, or a VPS. Set the same `.env` values as hosting environment variables. The app exposes one process that runs both the Discord bot and web panel.
