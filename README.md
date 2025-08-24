# d-kimuson/playwright-codegen-mcp

An MCP (Model Context Protocol) server implementation that provides [Playwright](https://github.com/microsoft/playwright) codegen results to LLMs.

## Overview

Playwright codegen is useful for creating E2E tests from browser interactions, but since it generates code mechanically, it cannot be used as-is and requires engineers to adjust it to fit project structure, add proper waiting logic, etc.

By using this MCP server, LLM agents can automatically perform the following tasks based on mechanically generated test code:

- Adjust code to fit project structure
- Implement proper waiting logic
- Add assertion handling
- Create Playwright-based E2E tests without engineer intervention

## Usage

```json
{
  "mcpServers": {
    "playwright-codegen": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "github:d-kimuson/playwright-codegen-mcp"
      ],
      "env": {}
    }
  }
}
```

## Available Tools

### `playwright_codegen_recording_start`

Launches a browser and starts recording user interactions.

### `playwright_codegen_recording_end`

Ends the recording session and returns the generated Playwright code from user interactions.

```yaml
# Example response
fullCode: |
  import { test, expect } from '@playwright/test';
  
  test('test', async ({ page }) => {
    await page.goto('https://example.com/');
    await page.click('text=Click me');
    // ...
  });
note: |
  Recording completed and browser closed.
  
  Note: The following code has been mechanically generated based on the user's interactions.
  It may require manual adjustments to fit your project's test structure, naming conventions,
  and coding standards before use.
```

## Development

### Setup

```bash
pnpm i
pnpm exec playwright install
```

### Build

```bash
pnpm build
```

### Debug

```bash
pnpm build && npx @modelcontextprotocol/inspector node --enable-source-maps ./dist/index.js
```

## License

MIT
