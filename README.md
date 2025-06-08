# Vibe App

## Migration to /chats Structure

Older versions stored all messages in a root `messages` collection with `chatId`, `from`, and `to` fields. The app now uses a `chats` collection where each document lists the two participants and contains a `messages` subcollection. Each chat document ID is the two participant UIDs sorted and joined with an underscore (e.g. `uidA_uidB`).

To migrate existing messages:

1. For each document in `messages`, create a chat document in `/chats/{chatId}` where `chatId` is `[from, to].sort().join('_')` with:
   - `participants: [from, to]`
   - `createdAt: original message timestamp`
2. Move the message document into `/chats/{chatId}/messages/{messageId}` and remove the `chatId` and `to` fields.
3. After verifying data, delete the old `messages` collection.

A simple Node script can be written using the Firebase Admin SDK to automate this.
