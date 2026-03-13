import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Canvas3D from '../components/Canvas3D';
import './LandingPage.css';

const LandingPage = ({ onEnter }) => {
    return (
        <div className="landing-page">
            <div className="vertical-line" />
            <div className="protocol-list">
                {['Topic_Select', 'Challenge_Mode', 'Strategy_Map', 'Mentor_Coach', 'Score_Review'].map((step, i) => (
                    <div key={i} className="protocol-step">
                        <span className="step-num">PROT_{i + 1}</span>
                        <span className="step-name">{step}</span>
                    </div>
                ))}
            </div>

            <div className="data-stamp stamp-tl">[ SYSTEM_LINK // MT_SYNAPSE_01 ] [ STATE: READY ]</div>
            <div className="data-stamp stamp-bl">COORD_SENSE: 34.0522 N, 118.2437 W // TICK: {Math.random().toString(16).slice(2, 8)}</div>
            <div className="data-stamp stamp-br">DEEP_CORE_ENGINE_v.1.0.4a // (c) 2026 MENTIS</div>


            <Canvas3D />

            <div className="hero-content">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                >
                    <div className="badge">
                        <div className="status-dot active" style={{ width: 4, height: 4 }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.25em' }}>
                            [ FINANCIAL_MENTOR_ONLINE ]
                        </span>
                    </div>

                    <h1 className="hero-title">
                        MENTIS
                    </h1>

                    <div className="hero-branding">
                        <p className="hero-punchline">Play. Plan. Prosper.</p>
                        <p className="hero-subtitle">
                            A gamified financial learning platform where you solve real money challenges on a visual strategy board with an AI mentor.
                        </p>
                    </div>

                    <div className="cta-group">
                        <button onClick={onEnter} className="btn-primary">
                            Enter Workspace <ArrowRight size={20} />
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    className="features-grid"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                >
                    {[
                        { title: "// Challenges", desc: "Solve budgeting, saving, and investing missions" },
                        { title: "// Mentor", desc: "Get guided questions and tactical feedback" },
                        { title: "// Progression", desc: "Level up through finance skill tracks" }
                    ].map((feature, i) => (
                        <div key={i} className="feature-card">
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-desc">{feature.desc}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default LandingPage;
