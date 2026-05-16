# Deployment Guide

## Prerequisites

- Docker + Docker Compose on VPS
- (Optional) Coolify for managed deployments

## Quick Start (VPS)

### 1. Copy environment file

```bash
cp .env.production.example .env
```

Edit `.env` and set all required values (POSTGRES_PASSWORD, DASHBOARD_PASSWORD minimum).

### 2. Run database migration

```bash
docker compose -f docker-compose.prod.yml up postgres -d
sleep 5
pnpm db:push
```

### 3. Start all services

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 4. Verify health

```bash
curl http://localhost:3000/api/health
curl http://localhost:9090/health
```

### 5. Access dashboard

Open `http://your-vps-ip:3000` — you will be prompted for the dashboard credentials.

---

## Coolify Deployment

1. Create a new **Docker Compose** project in Coolify
2. Point to this repository
3. Set compose file: `docker-compose.prod.yml`
4. Add all environment variables from `.env.production.example` in Coolify's env UI
5. Enable **health checks** (already configured in docker-compose.prod.yml)
6. Deploy

---

## Upgrading

```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## Bot Modes

| Mode | Description |
|------|-------------|
| `paper` | Default. Virtual balance. No real orders. |
| `live` | Real trading. Requires exchange API keys. Enable via Settings → General. |

**Never enable live mode without first:**
- Running paper trading for >= 2 weeks
- Verifying signal quality via `/analytics`
- Setting conservative risk limits (<= 0.5% per trade)

---

## Logs

```bash
docker compose -f docker-compose.prod.yml logs bot -f
docker compose -f docker-compose.prod.yml logs web -f
```

---

## Telegram Setup

1. Message `@BotFather` on Telegram → `/newbot`
2. Copy the token to `TELEGRAM_BOT_TOKEN`
3. Start a chat with your bot, then visit:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Copy the `chat.id` to `TELEGRAM_CHAT_ID`
5. Restart the bot service
