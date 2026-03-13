const TOPIC_LIBRARY = {
    budgeting: {
        label: 'Budgeting',
        keywords: ['budget', 'expense', 'income', 'needs', 'wants', 'tracking']
    },
    saving: {
        label: 'Saving',
        keywords: ['saving', 'emergency fund', 'goal', 'deposit', 'reserve']
    },
    investing: {
        label: 'Investing',
        keywords: ['sip', 'mutual fund', 'stocks', 'index fund', 'etf', 'bonds', 'portfolio']
    },
    debt: {
        label: 'Debt Management',
        keywords: ['debt', 'loan', 'emi', 'interest', 'repayment', 'payoff']
    }
};

const CHALLENGES_BY_TOPIC = {
    budgeting: [
        { id: 'bud-1', level: 1, title: 'Monthly Budget Blueprint', prompt: 'You earn INR 45,000 monthly. Build a budget that covers essentials, goals, and flexible spending.' },
        { id: 'bud-2', level: 2, title: 'Family Budget Stress Test', prompt: 'A family of 3 has INR 70,000 monthly income and unstable utility bills. Build a resilient monthly budgeting plan.' },
        { id: 'bud-3', level: 3, title: 'Income Drop Plan', prompt: 'Your income drops by 25 percent for 6 months. Design a budget strategy to stay stable without new debt.' }
    ],
    saving: [
        { id: 'sav-1', level: 1, title: 'Emergency Fund Starter', prompt: 'You have INR 10,000 and want an emergency fund in 12 months. Build a practical saving plan.' },
        { id: 'sav-2', level: 2, title: 'Dual Goal Saving', prompt: 'Save for both an emergency fund and a laptop in one year. Build a split saving strategy.' },
        { id: 'sav-3', level: 3, title: 'Volatile Income Saver', prompt: 'Income changes every month. Create a saving framework that still reaches long term goals.' }
    ],
    investing: [
        { id: 'inv-1', level: 1, title: 'INR 10,000 Growth Plan', prompt: 'You have INR 10,000. Build the best strategy to grow it in one year with balanced risk.' },
        { id: 'inv-2', level: 2, title: 'Diversified INR 50,000 Plan', prompt: 'Build a diversified investment plan for INR 50,000 using safe and growth instruments.' },
        { id: 'inv-3', level: 3, title: 'Goal Based Portfolio', prompt: 'Design a portfolio for 3 goals: short term liquidity, medium term purchase, and long term wealth creation.' }
    ],
    debt: [
        { id: 'deb-1', level: 1, title: 'Credit Card Recovery', prompt: 'You owe INR 80,000 on a credit card. Build a debt payoff strategy without missing essential expenses.' },
        { id: 'deb-2', level: 2, title: 'Loan Prioritization', prompt: 'You have education and personal loans. Build a plan to prioritize repayment and lower total interest.' },
        { id: 'deb-3', level: 3, title: 'Debt-Free Roadmap', prompt: 'Create a 24 month debt freedom strategy that keeps an emergency buffer active.' }
    ]
};

const LEVELS = [
    { number: 1, title: 'Budgeting Basics' },
    { number: 2, title: 'Saving Strategies' },
    { number: 3, title: 'Investments' },
    { number: 4, title: 'Portfolio Management' }
];

// ─── Keyword Dictionaries ────────────────────────────────────────────────────

const SAFE_KEYWORDS     = ['saving', 'emergency', 'fixed deposit', 'insurance', 'reserve', 'cash', 'fd', 'liquid', 'buffer', 'safety'];
const GROWTH_KEYWORDS   = ['sip', 'mutual fund', 'stocks', 'equity', 'index fund', 'etf', 'bonds', 'nps', 'elss', 'ppf', 'portfolio'];
const PLANNING_KEYWORDS = ['budget', 'goal', 'timeline', 'monthly', 'tracking', 'review', 'allocation', 'plan', 'target', 'expense'];
const DEBT_KEYWORDS     = ['debt', 'loan', 'emi', 'interest', 'repayment', 'payoff', 'credit card', 'balance'];
const TIMELINE_KEYWORDS = ['short term', 'long term', 'monthly', 'yearly', 'year', 'month', 'timeline', 'term', 'duration', 'quarterly'];
const EMERGENCY_KEYWORDS = ['emergency', 'reserve', 'insurance', 'safety', 'buffer', 'liquid', 'contingency'];

// Minimum meaningful nodes required before evaluation runs (excludes starter node)
const MIN_STRATEGY_NODES = 3;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const collectLabelText = (nodes = []) =>
    nodes.map((n) => (n.label || '').toLowerCase()).join(' ');

const countKeywordHits = (text, list) =>
    list.filter((k) => text.includes(k)).length;

const hasAny = (text, list) =>
    list.some((k) => text.includes(k));

// ─── Factor 1 — Diversification (25 pts) ─────────────────────────────────────
// How many of the 4 financial categories are represented on the canvas?
const scoreDiversification = (text) => {
    const categories = [SAFE_KEYWORDS, GROWTH_KEYWORDS, PLANNING_KEYWORDS, DEBT_KEYWORDS];
    const covered = categories.filter((group) => hasAny(text, group)).length;
    return (covered / categories.length) * 100;
};

// ─── Factor 2 — Risk Balance (20 pts) ────────────────────────────────────────
// Are both safe and growth instruments present in reasonable proportion?
const scoreRiskBalance = (text) => {
    const safeHits   = countKeywordHits(text, SAFE_KEYWORDS);
    const growthHits = countKeywordHits(text, GROWTH_KEYWORDS);

    if (safeHits === 0 && growthHits === 0) return 0;
    if (safeHits === 0 || growthHits === 0) return 35;  // one-sided = partial credit

    const ratio = safeHits / (safeHits + growthHits);   // 0..1
    // Ideal balance is roughly 0.3–0.6 safe / total
    const distFromIdeal = Math.abs(ratio - 0.45);
    return clamp((1 - distFromIdeal * 2) * 100, 40, 100);
};

// ─── Factor 3 — Emergency Safety Net (15 pts) ────────────────────────────────
// Does the strategy include any safety / emergency buffer concept?
const scoreEmergencySafety = (text) =>
    hasAny(text, EMERGENCY_KEYWORDS) ? 100 : 0;

// ─── Factor 4 — Timeline Awareness (15 pts) ──────────────────────────────────
// Does the strategy reference any time horizon or planning window?
const scoreTimeline = (text) =>
    hasAny(text, TIMELINE_KEYWORDS) ? 100 : 0;

// ─── Factor 5 — Strategy Complexity (25 pts) ─────────────────────────────────
// Structural depth: meaningful node count + edge connectivity density.
const scoreComplexity = (strategyNodes, edges) => {
    const nodeCount = strategyNodes.length;
    // Full node credit at 8+ meaningful nodes
    const nodeScore = clamp(nodeCount / 8, 0, 1) * 60;
    // Edge density: ideally at least 1 edge per node
    const density = nodeCount > 0 ? edges.length / nodeCount : 0;
    const edgeScore = clamp(density, 0, 1) * 40;
    return nodeScore + edgeScore;
};

// ─── Topic-specific penalty ───────────────────────────────────────────────────
// Deduct points when the strategy is clearly off-topic.
const topicPenalty = (text, topicKey) => {
    const required = {
        investing: GROWTH_KEYWORDS,
        budgeting: PLANNING_KEYWORDS,
        saving:    SAFE_KEYWORDS,
        debt:      DEBT_KEYWORDS,
    };
    const list = required[topicKey];
    if (!list) return 0;
    return hasAny(text, list) ? 0 : 12;  // 12-point penalty if no topic-relevant node exists
};

export function getTopicOptions() {
    return Object.entries(TOPIC_LIBRARY).map(([value, info]) => ({ value, label: info.label }));
}

export function getLevelByProgress(completedChallengeCount = 0) {
    return clamp(Math.floor(completedChallengeCount / 2) + 1, 1, LEVELS.length);
}

export function getLevelLabel(levelNumber) {
    return LEVELS.find((level) => level.number === levelNumber)?.title || 'Finance Progress';
}

export function getChallengeForTopic(topicKey, levelNumber) {
    const challenges = CHALLENGES_BY_TOPIC[topicKey] || [];
    return challenges.find((challenge) => challenge.level === levelNumber) || challenges[0] || null;
}

export function evaluateFinancialStrategy({ graphData, topicKey }) {
    const allNodes = graphData?.nodes || [];
    const edges    = graphData?.edges  || [];

    // Exclude the auto-generated starter node from meaningful strategy nodes
    const strategyNodes = allNodes.filter((n) => n.id !== 'initial_money');

    // ── Hard gate: require at least MIN_STRATEGY_NODES before scoring ──────────
    if (strategyNodes.length < MIN_STRATEGY_NODES) {
        return {
            score: 0,
            notEnoughNodes: true,
            feedback: `Add at least ${MIN_STRATEGY_NODES} strategy nodes before evaluating. Currently you have ${strategyNodes.length}. Try adding nodes like SIP, Savings, Emergency Fund, or Goal Timeline.`,
            metrics: { diversification: 0, riskBalance: 0, emergencySafety: 0, timeline: 0, complexity: 0 }
        };
    }

    const text = collectLabelText(strategyNodes);

    // ── Compute factor scores (each 0–100) ─────────────────────────────────────
    const fDiversification  = scoreDiversification(text);
    const fRiskBalance      = scoreRiskBalance(text);
    const fEmergencySafety  = scoreEmergencySafety(text);
    const fTimeline         = scoreTimeline(text);
    const fComplexity       = scoreComplexity(strategyNodes, edges);

    // ── Weighted total ──────────────────────────────────────────────────────────
    // Weights: diversification 25%, risk balance 20%, emergency 15%, timeline 15%, complexity 25%
    const rawScore =
        fDiversification * 0.25 +
        fRiskBalance     * 0.20 +
        fEmergencySafety * 0.15 +
        fTimeline        * 0.15 +
        fComplexity      * 0.25;

    const penalty = topicPenalty(text, topicKey);
    const score   = Math.round(clamp(rawScore - penalty, 0, 100));

    // ── Per-factor feedback ─────────────────────────────────────────────────────
    const strengths    = [];
    const improvements = [];

    // Diversification
    if (fDiversification >= 75)
        strengths.push('Strong diversification across multiple financial categories.');
    else if (fDiversification >= 50)
        improvements.push('Diversify further — try adding both safe instruments (FD, savings) and growth instruments (SIP, equity).');
    else
        improvements.push('Diversification is weak. Include concepts from at least 3 financial areas: safety, growth, and planning.');

    // Risk Balance
    if (fRiskBalance >= 70)
        strengths.push('Risk and safety are well balanced across your strategy.');
    else if (fRiskBalance >= 40)
        improvements.push('Improve risk balance — your strategy leans too heavily on one side. Add both safe and growth options.');
    else
        improvements.push('Risk balance is poor. Pair every growth instrument (stocks, SIP) with a safety instrument (FD, emergency fund).');

    // Emergency Safety
    if (fEmergencySafety === 100)
        strengths.push('Emergency safety net is present — good financial hygiene.');
    else
        improvements.push('No emergency buffer detected. Add an Emergency Fund or Reserve node to protect your strategy.');

    // Timeline
    if (fTimeline === 100)
        strengths.push('Time horizons are referenced — your strategy has temporal structure.');
    else
        improvements.push('No timeline detected. Add short-term, long-term, or monthly goal nodes to give your plan a time dimension.');

    // Complexity
    if (fComplexity >= 70)
        strengths.push('Strategy is well-structured with good node coverage and connections.');
    else if (strategyNodes.length < 5)
        improvements.push('Strategy is thin. Add more nodes and link them to show how decisions relate to outcomes.');
    else
        improvements.push('Connect your nodes more — edges between decisions and outcomes improve strategy clarity.');

    // Topic penalty message
    if (penalty > 0) {
        const topicNames = { investing: 'investment instruments', budgeting: 'budget/planning nodes', saving: 'saving instruments', debt: 'debt repayment nodes' };
        improvements.push(`Strategy is missing ${topicNames[topicKey] || 'topic-relevant'} nodes for this challenge.`);
    }

    const feedback = [
        strengths.length    ? `Strengths: ${strengths.join(' ')}` : '',
        improvements.length ? `Improve: ${improvements.join(' ')}` : ''
    ].filter(Boolean).join(' | ');

    return {
        score,
        notEnoughNodes: false,
        feedback,
        metrics: {
            diversification:  Math.round(fDiversification),
            riskBalance:      Math.round(fRiskBalance),
            emergencySafety:  Math.round(fEmergencySafety),
            timeline:         Math.round(fTimeline),
            complexity:       Math.round(fComplexity)
        }
    };
}
