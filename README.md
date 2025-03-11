# Voice Gateway Project

## Project Overview

This is a specialized web application designed for collecting and managing voice datasets to improve Automatic Speech Recognition (ASR) systems. The platform provides:

- Efficient voice data collection interface
- Support for multiple languages and accents
- Quality control mechanisms for audio recordings
- Dataset management and organization tools
- Real-time audio processing and validation
- Secure data storage and handling

Built with modern web technologies, this gateway serves as a crucial tool for enhancing ASR accuracy through systematic voice data collection.

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (based on Radix UI)
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router DOM
- **Date Handling**: date-fns
- **Charts**: Recharts
- **Notifications**: Sonner, React Hot Toast
- **Development Tools**:
  - TypeScript
  - ESLint
  - SWC (for fast compilation)
  - PostCSS
  - Tailwind Typography

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm or bun package manager
- Git

## Getting Started

1. **Clone the repository**
   ```sh
   git clone https://github.com/gelogrammer/voice-gateway.git
   cd voice-gateway
   ```

2. **Install dependencies**
   ```sh
   npm install
   # or if using bun
   bun install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env` (if it exists)
   - Configure your Supabase credentials and other environment variables

4. **Start Development Server**
   ```sh
   npm run dev
   # or
   bun dev
   ```

   The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint checks

## Project Structure

```
├── src/              # Source code
├── supabase/         # Supabase configurations and migrations
├── public/           # Static assets
├── components.json   # shadcn/ui components configuration
└── ...config files   # Various configuration files
```

## Development Options

### 1. Local Development
Clone and work with your preferred IDE. Changes can be pushed directly to the repository.

### 2. GitHub Codespaces
Launch a development environment directly in your browser:
1. Go to repository
2. Click "Code" > "Codespaces"
3. Click "New codespace"

### 3. Direct GitHub Editing
Edit files directly through GitHub's web interface for quick changes.

## Deployment

### Netlify Deployment
To deploy this project on Netlify:
1. Connect your repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Set up your custom domain in Netlify settings (optional)

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request
4. Ensure all checks pass

## Support

For support and questions, please open an issue in the repository.
