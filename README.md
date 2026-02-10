# Bolton Telegram Bot

AI-first Telegram bot for NEAR Intents flows with approval-gated actions in chat.
Bolton is a trading assistant: it reads balances/market context, prepares actions, and executes only after explicit user approval in Telegram.

## Requirements

- Node.js 20+
- pnpm 9+
- A Telegram bot token from BotFather
- A funded NEAR keypair for bot wallet operations

## Install

```bash
pnpm install
```

## Environment Variables

The bot reads env from `.env` (via `dotenv/config`).

### Required (always)

- `BOT_TOKEN`
  - Telegram bot token.
- `WALLET_PRIVATE_KEY`
  - NEAR ed25519 private key string (`ed25519:...`).
- One allowlist setting is required:
  - `TELEGRAM_USER_ID` (single user), or
  - `TELEGRAM_USER_IDS` (comma-separated users)
- `AI_PROVIDER` = one of:
  - `openai`
  - `anthropic`
  - `google`
  - `xai`
  - `near`
- Model selection (at least one is required):
  - Generic: `AI_MODEL`
  - Provider-specific (preferred):
    - `AI_OPENAI_MODEL`
    - `AI_ANTHROPIC_MODEL`
    - `AI_GOOGLE_MODEL`
    - `AI_XAI_MODEL`
    - `AI_NEAR_MODEL`
- Provider API key for the selected `AI_PROVIDER`:
  - `OPENAI_API_KEY` for `openai`
  - `ANTHROPIC_API_KEY` for `anthropic`
  - `GEMINI_API_KEY` for `google`
  - `XAI_API_KEY` for `xai`
  - `NEAR_AI_KEY` for `near`

### Optional (core bot)

- `DEFUSE_JWT_TOKEN`
  - Optional auth token for OneClick API client configuration.
  - If not set, SDK runs without explicit token injection.

## `.env` Example (AI Required)

```env
BOT_TOKEN=...
WALLET_PRIVATE_KEY=ed25519:...
TELEGRAM_USER_IDS=123456789,987654321
DEFUSE_JWT_TOKEN=...

AI_PROVIDER=openai
AI_OPENAI_MODEL=gpt-5-mini
OPENAI_API_KEY=...
```

## Run

### Development

```bash
pnpm dev
```

### Typecheck

```bash
pnpm typecheck
```

### Build

```bash
pnpm build
```

### Start (Production)

```bash
pnpm build && pnpm start
```

`pnpm start` runs `node dist/bot.mjs`.

## Commands

Bolton exposes these slash commands:

- `/start` - welcome and quickstart guide
- `/new` - start a new chat and clear AI conversation context
- `/balances` - show wallet balances
- `/help` - show command help

All other actions should be requested in natural language (for example: "swap 10 USDC to ETH").

## Best Practices (Recommended for your setup)

- Use `TELEGRAM_USER_IDS` instead of a public bot to keep access restricted.
- Use provider-specific model env var (for clarity) instead of only `AI_MODEL`.
- Keep one dedicated wallet key per environment (dev/stage/prod).
- Rotate secrets if they were ever committed or shared.

## Notes

- Action tools (swap/withdraw/transfer/DCA create/stop) require user approval in chat.
- View tools (balances/tokens/deposit address/DCA list) execute directly.
