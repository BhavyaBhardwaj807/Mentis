import { useState, useCallback, useRef, useEffect } from 'react';
import { startThinkingSession, sendThought } from '../lib/gemini';
import { supabase } from '../lib/supabase';

function buildMentorContext(context) {
    if (!context?.enabled) return '';

    return [
        'Financial Mentor Mode: ACTIVE',
        `Selected Topic: ${context.topicLabel || context.topicKey || 'General Finance'}`,
        `Current Level: ${context.levelLabel || 'Beginner'}`,
        `Challenge: ${context.challengePrompt || 'No active challenge yet.'}`,
        'Mentor behavior rules:',
        '- Ask one precise guiding question when needed.',
        '- Keep suggestions practical and beginner-friendly.',
        '- Map user ideas into finance strategy nodes and relationships.'
    ].join('\n');
}

export function useThinkingPartner(user, mentorContext = null) {
    const [messages, setMessages] = useState([
        {
            role: 'agent',
            content: "Welcome to Challenge Mode. I am your Financial Mentor. Share your strategy and I will help you structure and improve it on the canvas."
        }
    ]);
    const [isListening, setIsListening] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isLoadingSession, setIsLoadingSession] = useState(false);

    const chatSessionRef = useRef(null);
    const recognitionRef = useRef(null);
    const synthesisRef = useRef(window.speechSynthesis);
    const mentorContextRef = useRef(mentorContext);

    useEffect(() => {
        mentorContextRef.current = mentorContext;
    }, [mentorContext]);

    // Initialize session
    useEffect(() => {
        if (!chatSessionRef.current) {
            chatSessionRef.current = startThinkingSession();
        }
    }, []);

    // Create a Supabase session if user exists and no session started
    useEffect(() => {
        if (user && !currentSessionId && graphData.nodes.length > 0) {
            createSupabaseSession();
        }
    }, [user, graphData.nodes.length > 0, currentSessionId]);

    // Auto-save nodes and edges when they change and session exists
    useEffect(() => {
        if (user && currentSessionId && !isLoadingSession) {
            saveGraphToSupabase();
        }
    }, [graphData, currentSessionId, user, isLoadingSession]);

    const createSupabaseSession = async () => {
        const title = graphData.nodes[0]?.label || "Unnamed Session";
        const { data, error } = await supabase
            .from('sessions')
            .insert([{ user_id: user.id, title }])
            .select()
            .single();

        if (error) console.error("Error creating session:", error);
        else setCurrentSessionId(data.id);
    };

    const saveGraphToSupabase = async () => {
        // 1. Save Nodes (upsert)
        const nodesToSave = graphData.nodes.map(n => ({
            id: n.id,
            session_id: currentSessionId,
            label: n.label,
            type: n.type,
            importance: n.importance,
            sketch: n.sketch
        }));

        if (nodesToSave.length > 0) {
            const { error: nodeError } = await supabase
                .from('nodes')
                .upsert(nodesToSave);
            if (nodeError) console.error("Node Save Error:", nodeError);
        }

        // 2. Save Edges (for simplicity, we delete and re-insert edges for the session)
        await supabase.from('edges').delete().eq('session_id', currentSessionId);

        const edgesToSave = graphData.edges.map(e => ({
            session_id: currentSessionId,
            source: e.source,
            target: e.target,
            label: e.label
        }));

        if (edgesToSave.length > 0) {
            const { error: edgeError } = await supabase
                .from('edges')
                .insert(edgesToSave);
            if (edgeError) console.error("Edge Save Error:", edgeError);
        }
    };

    const speak = (text) => {
        if (!text || !synthesisRef.current) return;

        synthesisRef.current.cancel(); // Stop any current speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthesisRef.current.speak(utterance);
    };

    const processVoiceInput = async (text) => {
        if (!text.trim() || isThinking) return;

        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setIsThinking(true);

        try {
            const contextPrefix = buildMentorContext(mentorContextRef.current);
            const prompt = contextPrefix
                ? `${contextPrefix}\n\nUser Strategy Input:\n${text}`
                : text;
            const response = await sendThought(chatSessionRef.current, prompt, graphData);
            setMessages(prev => [...prev, { role: 'agent', content: response.chat_response }]);
            speak(response.chat_response);

            if (response.graph_update) {
                setGraphData(prev => {
                    const newNodes = response.graph_update.nodes || [];
                    const newEdges = response.graph_update.edges || [];
                    const deletedNodes = response.graph_update.deleted_nodes || [];
                    const deletedEdges = response.graph_update.deleted_edges || [];

                    let updatedNodes = prev.nodes.filter(n => !deletedNodes.includes(n.id));
                    let updatedEdges = prev.edges.filter(e =>
                        !deletedNodes.includes(e.source) &&
                        !deletedNodes.includes(e.target)
                    );

                    updatedEdges = updatedEdges.filter(e =>
                        !deletedEdges.some(de => de.source === e.source && de.target === e.target)
                    );

                    newNodes.forEach(newNode => {
                        const index = updatedNodes.findIndex(n => n.id === newNode.id);
                        if (index >= 0) {
                            updatedNodes[index] = { ...updatedNodes[index], ...newNode };
                        } else {
                            updatedNodes.push(newNode);
                        }
                    });

                    return {
                        nodes: updatedNodes,
                        edges: [...updatedEdges, ...newEdges]
                    };
                });
            }
        } catch (err) {
            console.error("Voice Process Error:", err);
            setMessages(prev => [...prev, {
                role: 'agent',
                content: `There was an error while processing voice input: ${err.message || 'Unknown error'}.`
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    }, [isListening]);

    const manualInput = useCallback(async (text) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setIsThinking(true);
        try {
            const contextPrefix = buildMentorContext(mentorContextRef.current);
            const prompt = contextPrefix
                ? `${contextPrefix}\n\nUser Strategy Input:\n${text}`
                : text;
            const response = await sendThought(chatSessionRef.current, prompt, graphData);
            setMessages(prev => [...prev, { role: 'agent', content: response.chat_response }]);

            if (response.graph_update) {
                setGraphData(prev => {
                    const newNodes = response.graph_update.nodes || [];
                    const newEdges = response.graph_update.edges || [];
                    const deletedNodes = response.graph_update.deleted_nodes || [];
                    const deletedEdges = response.graph_update.deleted_edges || [];

                    let updatedNodes = prev.nodes.filter(n => !deletedNodes.includes(n.id));
                    let updatedEdges = prev.edges.filter(e =>
                        !deletedNodes.includes(e.source) &&
                        !deletedNodes.includes(e.target)
                    );

                    updatedEdges = updatedEdges.filter(e =>
                        !deletedEdges.some(de => de.source === e.source && de.target === e.target)
                    );

                    newNodes.forEach(newNode => {
                        const index = updatedNodes.findIndex(n => n.id === newNode.id);
                        if (index >= 0) {
                            updatedNodes[index] = { ...updatedNodes[index], ...newNode };
                        } else {
                            updatedNodes.push(newNode);
                        }
                    });

                    return {
                        nodes: updatedNodes,
                        edges: [...updatedEdges, ...newEdges]
                    };
                });
            }
        } catch (err) {
            console.error("Manual Input Error:", err);
            setMessages(prev => [...prev, {
                role: 'agent',
                content: 'There was an error while processing your input.'
            }]);
        } finally {
            setIsThinking(false);
        }
    }, [graphData, chatSessionRef]);

    const pushAgentMessage = useCallback((content) => {
        if (!content) return;
        setMessages(prev => [...prev, { role: 'agent', content }]);
    }, []);

    // Setup Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const results = event.results;
                for (let i = event.resultIndex; i < results.length; i++) {
                    if (results[i].isFinal) {
                        const transcript = results[i][0].transcript;
                        processVoiceInput(transcript);
                    }
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (synthesisRef.current) {
                synthesisRef.current.cancel();
            }
        };
    }, [graphData]); // Re-bind recognition if graph changes

    const loadSession = useCallback(async (sessionId) => {
        setIsLoadingSession(true);
        const { data: session } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
        const { data: nodes } = await supabase.from('nodes').select('*').eq('session_id', sessionId);
        const { data: edges } = await supabase.from('edges').select('*').eq('session_id', sessionId);

        if (nodes) {
            setGraphData({
                nodes: nodes.map(n => ({ ...n })),
                edges: edges ? edges.map(e => ({ ...e })) : []
            });
            setCurrentSessionId(sessionId);
            setMessages([{ role: 'agent', content: `Neural link restored: ${session.title}. Continuing thought architecture.` }]);
        }
        setIsLoadingSession(false);
    }, []);

    const newSession = useCallback(() => {
        setGraphData({ nodes: [], edges: [] });
        setMessages([{ role: 'agent', content: "New session started. How can I help you today?" }]);
        setCurrentSessionId(null);
    }, []);

    const initializeGraph = useCallback((nextGraph) => {
        if (!nextGraph || !Array.isArray(nextGraph.nodes) || !Array.isArray(nextGraph.edges)) return;
        setGraphData(nextGraph);
    }, []);

    return {
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
    };
}
