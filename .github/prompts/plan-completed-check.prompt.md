---
agent: agent
description: Check that a plan was implemented in full.
argument-hint: Tag the plan.md file to work from.
tools: ['execute/testFailure', 'execute/getTerminalOutput', 'execute/runInTerminal', 'execute/runTests', 'read/problems', 'read/readFile', 'edit/createDirectory', 'edit/createFile', 'edit/editFiles', 'search', 'web', 'agent', 'playwright-mcp-local/*', 'todo']
---
Your goal is to check that the plan outlined in ${file} has been fully and correctly implemented to a high standard.

Review the code itself to check that it does what was planned.

Look for opportunities to improve the code quality. Remove comments that don't add any value. Refactor any code that is duplicated.

If available, make use of the Playwright MCP server to interact with the application to confirm functionality and test the features that were meant to be implemented as part of the plan.

Consider making small additions or updates to the `./AGENTS.md` file to help future agents understand the project better. Remember the `AGENTS.md` file is not intended to repeat information already available from reiewing the code itself or other documentation, but it can include links to relevant files or sections of the codebase.
