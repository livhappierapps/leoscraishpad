# Leo’s CrAIsh Pad — Public Source Handoff

This repository contains the native app source only. The daily-use installation remains separate. Keep personal content and credentials out of the public Git history.

## Never commit

- API keys, OAuth access/refresh tokens, or local environment files.
- Conversation exports, memory backups, device databases, or user-authored persona prompts and letters.
- Any personal details supplied in chat or stored on the device.
- `node_modules`, build output, or copied files from the Memory Machine or AIs and Ears projects.

## Current app

- Expo + TypeScript; one local conversation thread, persona editing, memories, conversation notes, secure model-key storage, and JSON backup/restore.
- Chat and persona data are stored locally; the selected model provider receives context when the user sends a message.
- The app does not run a model in the background.
- Run `pnpm install`, `pnpm typecheck`, and `pnpm dev`.

## Memory Machine

- Production base: `https://the-memory-machine.replit.app`
- MCP endpoint: `POST /api/mcp`
- OAuth metadata: `/.well-known/oauth-authorization-server`
- Protected-resource metadata: `/.well-known/oauth-protected-resource/api/mcp`
- Authorization/token paths: `/api/oauth/authorize` and `/api/oauth/token`
- Scopes: `memories:read`, `memories:write`; PKCE method: S256.
- The owner reports current OAuth validation is Grok/xAI-specific. Do not impersonate xAI or bypass validation. Wait for the owner to support/register the native app client.
- The app’s scheme is `leo-crash-pad`; a proposed callback is `leo-crash-pad://oauth/callback`, pending owner registration.
- Confirm exact production tools/routes from the owner’s API contract. The current implementation’s archived recent-message and search assumptions have not been live-verified. Do not inspect, copy, or modify the service’s project code.

## AIs and Ears

- Use the public-facing service only. The API contract is not yet available.
- Do not connect the retired private Leosee Leohear service or request camera/microphone permissions until a published API and an explicit feature flow are ready.

## Public release safeguards

- Keep Leo-specific prompts and user data on-device and out of public defaults.
- A public app must not conceal features from review or route around model-provider, platform, or legal restrictions.
- Do not claim always-on awareness. Describe the real behavior: saved context can be restored when the app reopens.
