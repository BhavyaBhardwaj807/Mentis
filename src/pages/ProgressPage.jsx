import React from 'react';
import { ArrowLeft, BookOpen, Compass, Lock, CheckCircle2, Circle } from 'lucide-react';
import {
    LEARNING_LEVELS,
    LEARNING_TOPICS,
    getChallengeByLevelTopic,
    getLevelCompletionPercent,
    isLevelComplete,
    isLevelUnlocked
} from '../lib/learningPath';
import './ProgressPage.css';

const getCurrentIslandKey = (progress) => {
    for (let i = 0; i < LEARNING_LEVELS.length; i++) {
        const level = LEARNING_LEVELS[i];
        const unlocked = isLevelUnlocked(progress, i);
        const completed = isLevelComplete(progress, level.key);
        if (unlocked && !completed) return level.key;
    }
    return LEARNING_LEVELS[LEARNING_LEVELS.length - 1].key;
};

const ISLAND_POSITIONS = [
    { top: 10, left: 12 },
    { top: 28, left: 64 },
    { top: 48, left: 22 },
    { top: 68, left: 68 },
    { top: 86, left: 34 }
];

const TopicStatusIcon = ({ completed, unlocked }) => {
    if (completed) return <CheckCircle2 size={15} />;
    if (unlocked) return <Circle size={15} />;
    return <Lock size={14} />;
};

const ProgressPage = ({ progress, onBack, onSelectChallenge }) => {
    const currentIslandKey = getCurrentIslandKey(progress);
    const [focusedIslandKey, setFocusedIslandKey] = React.useState(currentIslandKey);

    React.useEffect(() => {
        setFocusedIslandKey(currentIslandKey);
    }, [currentIslandKey]);

    const currentIslandIndex = LEARNING_LEVELS.findIndex((level) => level.key === currentIslandKey);
    const shipPos = ISLAND_POSITIONS[Math.max(0, currentIslandIndex)] || ISLAND_POSITIONS[0];
    const focusedIndex = LEARNING_LEVELS.findIndex((level) => level.key === focusedIslandKey);
    const focusedLevel = LEARNING_LEVELS[Math.max(0, focusedIndex)] || LEARNING_LEVELS[0];
    const focusedUnlocked = isLevelUnlocked(progress, Math.max(0, focusedIndex));
    const focusedCompleted = isLevelComplete(progress, focusedLevel.key);

    return (
        <div className="progress-page treasure-map-theme">
            <div className="progress-topbar">
                <button className="progress-back" onClick={onBack}><ArrowLeft size={18} /> Back</button>
                <div className="map-title-block">
                    <h1>Financial Treasure Map</h1>
                    <p>Sail through each island by completing Budgeting, Saving, Investing, and Debt challenges.</p>
                </div>
                <div className="compass-badge"><Compass size={18} /> Journey</div>
            </div>

            <div className="journey-canvas">
                <svg className="journey-route" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                        d="M 12 10 C 30 12, 48 18, 64 28 C 80 38, 44 40, 22 48 C 8 54, 46 62, 68 68 C 85 74, 58 82, 34 86"
                    />
                </svg>

                <div
                    className="map-ship"
                    style={{ top: `${shipPos.top - 5}%`, left: `${shipPos.left + 10}%` }}
                    title="Current Progress"
                >
                    ⛵
                </div>

                {LEARNING_LEVELS.map((level, levelIndex) => {
                    const unlocked = isLevelUnlocked(progress, levelIndex);
                    const percent = getLevelCompletionPercent(progress, level.key);
                    const completed = isLevelComplete(progress, level.key);
                    const isCurrent = currentIslandKey === level.key;
                    const isFocused = focusedIslandKey === level.key;
                    const islandPos = ISLAND_POSITIONS[levelIndex] || { top: 10 + levelIndex * 18, left: 12 };
                    const doneCount = LEARNING_TOPICS.filter((topic) => Boolean(progress?.[level.key]?.[topic.key])).length;

                    return (
                        <button
                            key={level.key}
                            type="button"
                            onClick={() => setFocusedIslandKey(level.key)}
                            className={`island-node ${unlocked ? 'unlocked' : 'locked'} ${completed ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFocused ? 'focused' : ''}`}
                            style={{ top: `${islandPos.top}%`, left: `${islandPos.left}%` }}
                        >
                            <div className="node-title-row">
                                <span className="node-island">🏝</span>
                                <span className="node-title">Island {level.number}: {level.title}</span>
                            </div>
                            <div className="node-meta">{doneCount}/4 complete • {percent}%</div>
                            <div className="node-status-row">
                                {LEARNING_TOPICS.map((topic) => {
                                    const done = Boolean(progress?.[level.key]?.[topic.key]);
                                    return <span key={`${level.key}-${topic.key}`} className={`mini-dot ${done ? 'done' : (unlocked ? 'open' : 'lock')}`} />;
                                })}
                            </div>
                        </button>
                    );
                })}
            </div>

            <section className="island-detail-panel">
                <div className="island-detail-head">
                    <h2>
                        <span>🏝</span>
                        Island {focusedLevel.number}: {focusedLevel.title}
                        {focusedCompleted && <span className="island-complete">💰</span>}
                    </h2>
                    <span className="level-percent">{getLevelCompletionPercent(progress, focusedLevel.key)}%</span>
                </div>

                <div className="island-subhead">
                    {focusedCompleted ? 'Island completed' : (focusedUnlocked ? 'Island available' : 'Island locked')}
                </div>

                <div className="level-progress-track">
                    <div className="level-progress-fill" style={{ width: `${getLevelCompletionPercent(progress, focusedLevel.key)}%` }} />
                </div>

                <div className="topic-list">
                    {LEARNING_TOPICS.map((topic) => {
                        const completed = Boolean(progress?.[focusedLevel.key]?.[topic.key]);
                        const available = focusedUnlocked;
                        const challenge = getChallengeByLevelTopic(focusedLevel.key, topic.key);

                        return (
                            <button
                                key={`${focusedLevel.key}-${topic.key}`}
                                className={`topic-item ${completed ? 'done' : ''} ${!available ? 'locked' : ''}`}
                                onClick={() => {
                                    if (!available || !challenge) return;
                                    onSelectChallenge({
                                        levelKey: focusedLevel.key,
                                        levelNumber: focusedLevel.number,
                                        levelTitle: focusedLevel.title,
                                        topicKey: topic.key,
                                        topicLabel: topic.label,
                                        challenge
                                    });
                                }}
                                disabled={!available}
                            >
                                <span className="topic-icon"><TopicStatusIcon completed={completed} unlocked={available} /></span>
                                <span className="topic-label">{topic.label}</span>
                                {available && challenge && <span className="topic-title"><BookOpen size={12} /> {challenge.title}</span>}
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="progress-legend">
                <span><CheckCircle2 size={14} /> Completed</span>
                <span><Circle size={14} /> Available</span>
                <span><Lock size={14} /> Locked</span>
            </div>
        </div>
    );
};

export default ProgressPage;
