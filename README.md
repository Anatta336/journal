# Journal

## Playwright for AI Agents
AI Agents will do best if they can access a browser to test with. This project is configured to work with Playwright's MCP server via a bridge extension for Chromium.

### Start Playwright controlled browser
```bash
npx @playwright/mcp --extension
```

That should open a Chromium window.

### Install Playwright MCP Bridge extension
If Chromium doesn't already have the Playwright MCP Bridge extension you'll need to install it:
- https://github.com/microsoft/playwright-mcp/releases/
- Download latest extension build in a `.zip` file.
- Extract that somewhere.
- In the Chromium window, go to `chrome://extensions/`
- Enable "Developer mode" (top right)
- Click "Load unpacked"
- Select the extracted extension folder.

### Check extension token
- Click the Playwright MCP Bridge extension icon in the toolbar of Chromium (may be hidden within the puzzle piece icon).
- Copy `PLAYWRIGHT_MCP_EXTENSION_TOKEN` value.
- Note that the refresh icon will generate a new token and invalidate the previous one, so only used that if needed.

### Start MCP server (VS Code)
- Open `.vscode/mcp.json`
- Set the `PLAYWRIGHT_MCP_EXTENSION_TOKEN` value to match the one from the extension.
- Click the "Start" option that should appear just above the "playwright-mcp-local" name.
- The MCP server should start, and discover a number of tools (at time of writing, 22.)
- If there's problems, under "More..." select "Show Output" to see logs.
