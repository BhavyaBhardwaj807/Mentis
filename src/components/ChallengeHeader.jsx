import React from 'react';
import './ChallengeHeader.css';

const ChallengeHeader = ({ challenge, topicLabel, levelLabel }) => {
    if (!challenge) {
        return (
            <div className="challenge-header-strip">
                <div className="challenge-header-meta">Challenge Mode</div>
                <h3>Select a topic to begin your first mission</h3>
                <p>Pick a financial topic, start a challenge, and build your strategy on the board.</p>
            </div>
        );
    }

    return (
        <div className="challenge-header-strip">
            <div className="challenge-header-row">
                <span className="challenge-chip">{topicLabel || 'Finance'}</span>
                <span className="challenge-chip muted">{levelLabel || 'Beginner'}</span>
            </div>
            <h3>Challenge: {challenge.title}</h3>
            <p>Goal: {challenge.prompt}</p>
        </div>
    );
};

export default ChallengeHeader;
