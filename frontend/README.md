# Frontend - InvestWise

React.js + TypeScript frontend for InvestWise portfolio analyzer.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router v6** - Routing
- **Zustand** - State management
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **React Query** - Data fetching

## Project Structure

```
src/
├── pages/               # Page components
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── TwoFactorPage.tsx
│   ├── DashboardPage.tsx
│   └── PortfolioPage.tsx
├── components/          # Reusable components
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── TwoFactorInput.tsx
│   ├── portfolio/
│   │   ├── PortfolioCard.tsx
│   │   ├── CreatePortfolioModal.tsx
│   │   └── PortfolioSummary.tsx
│   ├── holdings/
│   │   ├── HoldingsList.tsx
│   │   ├── HoldingRow.tsx
│   │   ├── AddHoldingModal.tsx
│   │   └── AssetSearch.tsx
│   └── ProtectedRoute.tsx
├── stores/              # Zustand state stores
│   └── authStore.ts
├── services/            # API & utilities
│   └── api.ts
├── styles/              # Global styles
│   └── index.css
├── App.tsx             # Main router
└── main.tsx            # Entry point
```

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=InvestWise
VITE_ENVIRONMENT=development
```

## Features

- ✅ User authentication (login/register)
- ✅ 2FA verification with authenticator apps
- ✅ Portfolio CRUD operations
- ✅ Holdings management
- ✅ Asset search with autocomplete
- ✅ Portfolio summary and analytics
- ✅ Protected routes with auth
- ✅ Responsive design with Tailwind CSS

## API Integration

The frontend uses Axios with automatic token management:
- Access token stored in localStorage
- Automatic token refresh on 401
- Request/response logging
- Error handling with fallbacks

## State Management

Using Zustand for authentication state:
- `authStore` - User auth, tokens, 2FA status
- Persisted to localStorage
- Simple API: `useAuth()`, `useIsAuthenticated()`, `useUser()`

## Styling

Tailwind CSS with custom utilities:
- `.btn-primary`, `.btn-secondary`, `.btn-danger` - Button styles
- `.input-field` - Input styles
- `.card`, `.card-hover` - Card styles  
- `.spinner` - Loading indicator

## Next Steps

- Connect to backend API
- Implement asset search API integration (Yahoo Finance)
- Add WebSocket for real-time updates
- Implement analysis feature
- Add more charts and visualizations
