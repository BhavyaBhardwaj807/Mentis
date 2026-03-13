import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `
You are an AI Financial Mentor inside a gamified learning platform.

Your job is to guide users through financial challenges by converting their strategy ideas into a visual graph of concepts and relationships.

The user can think aloud, type partial plans, or revise decisions. You must mentor them, ask focused coaching questions, and maintain a clear strategy graph.

--------------------------------
GRAPH MODEL
--------------------------------

Nodes:
{
  "id": "unique_id",
  "label": "Short human readable concept",
  "type": "concept | component | process | item",
  "importance": "core | normal | leaf",
  "sketch": [
    { "type": "rect", "x": 0, "y": 0, "w": 100, "h": 100 },
    { "type": "circle", "cx": 50, "cy": 50, "r": 20 },
    { "type": "line", "x1": 0, "y1": 0, "x2": 100, "y2": 100 }
  ]
}

Edges:
{
  "source": "node_id",
  "target": "node_id",
  "label": "relationship description"
}

--------------------------------
IMPORTANT BEHAVIOR RULES
--------------------------------

1. ALWAYS consider updating the graph.
Most user inputs should result in graph changes (nodes, edges, refinements).

2. HIERARCHY LOGIC.
- "core": The big central ideas. A idea can be core regardless of type (e.g. "Photosynthesis Process" could be core).
- "normal": Main systems or major parts.
- "leaf": Specific details, examples, or minor components (e.g. "Basil", "Mint").

3. TYPE CLASSIFICATION.
- "concept": Abstract ideas or themes.
- "component": Physical parts or modules.
- "process": Actions, logic, or transformation steps.
- "item": Specific instances, examples, or leaf objects.

4. REUSE EXISTING NODES.
Do not create duplicates. Update existing nodes if needed.

5. RELATIONSHIP UPDATES.
Edges are vital. Describe how nodes connect clearly.

6. MENTORING STYLE.
Be practical and educational. Ask one high-value question when needed. Suggest missing financial pieces such as emergency fund, diversification, timeline, and risk control.

7. DELETING DATA.
If the user wants to remove an idea, system, or component, identify the node ID(s) and include them in the "deleted_nodes" array. Also remove any edges connected to them. If specific connections are wrong, use "deleted_edges".

8. KEEP LABELS SHORT.
Node labels should be 1-3 words maximum.

9. FINANCIAL LEARNING FOCUS.
Treat the canvas as a strategy board. Prefer finance-relevant labels such as Budget, SIP, Equity, Debt Payoff, Emergency Fund, Goal Timeline, Asset Mix.

10. VISUAL SKETCHING.
Generate "sketch" for high-level system nodes when useful, but prioritize graph clarity over decorative sketches.

11. MENTORING LOOP CONROL
The mentoring process must follow this cycle:
Understand the user's strategy idea.
Convert the idea into graph nodes and edges.
Ask ONE focused coaching question only if important financial information is missing.
Once the strategy contains multiple meaningful decisions (typically 3 or more nodes), STOP asking questions and proceed to evaluation.
Do NOT continue asking questions indefinitely.


12.STRATEGY EVALUATION PHASE
When the strategy graph has enough structure (multiple nodes and relationships), transition into evaluation mode.
In evaluation mode:
Identify strengths in the strategy.
Suggest improvements such as diversification, timeline clarity, or risk balance.

--------------------------------
OUTPUT FORMAT
--------------------------------

Your response MUST ALWAYS be valid JSON.

{
    "chat_response": "Your mentor reply. Keep it concise, actionable, and learner-friendly.",
  "graph_update": {
    "nodes": [],
    "edges": [],
    "deleted_nodes": ["node_id_to_remove"],
    "deleted_edges": [{"source": "id1", "target": "id2"}]
  }
}

8. ERROR HANDLING:
If you are unsure or the user is just chatting, still return a valid JSON with an empty graph_update rather than failing.
`;

let model = null;
const sessions = new Map();

function getModel() {
    if (model) return model;
    if (!API_KEY) {
        throw new Error('Missing VITE_GEMINI_API_KEY in environment.');
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({
        model: 'gemini-flash-lite-latest',
        systemInstruction: SYSTEM_INSTRUCTION,
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
    });
    return model;
}

function safeParseAgentJson(text) {
    if (!text) return null;

    // Remove markdown code blocks
    let cleaned = text.replace(/```json\s*|```/gi, '').trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn('Initial JSON parse failed, attempting fuzzy extraction...', e);
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            try {
                const maybeJson = cleaned.slice(firstBrace, lastBrace + 1);
                return JSON.parse(maybeJson);
            } catch (innerE) {
                console.error('Fuzzy extraction also failed', innerE);
                return null;
            }
        }
        return null;
    }
}

function normalizeResponse(parsed) {
    return {
        chat_response: parsed?.chat_response || 'I heard you. Can you clarify the key outcome you want?',
        graph_update: {
            nodes: Array.isArray(parsed?.graph_update?.nodes) ? parsed.graph_update.nodes : [],
            edges: Array.isArray(parsed?.graph_update?.edges) ? parsed.graph_update.edges : [],
            deleted_nodes: Array.isArray(parsed?.graph_update?.deleted_nodes) ? parsed.graph_update.deleted_nodes : [],
            deleted_edges: Array.isArray(parsed?.graph_update?.deleted_edges) ? parsed.graph_update.deleted_edges : []
        }
    };
}

export function startThinkingSession() {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const activeModel = getModel();
    const chat = activeModel.startChat({
        generationConfig: {
            temperature: 0.7,
        }
    });
    sessions.set(sessionId, chat);
    return sessionId;
}

export async function sendThought(sessionId, prompt, currentGraph = { nodes: [], edges: [] }) {
    const fallbackResponse = {
        chat_response: "I hit a snag processing that. Could you try rephrasing or saying it again?",
        graph_update: { nodes: [], edges: [] }
    };

    try {
        const activeModel = getModel();
        let chat = sessions.get(sessionId);

        if (!chat) {
            chat = activeModel.startChat({
                generationConfig: { temperature: 0.7 }
            });
            sessions.set(sessionId, chat);
        }

        const fullPrompt = `
Current Graph Structure:
${JSON.stringify(currentGraph, null, 2)}

User Thought:
${prompt}
`;

        const result = await chat.sendMessage(fullPrompt);

        // Handle potential empty/blocked responses
        if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
            console.error('Gemini blocked or empty response:', result);
            return {
                ...fallbackResponse,
                chat_response: "I'm having trouble forming a response. This might be due to safety filters or a complex thought. Can we try a simpler part of the idea?"
            };
        }

        const fullText = await result.response.text();
        const parsed = safeParseAgentJson(fullText);
        return normalizeResponse(parsed);
    } catch (error) {
        console.error('Critical Gemini Error:', error);

        // If it's a structural error with the chat session, clear it to force a restart next time
        if (error.message?.includes('ChatSession')) {
            sessions.delete(sessionId);
        }

        return {
            ...fallbackResponse,
            chat_response: `AI Connection Error: ${error.message || 'The neural link is unstable'}. Please try your last thought again.`
        };
    }
}

export async function processInput(text, images = [], currentGraph = { nodes: [], edges: [] }) {
    const prompt = `
User thought:
${text}

Current graph:
${JSON.stringify(currentGraph)}

Image count:
${images.length}
`;

    const response = await sendThought(startThinkingSession(), prompt);
    return response?.graph_update || { nodes: [], edges: [] };
}

