import { UserProvider } from '../src/UserContext';
import { AuthProvider, useAuth } from "../context/authContext";
import { usePageLogger } from "../context/usePageLogger";
import "../src/app/styles/user.scss";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isLoginPage = router.pathname === "/login"; // exclude login page

  const AppContent = (
    <PageLoggerWrapper>
      <Component {...pageProps} />
    </PageLoggerWrapper>
  );

  return (
    <UserProvider>
      <AuthProvider>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Forum&family=Mukta:wght@200;300;400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
          <meta name="description" content="UJustBe" />
          <title>UJustBe Unniverse</title>
        </Head>

        {isLoginPage ? AppContent : <ProtectedRoute>{AppContent}</ProtectedRoute>}
      </AuthProvider>
    </UserProvider>
  );
}

export default MyApp;

// ================================
// Global Page Logger Wrapper
const PageLoggerWrapper = ({ children }) => {
  usePageLogger(); // Tracks every page visit and duration globally
  return children;
};

// ================================
// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login"); // redirect to login immediately after logout
    }
  }, [loading, user]);

  // Show loader while checking auth
  if (loading)
    return (
      <div className="loader">
        <span className="loader2"></span>
      </div>
    );

  // If user is not logged in, render nothing (redirect will happen)
  if (!user) return null;

  return children;
};
