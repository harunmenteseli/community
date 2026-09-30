import '@fontsource-variable/inter';
import './styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as JotaiProvider } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { router } from './routes/router';
import { bootstrapAuth, store } from './state/bootstrap';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* bootstrapAuth() bu store'a yaziyor; Provider olmadan oturum geri yukleme bilesenlere ulasmaz. */}
      <JotaiProvider store={store}>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors closeButton />
      </JotaiProvider>
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  void bootstrapAuth().finally(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}