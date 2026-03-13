import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import Workspace from './pages/Workspace';
import ProgressPage from './pages/ProgressPage';
import Auth from './components/Auth';
import { createInitialLearningProgress } from './lib/learningPath';
import './index.css';

const PROGRESS_STORAGE_KEY = 'mentis_learning_progress_v1';

const loadStoredProgress = () => {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return createInitialLearningProgress();
    return { ...createInitialLearningProgress(), ...JSON.parse(raw) };
  } catch {
    return createInitialLearningProgress();
  }
};

function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learningProgress, setLearningProgress] = useState(loadStoredProgress);
  const [selectedPathChallenge, setSelectedPathChallenge] = useState(null);

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

  useEffect(() => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(learningProgress));
  }, [learningProgress]);

  const handleSelectChallengeFromProgress = (selection) => {
    setSelectedPathChallenge(selection);
    setView('workspace');
  };

  const handleChallengeCompleted = (levelKey, topicKey) => {
    if (!levelKey || !topicKey) return;
    setLearningProgress((prev) => ({
      ...prev,
      [levelKey]: {
        ...(prev[levelKey] || {}),
        [topicKey]: true
      }
    }));
  };

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
      ) : view === 'progress' ? (
        <ProgressPage
          progress={learningProgress}
          onBack={() => setView('workspace')}
          onSelectChallenge={handleSelectChallengeFromProgress}
        />
      ) : (
        <Workspace
          onBack={() => setView('landing')}
          onOpenProgress={() => setView('progress')}
          user={user}
          selectedPathChallenge={selectedPathChallenge}
          onChallengeCompleted={handleChallengeCompleted}
        />
      )}
    </div>
  );
}

export default App;
