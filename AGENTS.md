# Journal

## AGENTS.md

Always keep this `AGENTS.md` file up to date with changes. This file should only contain "big picture" information, with references to files where more specific information is available. Do not put information in `AGENTS.md` that is also available in the code itself, instead give a reference to the file(s) where the information can be found.

When you make any change to the project you should finish by reviewing `AGENTS.md` and referenced files. Make any changes needed to keep them up to date and accurate.

## Project Overview

This will be a journal app, used by a single user to manage journal entries in the form of Markdown.

**Core Technologies:**

- **Language:** TypeScript.
- **Frontend:** Vue 3 using TypeScript. No external styling dependencies.
- **Build:** Vite

## Development Guidelines

- **Run Dev:** `npm run dev` Starts Vite server with site available at <http://localhost:5173/> this may already be running.
- **Build:** `npm run build` Compiles to `dist/`

When possible use the Playwright MCP server to access the site so you can interact with it and test your changes.

Only use comments if they add meaningful information - if a comment repeats what is already apparent from the code itself, remove the comment. Make the code's meaning clear by using descriptive function and variable names.

### Styling

We are targeting the latest version of Chrome, and should leverage up to date CSS practices.

Avoid creating a global CSS file, instead define CSS as it's needed in Vue components.

Make use of CSS variables to standardise colours, spacing, fonts, etc.

Avoid using media queries unless absolutely necessary, instead prefer flexible layouts (e.g. flexbox, grid) that adapt naturally to different screen sizes. You can use container queries when useful.

### Vue

Make use of components to separate out functionality and keep things as clear as possible.

Always use the `<script setup>` syntax for Vue components with the composition API.

Always used `<style scoped>`.
