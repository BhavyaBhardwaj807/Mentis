import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import Workspace from './pages/Workspace';
import Auth from './components/Auth';
import './index.css';

function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Initializing Neural Hub...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth isOpen={true} onAuthSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="app-container">
      {view === 'landing' ? (
        <LandingPage onEnter={() => setView('workspace')} />
      ) : (
        <Workspace onBack={() => setView('landing')} user={user} />
      )}
    </div>
  );
}

export default App;
