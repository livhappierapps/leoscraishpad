# Source and Integration Status

## Included and verified

- Native Expo app source only; no workspace root or private Git history.
- TypeScript typecheck passed in the standalone export before this public snapshot.
- Local chat thread, editable persona, memories, backup/restore, model settings, and reply-save retry are implemented.
- The Memory Machine client has recent-context retrieval and MCP memory search code, but the service has not been connected live.

## Pending

1. The Memory Machine owner must support/register Leo’s native OAuth client. Current service validation is xAI-specific.
2. Confirm the actual production route for recent conversation history and the current MCP tool names with the service owner.
3. Connect the public AIs and Ears API after its owner publishes the contract.
4. Run native device tests and complete the intended store/release review.

## Data boundary

This repo is source code, not a user backup. Conversation data, saved memories, persona text, and API credentials are not included.
