import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Video, Send, ArrowLeft, Layers, Square, User, LogOut, Trophy, Target, ZoomIn, ZoomOut, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { useThinkingPartner } from '../hooks/useThinkingPartner';
import ThoughtNode from '../components/ThoughtNode';
import ChallengeHeader from '../components/ChallengeHeader';
import IdeaArchive from '../components/IdeaArchive';
import { supabase } from '../lib/supabase';
import { evaluateFinancialStrategy, getChallengeForTopic, getTopicOptions } from '../lib/financialGame';
import './Workspace.css';

const Workspace = ({ onBack, user, onOpenProgress, selectedPathChallenge, onChallengeCompleted }) => {
    const initialUser = user;
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('investing');
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [activePathMeta, setActivePathMeta] = useState(null);
    const [evaluation, setEvaluation] = useState(null);
    const [canvasZoom, setCanvasZoom] = useState(1);
    const [isEvaluated, setIsEvaluated] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);

    const MIN_ZOOM = 0.45;
    const MAX_ZOOM = 1.8;
    const CANVAS_SIZE = 3000;

    const topics = getTopicOptions();
    const levelLabel = activePathMeta?.levelTitle || 'Challenge Mode';
    const currentLevel = activePathMeta?.levelNumber || 1;
    const suggestedChallenge = getChallengeForTopic(selectedTopic, 1);

    const mentorContext = {
        enabled: true,
        topicKey: selectedTopic,
        topicLabel: activePathMeta?.topicLabel || topics.find((topic) => topic.value === selectedTopic)?.label,
        levelLabel,
        challengePrompt: activeChallenge?.prompt || suggestedChallenge?.prompt
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
        newSession,
        pushAgentMessage,
        initializeGraph
    } = useThinkingPartner(initialUser, mentorContext);

    const scrollRef = useRef(null);
    const canvasRef = useRef(null);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

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

    useEffect(() => {
        setActiveChallenge(suggestedChallenge);
        setEvaluation(null);
    }, [selectedTopic]);

    useEffect(() => {
        if (!selectedPathChallenge) return;

        setSelectedTopic(selectedPathChallenge.topicKey);
        setActivePathMeta({
            levelKey: selectedPathChallenge.levelKey,
            levelNumber: selectedPathChallenge.levelNumber,
            levelTitle: selectedPathChallenge.levelTitle,
            topicKey: selectedPathChallenge.topicKey,
            topicLabel: selectedPathChallenge.topicLabel
        });

        const chosenChallenge = selectedPathChallenge.challenge;
        setActiveChallenge(chosenChallenge);
        newSession();
        initializeGraph({
            nodes: [{ id: 'initial_money', label: '₹10,000', type: 'concept', importance: 'core' }],
            edges: []
        });
        setEvaluation(null);
        setIsEvaluated(false);
        pushAgentMessage(`Challenge Active: ${chosenChallenge.title}. ${chosenChallenge.prompt} Build your strategy on the canvas. I will coach you and then score your plan.`);
    }, [selectedPathChallenge]);

    useEffect(() => {
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;

        const onWheel = (event) => {
            if (!(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            const delta = event.deltaY > 0 ? -0.06 : 0.06;
            setCanvasZoom((prev) => {
                const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
                return Number(next.toFixed(2));
            });
        };

        canvasEl.addEventListener('wheel', onWheel, { passive: false });
        return () => canvasEl.removeEventListener('wheel', onWheel);
    }, [MIN_ZOOM, MAX_ZOOM]);

    useEffect(() => {
        if (isEvaluated) setIsEvaluated(false);
    }, [graphData.nodes.length, graphData.edges.length]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText('');
        await manualInput(text);
    };

    const handleZoomIn = () => setCanvasZoom((prev) => Math.min(MAX_ZOOM, Number((prev + 0.1).toFixed(2))));
    const handleZoomOut = () => setCanvasZoom((prev) => Math.max(MIN_ZOOM, Number((prev - 0.1).toFixed(2))));
    const handleZoomReset = () => setCanvasZoom(1);

    const startChallenge = () => {
        if (!activeChallenge) return;

        newSession();
        initializeGraph({
            nodes: [{ id: 'initial_money', label: '₹10,000', type: 'concept', importance: 'core' }],
            edges: []
        });
        setEvaluation(null);
        setIsEvaluated(false);
        setActivePathMeta(null);
        pushAgentMessage(`Challenge Active: ${activeChallenge.title}. ${activeChallenge.prompt} Build your strategy on the canvas. I will coach you and then score your plan.`);
    };

    const evaluateStrategy = () => {
        const result = evaluateFinancialStrategy({ graphData, topicKey: selectedTopic });

        if (result.notEnoughNodes) {
            pushAgentMessage(`Cannot evaluate yet. ${result.feedback}`);
            return;
        }

        setEvaluation(result);
        setIsEvaluated(true);
        pushAgentMessage(`Strategy Score: ${result.score}/100. ${result.feedback}`);

        if (result.score >= 70 && activePathMeta?.levelKey && activePathMeta?.topicKey) {
            onChallengeCompleted?.(activePathMeta.levelKey, activePathMeta.topicKey);
        }
    };

    const getSimplifiedStrategyModel = () => {
        const nodes = graphData.nodes || [];
        const labels = nodes.map((node) => (node.label || '').trim()).filter(Boolean);

        const findByKeywords = (keywords) =>
            labels.filter((label) => keywords.some((k) => label.toLowerCase().includes(k)));

        const capital = findByKeywords(['capital', 'initial', 'inr', 'fund'])
            .find((label) => label.toLowerCase().includes('capital') || label.toLowerCase().includes('initial')) || labels[0] || 'Initial Capital';

        const allocations = findByKeywords(['allocation', 'split', 'ratio', '%', 'percent']);
        const assets = findByKeywords(['sip', 'fund', 'stock', 'equity', 'etf', 'bond', 'nps', 'ppf', 'fd', 'gold', 'portfolio']);
        const safety = findByKeywords(['saving', 'liquid', 'emergency', 'reserve', 'insurance', 'cash']);
        const timelines = findByKeywords(['timeline', 'month', 'year', 'term', 'quarter']);
        const goals = findByKeywords(['goal', 'target', 'objective', 'retirement', 'purchase']);
        const risks = findByKeywords(['risk', 'safe', 'moderate', 'aggressive']);

        const flowSteps = [
            `Capital Base: ${capital}`,
            allocations.length ? `Allocation Plan: ${allocations.slice(0, 2).join(' + ')}` : 'Allocation Plan: Define split across strategy buckets',
            assets.length ? `Asset Strategy: ${assets.slice(0, 3).join(', ')}` : 'Asset Strategy: Choose growth and income instruments',
            (safety.length || risks.length)
                ? `Safety & Risk: ${(safety.concat(risks)).slice(0, 3).join(', ')}`
                : 'Safety & Risk: Balance growth with protection',
            (timelines.length || goals.length)
                ? `Timeline & Goals: ${(timelines.concat(goals)).slice(0, 3).join(', ')}`
                : 'Timeline & Goals: Set milestones and expected outcomes',
        ].slice(0, 6);

        const uniqueDecisions = Array.from(new Set([
            ...allocations,
            ...assets,
            ...safety,
            ...timelines,
            ...goals,
            ...risks,
        ].filter(Boolean)));

        const summarySentence = [
            `The strategy starts from ${capital}.`,
            allocations.length
                ? `It uses allocation choices like ${allocations.slice(0, 2).join(' and ')}.`
                : 'It proposes a structured allocation between growth and safety options.',
            assets.length
                ? `Core investment components include ${assets.slice(0, 3).join(', ')}.`
                : 'Core investment components are to be finalized based on risk preference.',
            goals.length || timelines.length
                ? `The plan is aligned to ${timelines.concat(goals).slice(0, 2).join(' and ')}.`
                : 'The plan should define explicit timelines and goal outcomes.'
        ].join(' ');

        return {
            summarySentence,
            flowSteps,
            keyDecisions: uniqueDecisions.slice(0, 8)
        };
    };

    const parseEvaluationFeedback = () => {
        const score = evaluation?.score ?? null;
        const feedback = evaluation?.feedback || '';
        const strengthsMatch = feedback.match(/Strengths:\s*([^|]+)/i);
        const improveMatch = feedback.match(/Improve(?:ments?)?:\s*(.*)$/i);

        const strengths = strengthsMatch
            ? strengthsMatch[1].split('.').map((s) => s.trim()).filter(Boolean)
            : [];
        const suggestions = improveMatch
            ? improveMatch[1].split('.').map((s) => s.trim()).filter(Boolean)
            : [];

        return { score, strengths, suggestions };
    };

    const exportStrategyPDF = async () => {
        setIsExporting(true);
        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const margin = 10;
            const contentW = pageW - margin * 2;

            const model = getSimplifiedStrategyModel();
            const ai = parseEvaluationFeedback();

            pdf.setFillColor(16, 16, 16);
            pdf.rect(0, 0, pageW, 18, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('MENTIS — Financial Strategy Report', margin, 12);

            pdf.setTextColor(30, 30, 30);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            const meta = [
                activeChallenge ? `Challenge: ${activeChallenge.title}` : '',
                `Topic: ${mentorContext.topicLabel || selectedTopic}`,
                ai.score !== null ? `Score: ${ai.score}/100` : 'Score: Not available',
                `Date: ${new Date().toLocaleDateString('en-IN')}`
            ].filter(Boolean).join('   |   ');
            pdf.text(meta, margin, 24);

            let y = 34;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text('Strategy Summary', margin, y);
            y += 6;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            const summaryLines = pdf.splitTextToSize(model.summarySentence, contentW);
            pdf.text(summaryLines, margin, y);
            y += summaryLines.length * 4.8 + 5;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text('Simplified Strategy Flow', margin, y);
            y += 5;

            const stepW = contentW;
            const stepH = 10;
            const stepGap = 4;
            const steps = model.flowSteps.slice(0, Math.min(6, Math.max(4, model.flowSteps.length)));

            steps.forEach((stepLabel, i) => {
                const boxY = y + i * (stepH + stepGap);
                pdf.setFillColor(250, 246, 235);
                pdf.setDrawColor(166, 149, 116);
                pdf.roundedRect(margin, boxY, stepW, stepH, 2.5, 2.5, 'FD');
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8.4);
                pdf.setTextColor(30, 30, 30);
                pdf.text(`${i + 1}. ${stepLabel}`.slice(0, 108), margin + 3, boxY + 6.3);

                if (i < steps.length - 1) {
                    const arrowY = boxY + stepH + 2;
                    const cx = margin + stepW / 2;
                    pdf.setDrawColor(120, 106, 74);
                    pdf.line(cx, arrowY - 1.4, cx, arrowY + 1.4);
                    pdf.line(cx - 1.3, arrowY + 0.6, cx, arrowY + 1.8);
                    pdf.line(cx + 1.3, arrowY + 0.6, cx, arrowY + 1.8);
                }
            });

            y += steps.length * (stepH + stepGap) + 4;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text('Key Decisions', margin, y);
            y += 6;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            const decisions = model.keyDecisions.length
                ? model.keyDecisions
                : ['No major decision nodes detected yet. Add more strategy nodes for a richer report.'];
            decisions.slice(0, 6).forEach((decision) => {
                const lines = pdf.splitTextToSize(`• ${decision}`, contentW);
                pdf.text(lines, margin, y);
                y += lines.length * 4.6;
            });

            y += 3;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text('AI Evaluation', margin, y);
            y += 6;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.text(`Score: ${ai.score !== null ? `${ai.score}/100` : 'Not available'}`, margin, y);
            y += 6;

            pdf.setFont('helvetica', 'bold');
            pdf.text('Strengths', margin, y);
            y += 5;
            pdf.setFont('helvetica', 'normal');
            const strengths = ai.strengths.length ? ai.strengths : ['Not enough strengths generated yet.'];
            strengths.slice(0, 4).forEach((item) => {
                const lines = pdf.splitTextToSize(`• ${item}`, contentW);
                pdf.text(lines, margin, y);
                y += lines.length * 4.5;
            });

            y += 2;
            pdf.setFont('helvetica', 'bold');
            pdf.text('Suggestions', margin, y);
            y += 5;
            pdf.setFont('helvetica', 'normal');
            const suggestions = ai.suggestions.length ? ai.suggestions : ['Continue refining allocations, risk balance, and timeline clarity.'];
            suggestions.slice(0, 4).forEach((item) => {
                const lines = pdf.splitTextToSize(`• ${item}`, contentW);
                pdf.text(lines, margin, y);
                y += lines.length * 4.5;
            });

            pdf.save(`mentis-strategy-${Date.now()}.pdf`);
        } finally {
            setIsExporting(false);
        }
    };

    const calculatedPositions = React.useMemo(() => {
        const positions = new Map();
        const spacingX = 350;
        const spacingY = 280;
        const offsetX = 800;
        const offsetY = 800;
        const minCanvasX = 140;
        const minCanvasY = 120;

        const rootNodes = graphData.nodes.filter((n) => !graphData.edges.some((e) => e.target === n.id));
        const nodesToProcess = [...graphData.nodes];
        const processedNodeIds = new Set();

        rootNodes.forEach((node, i) => {
            if (node.id === 'initial_money') {
                positions.set(node.id, { left: 1420, top: 1470 });
                processedNodeIds.add(node.id);
                return;
            }

            positions.set(node.id, {
                left: Math.max(minCanvasX, offsetX + (i % 3) * (spacingX * 1.5)),
                top: Math.max(minCanvasY, offsetY + Math.floor(i / 3) * spacingY)
            });
            processedNodeIds.add(node.id);
        });

        let changed = true;
        let iterationCount = 0;
        const maxIterations = graphData.nodes.length * 2;

        while (changed && processedNodeIds.size < graphData.nodes.length && iterationCount < maxIterations) {
            changed = false;
            for (const node of nodesToProcess) {
                if (processedNodeIds.has(node.id)) continue;

                const edge = graphData.edges.find((e) => e.target === node.id);
                const parentId = edge?.source;

                if (parentId && positions.has(parentId)) {
                    const parentPos = positions.get(parentId);
                    const siblings = graphData.edges.filter((e) => e.source === parentId);
                    const siblingIndex = siblings.findIndex((e) => e.target === node.id);

                    const pos = {
                        left: Math.max(minCanvasX, parentPos.left + (siblingIndex - (siblings.length - 1) / 2) * spacingX),
                        top: Math.max(minCanvasY, parentPos.top + spacingY),
                    };
                    positions.set(node.id, pos);
                    processedNodeIds.add(node.id);
                    changed = true;
                }
            }
            iterationCount++;
        }

        let gridIndex = 0;
        graphData.nodes.forEach((node) => {
            if (!positions.has(node.id)) {
                positions.set(node.id, {
                    left: Math.max(minCanvasX, offsetX + (gridIndex % 3) * (spacingX * 1.5)),
                    top: Math.max(minCanvasY, offsetY + Math.floor(gridIndex / 3) * spacingY)
                });
                gridIndex++;
            }
        });

        return positions;
    }, [graphData.nodes, graphData.edges]);

    return (
        <div className="workspace-container">
            <div className="workspace-sidebar glass-panel">
                <div className="sidebar-header">
                    <button onClick={onBack} className="back-btn"><ArrowLeft size={20} /></button>
                    <span className="logo-text">Mentis Finance</span>
                </div>

                <div className="sidebar-nav">
                    <button className="nav-item active"><Layers size={20} /> Strategy Board</button>
                    <button className="nav-item" onClick={onOpenProgress}>Learning Path</button>
                    <button className="nav-item" onClick={() => setIsArchiveOpen(true)}>Idea Archive</button>
                    {user && (
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

                <div className="challenge-panel">
                    <div className="challenge-mode-badge">Challenge Mode</div>
                    <h3>L{currentLevel}: {levelLabel}</h3>
                    <p className="challenge-caption">Select a finance topic and solve a mission on the canvas.</p>

                    <div className="topic-grid">
                        {topics.map((topic) => (
                            <button
                                key={topic.value}
                                className={`topic-pill ${selectedTopic === topic.value ? 'active' : ''}`}
                                onClick={() => {
                                    setActivePathMeta(null);
                                    setSelectedTopic(topic.value);
                                }}
                            >
                                {topic.label === 'Debt Management' ? 'Debt' : topic.label}
                            </button>
                        ))}
                    </div>

                    {activeChallenge && (
                        <div className="challenge-card">
                            <div className="challenge-card-title">{activeChallenge.title}</div>
                            <p>Challenge details are pinned above the canvas. Start and build your strategy map.</p>
                        </div>
                    )}

                    <div className="challenge-actions">
                        <button className="challenge-btn" onClick={startChallenge}><Target size={14} /> Start</button>
                        <button className="challenge-btn secondary" onClick={evaluateStrategy}><Trophy size={14} /> Evaluate</button>
                    </div>

                    <button
                        className={`export-pdf-btn ${isEvaluated ? '' : 'disabled'}`}
                        onClick={isEvaluated ? exportStrategyPDF : undefined}
                        disabled={!isEvaluated || isExporting}
                        title={isEvaluated ? 'Export strategy as PDF' : 'Complete evaluation before exporting'}
                    >
                        <FileDown size={14} />
                        {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                </div>

                <div className="sidebar-status">
                    <div className="status-item">
                        <div className={`status-dot ${isListening ? 'active' : ''}`} />
                        <span>{isListening ? 'Sensing Thoughts' : (isSpeaking ? 'Agent Speaking' : 'Ready')}</span>
                    </div>
                    {isSpeaking && (
                        <div className="speaking-indicator" style={{ marginTop: '0.5rem', display: 'flex', gap: '2px' }}>
                            {[1, 2, 3].map((i) => (
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

            <div className="workspace-main">
                <div className="canvas-header">
                    <div className="header-info">
                        <h2>Financial Strategy Board</h2>
                    </div>
                    <div className="canvas-controls">
                        <div className="zoom-controls">
                            <button className="ctrl-btn zoom-btn" onClick={handleZoomOut} title="Zoom Out">
                                <ZoomOut size={18} />
                            </button>
                            <button className="zoom-label" onClick={handleZoomReset} title="Reset Zoom (Ctrl/Cmd + Wheel to zoom)">
                                {Math.round(canvasZoom * 100)}%
                            </button>
                            <button className="ctrl-btn zoom-btn" onClick={handleZoomIn} title="Zoom In">
                                <ZoomIn size={18} />
                            </button>
                        </div>
                        <button
                            className={`ctrl-btn ${isListening ? 'active pulse-mic' : ''}`}
                            onClick={toggleListening}
                            title={isListening ? 'Stop Listening' : 'Start Voice Thinking'}
                        >
                            {isListening ? <Square size={20} /> : <Mic size={20} />}
                        </button>
                        <button className="ctrl-btn"><Video size={20} /></button>
                    </div>
                </div>

                <ChallengeHeader challenge={activeChallenge} topicLabel={mentorContext.topicLabel} levelLabel={levelLabel} />

                <div className="thought-canvas" ref={canvasRef} id="strategy-canvas">
                    {graphData.nodes.length === 0 && (
                        <div className="canvas-placeholder">
                            <p>Start a challenge to initialize your strategy board.</p>
                        </div>
                    )}

                    {graphData.nodes.length > 0 && (
                        <div className="zoom-space" style={{ width: `${CANVAS_SIZE * canvasZoom}px`, height: `${CANVAS_SIZE * canvasZoom}px` }}>
                            <div
                                className="zoom-content"
                                style={{
                                    transform: `scale(${canvasZoom})`,
                                    transformOrigin: 'top left',
                                    width: `${CANVAS_SIZE}px`,
                                    height: `${CANVAS_SIZE}px`
                                }}
                            >
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
                                                const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
                                                const targetNode = graphData.nodes.find((n) => n.id === edge.target);
                                                const sourcePos = calculatedPositions.get(edge.source);
                                                const targetPos = calculatedPositions.get(edge.target);
                                                if (!sourcePos || !targetPos || !sourceNode || !targetNode) return null;

                                                const sourceWidth = sourceNode.importance === 'core' ? 160 : (sourceNode.importance === 'leaf' ? 100 : 120);
                                                const targetWidth = targetNode.importance === 'core' ? 160 : (targetNode.importance === 'leaf' ? 100 : 120);

                                                const startX = sourcePos.left + sourceWidth / 2;
                                                const startY = sourcePos.top + (sourceNode.importance === 'core' ? 35 : 28);
                                                const endX = targetPos.left + targetWidth / 2;
                                                const endY = targetPos.top;

                                                const isHighlighted = hoveredNodeId === edge.source || hoveredNodeId === edge.target;
                                                const controlPointY = (startY + endY) / 2;
                                                const pathData = `M ${startX} ${startY} C ${startX} ${controlPointY}, ${endX} ${controlPointY}, ${endX} ${endY}`;
                                                const labelMidX = (startX + endX) / 2;
                                                const labelMidY = (startY + endY) / 2;

                                                return (
                                                    <g key={`${edge.source}-${edge.target}-${edgeIndex}`}>
                                                        <path
                                                            d={pathData}
                                                            fill="none"
                                                            stroke="#000"
                                                            strokeWidth={isHighlighted ? '1.5' : '1'}
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
                                                                    style={{
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.1em',
                                                                        pointerEvents: 'none',
                                                                        opacity: isHighlighted ? 0.8 : 0.3
                                                                    }}
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
                                            style={{ position: 'absolute', zIndex: 10, ...calculatedPositions.get(node.id) }}
                                        >
                                            <ThoughtNode node={node} index={i} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="workspace-chat glass-panel">
                <div className="chat-header">
                    <span>FINANCE_MENTOR_SESSION</span>
                </div>

                <div className="mentor-instruction-box">
                    <h4>Mentor Instructions</h4>
                    <p>
                        {activeChallenge
                            ? `Mission: ${activeChallenge.title}. Goal: ${activeChallenge.prompt}`
                            : 'Select a topic and start a challenge. I will guide your financial strategy step by step.'}
                    </p>
                </div>

                {evaluation && (
                    <div className="mentor-score-box">
                        <div className="mentor-score-title">Latest Evaluation</div>
                        <div className="score-value">{evaluation.score}/100</div>
                        <p>{evaluation.feedback}</p>
                    </div>
                )}

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
                        placeholder="Describe your strategy move..."
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
        </div>
    );
};

export default Workspace;
