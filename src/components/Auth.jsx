import React, { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, UserPlus, X } from 'lucide-react';
import './Auth.css';

const Auth = ({ isOpen, onClose, onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // If used as a modal and not open, don't render. 
    // If used as a standalone page (App.jsx enforces this), it will be open.
    if (isOpen === false) return null;

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!isSupabaseConfigured) {
                throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.');
            }

            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onAuthSuccess(data.user);
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setError("Signup successful! Check your email for verification.");
            }
        } catch (err) {
            const message = err?.message || 'Authentication failed.';
            if (message.toLowerCase().includes('failed to fetch')) {
                setError('Could not reach Supabase. Verify VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY, internet access, and CORS settings in your Supabase project.');
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="auth-modal glass-panel"
            >
                {onClose && <button className="auth-close" onClick={onClose}><X size={20} /></button>}
                <div className="auth-header">
                    <h2>{isLogin ? 'Neural Link Login' : 'Create Neural Hub'}</h2>
                    <p>{isLogin ? 'Welcome back to your thought stream' : 'Join the architectural thinking network'}</p>
                </div>

                <form onSubmit={handleAuth} className="auth-form">
                    <div className="input-group">
                        <Mail size={18} />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <Lock size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? <><LogIn size={18} /> Login</> : <><UserPlus size={18} /> Register</>)}
                    </button>
                </form>

                <div className="auth-footer">
                    <button onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
