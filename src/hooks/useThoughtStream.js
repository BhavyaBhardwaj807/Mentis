import { useState, useCallback } from 'react';
import { processInput } from '../lib/gemini';

export function useThoughtStream() {
    const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
    const [isProcessing, setIsProcessing] = useState(false);

    const addThought = useCallback(async (text, images = []) => {
        setIsProcessing(true);
        try {
            const result = await processInput(text, images, graphData);
            if (result) {
                // Simple merge logic - in a real app, this would be more robust
                setGraphData(prev => ({
                    nodes: [...prev.nodes, ...result.nodes.filter(n => !prev.nodes.some(pn => pn.id === n.id))],
                    edges: [...prev.edges, ...result.edges]
                }));
            }
        } finally {
            setIsProcessing(false);
        }
    }, [graphData]);

    return { graphData, addThought, isProcessing };
}
