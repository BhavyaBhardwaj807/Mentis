import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Video, Send, ArrowLeft, Layers, Square, User, LogOut } from 'lucide-react';
import { useThinkingPartner } from '../hooks/useThinkingPartner';
import ThoughtNode from '../components/ThoughtNode';
import Auth from '../components/Auth';
import IdeaArchive from '../components/IdeaArchive';
import { supabase } from '../lib/supabase';
import './Workspace.css';

const Workspace = ({ onBack, user }) => {
    // Standardize naming to avoid ReferenceErrors in existing code
    const initialUser = user;
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [inputText, setInputText] = useState('');

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };
    const {
        messages,
        isListening,
        isThinking,
        isSpeaking,
        graphData,
        toggleListening,
        manualInput,
        loadSession,
        newSession
    } = useThinkingPartner(initialUser);

    const scrollRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.scrollLeft = 1500 - canvasRef.current.clientWidth / 2;
            canvasRef.current.scrollTop = 1500 - canvasRef.current.clientHeight / 2;
        }
    }, [graphData.nodes.length > 0]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText('');
        await manualInput(text);
    };

    const [hoveredNodeId, setHoveredNodeId] = useState(null);

    // Stable Tree Layout Calculation
    const calculatedPositions = React.useMemo(() => {
        const positions = new Map();
        const spacingX = 350;
        const spacingY = 280;
        const offsetX = 800;
        const offsetY = 800;

        // Identify root nodes (nodes with no incoming edges)
        const rootNodes = graphData.nodes.filter(n => !graphData.edges.some(e => e.target === n.id));
        const nodesToProcess = [...graphData.nodes];
        const processedNodeIds = new Set();

        // Place root nodes first
        rootNodes.forEach((node, i) => {
            positions.set(node.id, {
                left: offsetX + (i % 3) * (spacingX * 1.5),
                top: offsetY + Math.floor(i / 3) * spacingY
            });
            processedNodeIds.add(node.id);
        });

        // Iteratively place children whose parents have been placed
        let changed = true;
        let iterationCount = 0;
        const maxIterations = graphData.nodes.length * 2; // Prevent infinite loops for cyclic graphs

        while (changed && processedNodeIds.size < graphData.nodes.length && iterationCount < maxIterations) {
            changed = false;
            for (const node of nodesToProcess) {
                if (processedNodeIds.has(node.id)) continue;

                const edge = graphData.edges.find(e => e.target === node.id);
                const parentId = edge?.source;

                if (parentId && positions.has(parentId)) {
                    const parentPos = positions.get(parentId);

                    // Find siblings (other children of the same parent)
                    const siblings = graphData.edges.filter(e => e.source === parentId);
                    const siblingIndex = siblings.findIndex(e => e.target === node.id);

                    const pos = {
                        left: parentPos.left + (siblingIndex - (siblings.length - 1) / 2) * spacingX,
                        top: parentPos.top + spacingY,
                    };
                    positions.set(node.id, pos);
                    processedNodeIds.add(node.id);
                    changed = true;
                }
            }
            iterationCount++;
        }

        // For any remaining nodes (e.g., disconnected nodes not identified as roots, or cycles)
        // place them in a simple grid after the initial layout.
        let gridIndex = 0;
        graphData.nodes.forEach(node => {
            if (!positions.has(node.id)) {
                positions.set(node.id, {
                    left: offsetX + (gridIndex % 3) * (spacingX * 1.5),
                    top: offsetY + Math.floor(gridIndex / 3) * spacingY
                });
                gridIndex++;
            }
        });

        return positions;
    }, [graphData.nodes, graphData.edges]);

    const nodeIndexById = new Map(graphData.nodes.map((node, index) => [node.id, index]));

    return (
        <div className="workspace-container">
            {/* Sidebar */}
            <div className="workspace-sidebar glass-panel">
                <div className="sidebar-header">
                    <button onClick={onBack} className="back-btn"><ArrowLeft size={20} /></button>
                    <span className="logo-text">LiveThought</span>
                </div>

                <div className="sidebar-nav">
                    <button className="nav-item" onClick={newSession}><Square size={20} /> New Session</button>
                    <button className="nav-item active"><Layers size={20} /> Canvas</button>
                    <button className="nav-item" onClick={() => setIsArchiveOpen(true)}>Idea Archive</button>
                    {!user ? (
                        <button className="nav-item" onClick={() => setIsAuthOpen(true)}><User size={20} /> Login</button>
                    ) : (
                        <div className="user-profile">
                            <div className="user-info">
                                <User size={16} />
                                <span>{user.email.split('@')[0]}</span>
                            </div>
                            <button className="logout-btn" onClick={handleLogout} title="Logout"><LogOut size={16} /></button>
                        </div>
                    )}
                    <button className="nav-item">Settings</button>
                </div>

                <div className="sidebar-status">
                    <div className="status-item">
                        <div className={`status-dot ${isListening ? 'active' : ''}`} />
                        <span>{isListening ? 'Sensing Thoughts' : (isSpeaking ? 'Agent Speaking' : 'Ready')}</span>
                    </div>
                    {isSpeaking && (
                        <div className="speaking-indicator" style={{ marginTop: '0.5rem', display: 'flex', gap: '2px' }}>
                            {[1, 2, 3].map(i => (
                                <motion.div
                                    key={i}
                                    animate={{ height: [4, 12, 4] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                    style={{ width: '3px', background: '#000', borderRadius: '1px' }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="workspace-main">
                <div className="canvas-header">
                    <div className="header-info">
                        <h2>Architecture</h2>
                    </div>
                    <div className="canvas-controls">
                        <button
                            className={`ctrl-btn ${isListening ? 'active pulse-mic' : ''}`}
                            onClick={toggleListening}
                            title={isListening ? "Stop Listening" : "Start Voice Thinking"}
                        >
                            {isListening ? <Square size={20} /> : <Mic size={20} />}
                        </button>
                        <button className="ctrl-btn"><Video size={20} /></button>
                    </div>
                </div>

                <div className="thought-canvas" ref={canvasRef}>
                    {graphData.nodes.length === 0 ? (
                        <div className="canvas-placeholder">
                            <p>Speak to start architecting...</p>
                        </div>
                    ) : null}
                    {graphData.nodes.length > 0 && (
                        <div className="nodes-container">
                            {graphData.edges.length > 0 && (
                                <svg
                                    style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        top: 0,
                                        left: 0,
                                        pointerEvents: 'none',
                                        zIndex: 1
                                    }}
                                >
                                    {graphData.edges.map((edge, edgeIndex) => {
                                        const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                                        const targetNode = graphData.nodes.find(n => n.id === edge.target);

                                        const sourcePos = calculatedPositions.get(edge.source);
                                        const targetPos = calculatedPositions.get(edge.target);

                                        if (!sourcePos || !targetPos || !sourceNode || !targetNode) return null;

                                        // Node widths for centering (matching ThoughtNode.jsx new sizes)
                                        const sourceWidth = sourceNode.importance === 'core' ? 160 : (sourceNode.importance === 'leaf' ? 100 : 120);
                                        const targetWidth = targetNode.importance === 'core' ? 160 : (targetNode.importance === 'leaf' ? 100 : 120);

                                        const startX = sourcePos.left + sourceWidth / 2;
                                        const startY = sourcePos.top + (sourceNode.importance === 'core' ? 35 : 28); // Bottom of pill
                                        const endX = targetPos.left + targetWidth / 2;
                                        const endY = targetPos.top + 0; // Top of pill

                                        const isHighlighted = hoveredNodeId === edge.source || hoveredNodeId === edge.target;

                                        // Create a tighter curved path (Bézier)
                                        // Calculate a point that is always below the source and above the target
                                        const controlPointY = (startY + endY) / 2;
                                        const pathData = `M ${startX} ${startY} C ${startX} ${controlPointY}, ${endX} ${controlPointY}, ${endX} ${endY}`;

                                        const labelMidX = (startX + endX) / 2;
                                        const labelMidY = (startY + endY) / 2;

                                        return (
                                            <g key={`${edge.source}-${edge.target}-${edgeIndex}`}>
                                                <path
                                                    d={pathData}
                                                    fill="none"
                                                    stroke={isHighlighted ? "#000" : "#000"}
                                                    strokeWidth={isHighlighted ? "1.5" : "1"}
                                                    opacity={isHighlighted ? 0.3 : 0.08}
                                                    style={{ transition: 'all 0.3s ease' }}
                                                />
                                                {edge.label && (
                                                    <g>
                                                        <text
                                                            x={labelMidX}
                                                            y={labelMidY - 5}
                                                            textAnchor="middle"
                                                            fill="#000"
                                                            fontSize="6"
                                                            fontWeight="800"
                                                            style={{ textTransform: 'uppercase', letterSpacing: '0.1em', pointerEvents: 'none', opacity: isHighlighted ? 0.8 : 0.3 }}
                                                        >
                                                            {edge.label}
                                                        </text>
                                                    </g>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                            )}
                            {graphData.nodes.map((node, i) => (
                                <div
                                    key={node.id}
                                    onMouseEnter={() => setHoveredNodeId(node.id)}
                                    onMouseLeave={() => setHoveredNodeId(null)}
                                    style={{
                                        position: 'absolute',
                                        zIndex: 10,
                                        ...calculatedPositions.get(node.id)
                                    }}
                                >
                                    <ThoughtNode node={node} index={i} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat / Terminal Interface */}
            <div className="workspace-chat glass-panel">
                <div className="chat-header">
                    <span>NEURAL_LINK_SESSION</span>
                </div>
                <div className="chat-history" ref={scrollRef}>
                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`chat-bubble ${msg.role}`}
                            >
                                <span className="bubble-role">{msg.role.toUpperCase()}</span>
                                <p>{msg.content}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="chat-input-wrapper">
                    <input
                        type="text"
                        placeholder="Neural input..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={handleSend} className="send-btn"><Send size={18} /></button>
                </div>
            </div>

            <AnimatePresence>
                {isArchiveOpen && (
                    <IdeaArchive
                        user={initialUser}
                        onSelectSession={loadSession}
                        onClose={() => setIsArchiveOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div >
    );
};

export default Workspace;

