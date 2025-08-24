# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Install dependencies**: `pnpm i` followed by `pnpm exec playwright install`
- **Build**: `pnpm build` (uses esbuild to bundle src/index.ts to dist/)
- **Lint**: `pnpm lint` (runs both format and lint checks via biome)
- **Fix formatting/linting**: `pnpm fix` (applies automatic fixes)
- **Type check**: `pnpm typecheck` (TypeScript type checking with --noEmit)
- **Debug**: `pnpm build && npx @modelcontextprotocol/inspector node --enable-source-maps ./dist/index.js`

## Architecture Overview

This is an MCP (Model Context Protocol) server that provides Playwright code generation capabilities through browser interaction recording.

### Core Components

- **src/index.ts**: Entry point that creates and connects the MCP server via stdio transport
- **src/server.ts**: MCP server setup with two main tools:
  - `playwright_codegen_recording_start`: Launches browser for recording interactions
  - `playwright_codegen_recording_end`: Stops recording and returns generated code
- **src/core/**: Core functionality modules
  - **CodeGenerator.ts**: Orchestrates the recording workflow, manages state
  - **PlaywrightServer.ts**: Spawns and manages the Playwright server process
  - **WebSocketClient.ts**: Handles communication with Playwright via WebSocket protocol
  - **types.ts**: Protocol interfaces for request/response communication

### Data Flow

1. CodeGenerator initializes by starting a PlaywrightServer process
2. WebSocketClient connects to the server's WebSocket endpoint with debug controller
3. Recording mode is activated, capturing user interactions in the browser
4. Interactions are streamed back as "sourceChanged" events containing generated code
5. Generated code is stored and returned when recording ends

### Key Implementation Details

- Uses Playwright's `run-server` command with extension mode enabled
- WebSocket communication follows a request/response pattern with unique IDs
- Code generation uses Playwright's built-in codegen with "playwright-test" format
- Logging includes Japanese messages and uses custom logger with colored output
- Browser process management includes proper cleanup and timeout handling

## Code Style

- Uses Biome for formatting and linting with space indentation and double quotes
- TypeScript with strictest configuration (@tsconfig/strictest)
- ESM modules with bundler module resolution
- Zod schemas for runtime validation of WebSocket messages