import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './contexts/ThemeContext'
import { router } from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000,
    },
  },
})

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element')

createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </QueryClientProvider>,
)
