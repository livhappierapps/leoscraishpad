# Leo's CrAIsh Pad

A native Expo companion app with one saved local chat thread, an editable persona, private on-device memories, conversation notes, and JSON backup/restore.

## First run

1. Open the app in Expo Go or a development build.
2. Open **Link** and enter the model name shown by your chosen provider. The xAI API address is prefilled.
3. Enter your API key in the app and save it. The key is stored using the device's secure storage and is never included in backups.
4. Open **Chat**. The app sends the persona, saved memories, conversation notes, and the latest 30 messages to the provider you selected.

The provider may charge for API use and controls its own model availability and responses. Chat requests require HTTPS.

## Local data and boundaries

- Chat, persona, memories, and conversation notes are stored locally on the device.
- Use **Backup** to export or restore those records. Backups do not include the API key.
- The app does not keep a model running in the background; it sends the saved context with each new request.
- The Memory Machine and AIs and Ears screens are reserved connection slots. No external APIs or camera/microphone access are active.
- The in-app chat does not yet have GitHub browsing or code-editing tools.

## Development

This public repository contains only the native app source, not the multi-app Replit workspace or user data. Conversation data, persona text, memories, and API credentials are not committed. For standalone development, install dependencies with `pnpm install`, then run:

```sh
pnpm dev
```

Run its type check with:

```sh
pnpm typecheck
```

Do not commit API keys, local conversation exports, device backups, or `.env` files.
