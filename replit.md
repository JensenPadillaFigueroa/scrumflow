# ProjectFlow

## Overview

ProjectFlow is a modern full-stack project management application built with React, Express, and TypeScript. It features a clean, responsive interface for managing projects, tasks, and wishlist items through multiple views including a dashboard, project management, wishlist management, and a Kanban board for task organization.

The application follows a monorepo structure with separate client and server directories, shared schemas, and uses modern development tools like Vite for building, Drizzle ORM for database management, and shadcn/ui for UI components.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development and building
- **Routing**: Uses Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **UI Components**: Extensive use of Radix UI primitives through shadcn/ui for accessibility
- **Form Handling**: React Hook Form with Zod validation for type-safe forms

### Backend Architecture
- **Server**: Express.js with TypeScript for REST API endpoints
- **Database Layer**: Drizzle ORM configured for PostgreSQL with Neon Database
- **Storage Pattern**: Abstract storage interface with in-memory implementation for development
- **Validation**: Shared Zod schemas between client and server for type safety
- **Development Server**: Vite integration for hot module replacement in development

### Data Models
The application manages three core entities:
- **Projects**: Main organizational units with name, description, and category
- **Tasks**: Work items linked to projects with status tracking (todo, in-process, finished)
- **Wishlist Items**: Ideas that can be promoted to full projects

### API Design
RESTful API structure with endpoints for:
- CRUD operations for projects, tasks, and wishlist items
- Project-specific task filtering
- Wishlist item promotion to projects
- Consistent error handling and validation

### Development Workflow
- **Build Process**: Separate client (Vite) and server (esbuild) build pipelines
- **Development Mode**: Integrated Vite dev server with Express for seamless development
- **Database Management**: Drizzle Kit for schema migrations and database operations
- **Type Safety**: Shared TypeScript types between client, server, and database layers

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: TypeScript ORM for database operations
- **drizzle-kit**: Database schema management and migrations
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for managing component variants
- **lucide-react**: Icon library

### Form and Validation
- **react-hook-form**: Performant form library
- **@hookform/resolvers**: Form validation resolvers
- **zod**: TypeScript-first schema validation
- **drizzle-zod**: Integration between Drizzle and Zod

### Development Tools
- **vite**: Fast development server and build tool
- **@vitejs/plugin-react**: React support for Vite
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-***: Replit-specific development enhancements