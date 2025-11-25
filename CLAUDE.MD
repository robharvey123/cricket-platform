# Cricket Platform - Turborepo Monorepo

This is a Turborepo-based monorepo for the Cricket Platform project.

## Project Overview

This repository uses Turborepo to manage a monorepo containing multiple Next.js applications and shared packages.

### Project Structure

```
cricket-platform/
├── apps/
│   ├── docs/          # Next.js documentation app
│   └── web/           # Next.js web application
├── packages/
│   ├── ui/            # Shared React component library
│   ├── eslint-config/ # Shared ESLint configurations
│   └── typescript-config/ # Shared TypeScript configurations
├── package.json       # Root package.json with workspace configuration
└── turbo.json         # Turborepo configuration
```

## Technology Stack

- **Build System**: Turborepo v2.5.6
- **Framework**: Next.js
- **Language**: TypeScript 5.9.2
- **Package Manager**: npm 10.9.3
- **Node Version**: >=18
- **Code Quality**: ESLint, Prettier

## Available Scripts

Run these commands from the root directory:

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps and packages
- `npm run lint` - Lint all apps and packages
- `npm run format` - Format code with Prettier
- `npm run check-types` - Type-check all apps and packages

## Development Workflow

### Running Specific Apps

Use Turborepo filters to run commands for specific packages:

```bash
# Run dev server for web app only
npx turbo dev --filter=web

# Build docs app only
npx turbo build --filter=docs
```

### Adding Dependencies

For workspace packages:
```bash
# Add to specific workspace
npm install <package> --workspace=apps/web

# Add to root
npm install <package> -w
```

## Turborepo Configuration

The `turbo.json` file defines the following tasks:

- **build**: Builds apps with dependency awareness, outputs to `.next/` (excluding cache)
- **lint**: Runs linting with dependency awareness
- **check-types**: Type-checks all packages
- **dev**: Development mode (no caching, persistent)

## Workspaces

This monorepo uses npm workspaces with the following pattern:
- `apps/*` - Application packages
- `packages/*` - Shared library packages

## Notes for Claude Code

### Architecture Patterns
- This is a monorepo managed by Turborepo
- Shared code lives in `packages/` and is consumed by apps in `apps/`
- All packages use TypeScript
- Dependencies between packages are managed through workspace references

### Common Tasks
- When adding new features, consider if code should be shared (add to packages) or app-specific (keep in apps)
- Always run type-checking and linting before committing
- Use Turborepo filters when working on specific packages to improve performance

### Build System
- Turborepo handles incremental builds and caching
- Tasks run in topological order based on dependencies
- Remote caching can be enabled via Vercel for team collaboration
