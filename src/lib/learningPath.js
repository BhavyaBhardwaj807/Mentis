export const LEARNING_LEVELS = [
    { key: 'level1', number: 1, title: 'Starter Island' },
    { key: 'level2', number: 2, title: 'Savings Cove' },
    { key: 'level3', number: 3, title: 'Investment Reef' },
    { key: 'level4', number: 4, title: 'Strategy Harbor' },
    { key: 'level5', number: 5, title: 'Treasure Island' }
];

export const LEARNING_TOPICS = [
    { key: 'budgeting', label: 'Budgeting' },
    { key: 'saving', label: 'Saving' },
    { key: 'investing', label: 'Investing' },
    { key: 'debt', label: 'Debt Management' }
];

const challengeMatrix = {
    level1: {
        budgeting: { id: 'l1-budgeting', title: 'Foundation Budget', prompt: 'Create a monthly budget for INR 30,000 income with needs, wants, and savings buckets.' },
        saving: { id: 'l1-saving', title: 'Starter Savings Plan', prompt: 'Build a savings strategy to create a 3 month emergency reserve.' },
        investing: { id: 'l1-investing', title: 'First INR 10,000 Plan', prompt: 'You have INR 10,000. Build a balanced one-year growth strategy.' },
        debt: { id: 'l1-debt', title: 'Debt Basics', prompt: 'Create a plan to manage one credit card debt while still saving monthly.' }
    },
    level2: {
        budgeting: { id: 'l2-budgeting', title: 'Variable Expense Budget', prompt: 'Build a resilient budget when utility and transport costs fluctuate each month.' },
        saving: { id: 'l2-saving', title: 'Dual Savings Goals', prompt: 'Plan savings for both emergency fund and a travel goal in 12 months.' },
        investing: { id: 'l2-investing', title: 'INR 50,000 Allocation', prompt: 'Build a diversified investment strategy for INR 50,000 with risk control.' },
        debt: { id: 'l2-debt', title: 'Debt Snowball Plan', prompt: 'Design a debt snowball strategy across two loans with different balances.' }
    },
    level3: {
        budgeting: { id: 'l3-budgeting', title: 'Goal-Based Budgeting', prompt: 'Create a budget that funds short-term and long-term goals at the same time.' },
        saving: { id: 'l3-saving', title: 'Income Shock Buffer', prompt: 'Build a saving strategy that can handle a 20 percent temporary salary cut.' },
        investing: { id: 'l3-investing', title: 'Core Portfolio Mix', prompt: 'Design a beginner portfolio mix across equity, debt, and cash allocations.' },
        debt: { id: 'l3-debt', title: 'Interest Reduction Plan', prompt: 'Create a strategy to reduce total interest burden while keeping liquidity.' }
    },
    level4: {
        budgeting: { id: 'l4-budgeting', title: 'Family Strategy Budget', prompt: 'Build a budgeting strategy for a family balancing education, rent, and savings goals.' },
        saving: { id: 'l4-saving', title: 'Milestone Savings Ladder', prompt: 'Create milestone-based savings for 6, 12, and 24 month goals.' },
        investing: { id: 'l4-investing', title: 'Scenario Investing', prompt: 'Build an investment strategy with best-case and worst-case scenario adjustments.' },
        debt: { id: 'l4-debt', title: 'Debt + Investment Balance', prompt: 'Create a plan that repays debt while still investing each month.' }
    },
    level5: {
        budgeting: { id: 'l5-budgeting', title: 'Master Allocation Model', prompt: 'Design an advanced budget model with tax, insurance, and investment allocations.' },
        saving: { id: 'l5-saving', title: 'Liquidity Master Plan', prompt: 'Build a long-term liquidity strategy with tiered emergency and opportunity funds.' },
        investing: { id: 'l5-investing', title: 'Financial Master Portfolio', prompt: 'Design a complete portfolio strategy with diversification and risk balancing rules.' },
        debt: { id: 'l5-debt', title: 'Debt-Free Mastery Path', prompt: 'Create a debt elimination roadmap with financial resilience safeguards.' }
    }
};

export function createInitialLearningProgress() {
    return LEARNING_LEVELS.reduce((acc, level) => {
        acc[level.key] = LEARNING_TOPICS.reduce((topicAcc, topic) => {
            topicAcc[topic.key] = false;
            return topicAcc;
        }, {});
        return acc;
    }, {});
}

export function isLevelComplete(progress, levelKey) {
    const levelProgress = progress?.[levelKey];
    if (!levelProgress) return false;
    return Object.values(levelProgress).every(Boolean);
}

export function isLevelUnlocked(progress, levelIndex) {
    if (levelIndex === 0) return true;
    const prevLevel = LEARNING_LEVELS[levelIndex - 1];
    return isLevelComplete(progress, prevLevel.key);
}

export function getLevelCompletionPercent(progress, levelKey) {
    const levelProgress = progress?.[levelKey] || {};
    const total = LEARNING_TOPICS.length;
    const done = Object.values(levelProgress).filter(Boolean).length;
    return Math.round((done / total) * 100);
}

export function getChallengeByLevelTopic(levelKey, topicKey) {
    return challengeMatrix?.[levelKey]?.[topicKey] || null;
}
