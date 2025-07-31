# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Elite Dangerous themed chat application called "GALNET Intelligence" built with Next.js 15, React 19, TypeScript, and Tailwind CSS. The app simulates a futuristic command interface for interacting with a GALNET (Elite Dangerous universe news network) AI agent.

## Development Commands

- **Development server**: `pnpm dev` or `npm run dev`
- **Production build**: `pnpm build` or `npm run build`
- **Start production server**: `pnpm start` or `npm run start`
- **Linting**: `pnpm lint` or `npm run lint`

**Package manager**: This project uses pnpm (v10.11.1+) as specified in package.json

## Architecture

### Core Structure
- **App Router**: Uses Next.js 15 App Router with `app/` directory structure
- **Main page**: `app/page.tsx` contains the complete chat interface component
- **Layout**: `app/layout.tsx` provides the root layout with metadata
- **Components**: Uses shadcn/ui component library with custom theme

### Key Features
- Real-time chat interface with message history
- Elite Dangerous themed UI with orange/amber color scheme
- Real-time AI responses from Galnet agent API
- Markdown rendering for agent responses with custom styling
- Custom link components with external link indicators
- Responsive design with grid background effects
- About modal component

### UI Framework
- **Styling**: Tailwind CSS with custom Elite Dangerous theme
- **Components**: shadcn/ui component library (extensive set in `components/ui/`)
- **Markdown**: ReactMarkdown with remark-gfm for rich content rendering
- **Typography**: @tailwindcss/typography for prose classes
- **Icons**: Lucide React icons
- **Fonts**: Inter font from Google Fonts

### State Management
- Uses React hooks (useState, useRef, useEffect) for local state
- Manages conversation state with API integration
- Error handling with visual feedback in UI

### Build Configuration
- TypeScript with strict mode enabled
- ESLint and TypeScript errors ignored during builds (configured for v0.dev compatibility)
- Image optimization disabled for static export compatibility

## API Integration

### Galnet Agent API
- **Service file**: `lib/galnet-api.ts` contains API integration functions
- **Endpoints**: Uses `/v2/agent/start-chat` and `/v2/agent/continue-chat`
- **Configuration**: Set `NEXT_PUBLIC_API_BASE_URL` environment variable
- **Error handling**: Includes retry logic for expired conversations
- **Response format**: Supports ReAct format responses, extracts Final Answer

### Environment Variables
- `NEXT_PUBLIC_API_BASE_URL`: Base URL for the Galnet API service
- See `.env.example` for configuration template

## Development Notes

- The project is synced with v0.dev and deploys to Vercel
- Path aliases configured: `@/*` maps to project root
- Dark mode enabled by default in layout
- Custom CSS variables defined for theming
- Real-time error states shown in header status indicator