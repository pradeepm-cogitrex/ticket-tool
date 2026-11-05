import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/app-routes';
import { AuthProvider } from './modules/auth/auth-context';
import { ThemeProvider } from './shared/context/theme-context';
import { ToastProvider } from './shared/context/toast-context';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
