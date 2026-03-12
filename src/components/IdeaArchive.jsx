import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Clock, MessageSquare, Trash2, ArrowRight } from 'lucide-react';
import './IdeaArchive.css';

const IdeaArchive = ({ user, onSelectSession, onClose }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchSessions();
        }
    }, [user]);

    const fetchSessions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) console.error("Error fetching sessions:", error);
        else setSessions(data || []);
        setLoading(false);
    };

    const deleteSession = async (id, e) => {
        e.stopPropagation();
        const { error } = await supabase.from('sessions').delete().eq('id', id);
        if (!error) {
            setSessions(sessions.filter(s => s.id !== id));
        }
    };

    return (
        <div className="archive-overlay" onClick={onClose}>
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="archive-panel glass-panel"
                onClick={e => e.stopPropagation()}
            >
                <div className="archive-header">
                    <h2>Idea Archive</h2>
                    <p>Your collection of architectural thoughts</p>
                </div>

                <div className="archive-list">
                    {loading ? (
                        <div className="archive-loading">Accessing Neural Records...</div>
                    ) : sessions.length === 0 ? (
                        <div className="archive-empty">No archived thoughts yet. Start architecting!</div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                className="archive-item"
                                onClick={() => {
                                    onSelectSession(session.id);
                                    onClose();
                                }}
                            >
                                <div className="item-info">
                                    <h3>{session.title}</h3>
                                    <div className="item-meta">
                                        <Clock size={12} />
                                        <span>{new Date(session.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="item-actions">
                                    <button onClick={(e) => deleteSession(session.id, e)} className="delete-btn">
                                        <Trash2 size={16} />
                                    </button>
                                    <ArrowRight size={16} className="arrow" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default IdeaArchive;
