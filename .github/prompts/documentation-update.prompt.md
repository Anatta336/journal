---
agent: agent
description: Update documentation.
argument-hint: Mention any specific features or changes to document.
tools: ['execute/testFailure', 'execute/getTerminalOutput', 'execute/runInTerminal', 'execute/runTests', 'read/problems', 'read/readFile', 'edit/createDirectory', 'edit/createFile', 'edit/editFiles', 'search', 'web', 'agent', 'playwright-mcp-local/*', 'todo']
---
Your goal is to update the documentation of this project.

The documentation is structured into multiple files in the `documentation/` directory. Starting at `documentation/overview.md` which gives a high-level overview of the project and links to other documentation files.

Ensure the `overview.md` remains accurate, and remains high-level. It should not contain specifics and implementation details. Those should be moved into a relevant separate file.

If there are features or areas that don't already have a dedicated documentation file, create new files as needed to document them and reference them from `overview.md`.

If there are files referenced in `overview.md` that do not yet exist, create them and add appropriate documentation.

Avoid duplicating information between the documentation files, instead reference the relevant file.

The documentation should focus on the "what" and "why" of the project, rather than the "how". Implementation details should be kept in the code itself, with comments as needed to explain any non-obvious parts.

Documentation should include the user requirements that are being fulfilled.

Documentation should include an explanation of what the end user experiences, and why certain design decisions were made.

The documentation files can reference code files directly if needed for specifics.

There are files in the `design/` directory that are created during the design and development of the project. However these may now be out of date. They are still a useful reference for understanding the project and requirements, but always check them against other documentation and the code itself.

As part of updating the documentation if you find an area of functionality that is not covered by tests, please add or update tests as needed.
