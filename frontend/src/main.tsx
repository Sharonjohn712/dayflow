import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, SignIn, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { setTokenGetter } from './lib/api'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30 s before refetch
      retry: 1,
    },
  },
})

// Bridge Clerk token into the API client.
// This component lives inside ClerkProvider so useAuth() is available.
function TokenBridge() {
  const { getToken } = useAuth()
  // Inject once — getToken is stable
  React.useEffect(() => {
    setTokenGetter(() => getToken())
  }, [getToken])
  return null
}

function AuthGate() {
  return (
    <>
      <SignedOut>
        {/* Centered sign-in card */}
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <div className="text-center">
            <div className="font-serif text-4xl font-semibold text-text1 mb-2">☀️ Dayflow</div>
            <p className="text-text2 mb-8 text-sm">Your AI-powered daily planning companion</p>
            <SignIn routing="hash" afterSignInUrl="/" />
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <TokenBridge />
        <App />
      </SignedIn>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>
)
