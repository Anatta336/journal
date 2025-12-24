---
agent: agent
description: Implement a development plan.
argument-hint: Tag the plan.md file to work from.
tools: ['execute/testFailure', 'execute/getTerminalOutput', 'execute/runInTerminal', 'execute/runTests', 'read/problems', 'read/readFile', 'edit/createDirectory', 'edit/createFile', 'edit/editFiles', 'search', 'web', 'agent', 'playwright-mcp-local/*', 'todo']
---
Carefully review ${file} which should contain a full plan to implement functionality for this project. Your goal is to follow the plan's instructions while also following best practice and maintaining code quality.

The plan should give you enough information, but if you need more context use a sub-agent to review other files in ${fileDirname} especially `requirements.md` which should specify the functionality needed which this plan is implementing.

As you implement the plan, ensure that you create or update automated tests as specified in the plan to verify that each part of the implementation is correct. Use the testing tools available to you to run these tests frequently during development.

Only move on to the next part of the plan once you are completely satisfied that the current part is complete and you have reliable evidence it is working as intended.

If available, make use of the Playwright MCP server to interact with the application as you work to confirm functionality and test your changes.

Support your work with automated testing using Vitest for unit tests and Playwright for end-to-end tests. Ensure that all new code is covered by appropriate tests and that existing tests continue to pass.
