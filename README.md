# GALNET Intelligence

A futuristic Elite Dangerous themed chat application built with Next.js 15, React 19, and TypeScript. Experience real-time AI interactions in an immersive command interface inspired by the Elite Dangerous universe.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/salim-laimeches-projects/v0-elite-dangerous-chat-app)

## 🚀 Features

- **Real-time Chat Interface**: Seamless conversation flow with AI agent responses
- **Elite Dangerous Theme**: Authentic futuristic UI with orange/amber color scheme
- **Markdown Support**: Rich text formatting with GitHub Flavored Markdown
- **Responsive Design**: Optimized for all device sizes with grid background effects
- **External Link Indicators**: Clear visual cues for external links
- **Error Handling**: Visual feedback and retry mechanisms
- **About Modal**: Detailed application information

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom Elite Dangerous theme
- **UI Components**: shadcn/ui component library
- **Icons**: Lucide React
- **Markdown**: ReactMarkdown with remark-gfm
- **Typography**: @tailwindcss/typography
- **Package Manager**: pnpm (v10.11.1+)

## 📋 Prerequisites

- Node.js 18+ (recommended: Node.js 20+)
- pnpm 10.11.1+ (specified in package.json)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd galnet-ai
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Configure your environment variables:
   - `NEXT_PUBLIC_API_BASE_URL`: Base URL for the Galnet API service

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 🏗️ Project Structure

```
galnet-ai/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   └── page.tsx           # Main chat interface component
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   └── galnet-api.ts      # API integration functions
├── public/                # Static assets
├── CLAUDE.md             # Development guidelines
└── package.json          # Dependencies and scripts
```

## 🔌 API Integration

The application integrates with the Galnet Agent API:

- **Endpoints**: 
  - `/v2/agent/start-chat` - Initialize new conversation
  - `/v2/agent/continue-chat` - Continue existing conversation
- **Features**: 
  - ReAct format response support
  - Automatic retry logic for expired conversations
  - Error handling with visual feedback

## 🎨 Theming

The application uses a custom Elite Dangerous inspired theme with:
- Orange/amber accent colors (#f97316, #fb923c)
- Dark mode by default
- Custom CSS variables for consistent theming
- Grid background effects for futuristic aesthetics

## 🌐 Deployment

This project is configured for deployment on Vercel and automatically syncs with v0.dev:

1. **Vercel Deployment**: Automatically deploys from the main branch
2. **v0.dev Integration**: Changes made in v0.dev are pushed to this repository
3. **Build Configuration**: Optimized for static export compatibility

## 🤝 Development

- **Code Style**: Follow existing patterns and conventions
- **TypeScript**: Strict mode enabled with comprehensive type checking  
- **Path Aliases**: `@/*` maps to project root
- **Error Handling**: ESLint and TypeScript errors ignored during builds (v0.dev compatibility)

## 📄 License

This project is private and not open for public contribution.

## 🔗 Links

- **Live Demo**: [Vercel Deployment](https://vercel.com/salim-laimeches-projects/v0-elite-dangerous-chat-app)
- **v0.dev Project**: [Continue Building](https://v0.dev/chat/projects/OU2YSkiVe2P)
