# Guidance for Coding Agent

## Project Overview
- This is an Ionic Vue app.
- All main pages are under `src/views/`.
- Components live under `src/components/`.
- Routing is handled in `src/router/index.js`.

## Coding Conventions
- Use Vue 3 Composition API.
- Write components in `.vue` single-file format.
- Follow Prettier code style (run `npm run lint --fix`).

## How to Add Features
- For new pages, create a folder in `src/views/`.
- Register new routes in `src/router/index.js`.
- Add navigation links in `src/components/SideMenu.vue`.

## Branch & PR Process
- Create a new branch for each feature or fix.
- Use branch naming: `feature/<short-description>` or `fix/<short-description>`.
- Open a PR to `main` with a clear description of changes.
- Link relevant issues (if any).

## Setup & Testing
- Always run `npm install` before any other command.
- Lint code with `npm run lint`.

## Test Users for Automated Testing

- Use the following environment variables to specify test users for authentication and chat tests:
  - `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`: The primary test user (sender).
  - `TEST_RECIPIENT_EMAIL` / `TEST_RECIPIENT_PASSWORD`: The recipient test user.
- Always use these credentials when writing tests or automated scripts involving chat flows (sending, receiving, querying chat history).
- Do **not** hardcode these credentials; always read from environment variables.
- Example usage:

  ```js
  const senderEmail = process.env.TEST_USER_EMAIL;
  const senderPassword = process.env.TEST_USER_PASSWORD;
  const recipientEmail = process.env.TEST_RECIPIENT_EMAIL;
  const recipientPassword = process.env.TEST_RECIPIENT_PASSWORD;
  // Use these for chat tests: sender sends, recipient receives
