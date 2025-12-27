# Documentation Overview

This file gives a high-level overview of the Journal project and links to detailed documentation for specific areas.

## Goal

A journal and notes app for a single user to manage personal notes from any device, with full offline support and automatic synchronization.

**Key characteristics:**
- Single-user app (no authentication or permissions)
- Notes stored as Markdown with YAML frontmatter
- Progressive Web Application (PWA) for cross-device access
- Works entirely offline; syncs when online
- Can be installed on mobile devices

## User Experience

Users interact with the app through a WYSIWYG editor that hides Markdown syntax. They see formatted text, not raw Markdown. The app supports:

- Creating, editing, and deleting journal entries
- Tagging entries for organization
- Filtering entries by tags
- Working offline with automatic sync
- Manual sync controls in Settings

## Architecture

The system has two main components:

1. **Frontend (PWA)**: Vue 3 application with local IndexedDB storage
2. **Backend (API)**: Fastify server storing entries as Markdown files

Data flows through synchronization - the frontend maintains a complete local copy of all entries and syncs changes bidirectionally with the server.

## Documentation

Detailed documentation for specific areas:

- [Technologies](technologies.md) - Core technologies: TypeScript, Vue 3, Fastify, Tiptap
- [Editing](editing.md) - WYSIWYG editor and Markdown handling
- [Frontmatter](frontmatter.md) - YAML metadata in entry files
- [Sync](sync.md) - Synchronization protocol and conflict resolution
- [Storage](storage.md) - Backend file storage and trash system
- [PWA](pwa.md) - Offline support, installation, and local storage
