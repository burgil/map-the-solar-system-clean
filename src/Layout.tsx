import { Outlet, useLocation } from 'react-router';
import { type FC, Suspense, useEffect } from 'react';
import InitialLoadingScreen from './components/InitialLoadingScreen';

const Layout: FC = () => {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const content = (
    <>
      <main data-beasties-container className="min-h-screen bg-black selection:bg-blue-500/30 selection:text-blue-200 font-sans text-white">
        <Outlet />
      </main>
    </>
  );

  return (
    <Suspense fallback={<InitialLoadingScreen />}>
      {content}
    </Suspense>
  );
};

export default Layout;
