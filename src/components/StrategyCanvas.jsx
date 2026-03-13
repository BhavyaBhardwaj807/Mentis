import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, Handle, MarkerType, Position } from 'reactflow';
import 'reactflow/dist/style.css';

const X_SPACING = 260;
const Y_SPACING = 180;
const OFFSET_X = 140;
const OFFSET_Y = 100;

const normalizeId = (value) => String(value ?? '').trim();

const toClassToken = (value, fallback = 'unknown') => {
    const token = String(value ?? fallback)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return token || fallback;
};

const FinanceNode = ({ data }) => {
    const importance = toClassToken(data?.importance || 'normal', 'normal');
    const conceptType = toClassToken(data?.conceptType || 'concept', 'concept');
    const shape = toClassToken(data?.shape || 'rounded', 'rounded');
    const customClass = toClassToken(data?.customClass || '', '');

    const classNames = [
        'finance-node-box',
        `importance-${importance}`,
        `concept-${conceptType}`,
        `shape-${shape}`,
        customClass,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classNames}>
            <Handle type="target" position={Position.Top} />
            <div className="finance-node-content">
                {data?.icon ? <span className="finance-node-icon">{data.icon}</span> : null}
                <span className="finance-node-label">{data?.label || 'Untitled'}</span>
            </div>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

const getNodeStyle = (node) => {
    const base = {
        fontWeight: 500,
        fontSize: 12,
        minWidth: 180,
        padding: '10px 14px',
        whiteSpace: 'normal',
        lineHeight: 1.25,
    };

    if (node.importance === 'core') {
        return { ...base, minWidth: 210 };
    }
    if (node.importance === 'leaf') {
        return { ...base, minWidth: 180 };
    }
    return { ...base, minWidth: 190 };
};

const buildPositions = (nodes = [], edges = []) => {
    const positions = new Map();
    const roots = nodes.filter((n) => !edges.some((e) => e.target === n.id));

    roots.forEach((node, i) => {
        positions.set(node.id, {
            x: OFFSET_X + i * X_SPACING,
            y: OFFSET_Y,
        });
    });

    let changed = true;
    let iterations = 0;
    while (changed && iterations < nodes.length * 2) {
        changed = false;
        nodes.forEach((node) => {
            if (positions.has(node.id)) return;

            const parentEdge = edges.find((e) => e.target === node.id);
            const parentId = parentEdge?.source;
            if (!parentId || !positions.has(parentId)) return;

            const siblings = edges.filter((e) => e.source === parentId);
            const siblingIndex = siblings.findIndex((e) => e.target === node.id);
            const parentPos = positions.get(parentId);

            positions.set(node.id, {
                x: Math.max(40, parentPos.x + (siblingIndex - (siblings.length - 1) / 2) * X_SPACING),
                y: Math.max(40, parentPos.y + Y_SPACING),
            });
            changed = true;
        });
        iterations++;
    }

    let fallback = 0;
    nodes.forEach((node) => {
        if (!positions.has(node.id)) {
            positions.set(node.id, {
                x: OFFSET_X + (fallback % 4) * X_SPACING,
                y: OFFSET_Y + Math.floor(fallback / 4) * Y_SPACING,
            });
            fallback++;
        }
    });

    return positions;
};

const convertNodes = (aiNodes = [], aiEdges = []) => {
    const normalizedNodes = aiNodes
        .map((node) => ({ ...node, id: normalizeId(node.id) }))
        .filter((node) => node.id);
    const normalizedEdges = aiEdges.map((edge) => ({
        ...edge,
        source: normalizeId(edge.source),
        target: normalizeId(edge.target),
    }));

    const positions = buildPositions(normalizedNodes, normalizedEdges);
    return normalizedNodes.map((node) => ({
        id: node.id,
        position: positions.get(node.id) || { x: 0, y: 0 },
        data: {
            label: node.label || 'Untitled',
            importance: node.importance || 'normal',
            conceptType: node.type || node.category || 'concept',
            shape: node.shape || (node.importance === 'leaf' ? 'pill' : 'rounded'),
            icon: node.icon || (node.importance === 'core' ? '★' : ''),
            customClass: node.styleClass || '',
        },
        type: 'finance',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        className: 'finance-node',
        style: getNodeStyle(node),
    }));
};

const convertEdges = (aiEdges = [], validNodeIds = new Set()) => {
    const uniqueEdges = new Map();

    aiEdges.forEach((edge) => {
        const source = normalizeId(edge.source);
        const target = normalizeId(edge.target);
        if (!source || !target) return;
        if (validNodeIds.size > 0 && (!validNodeIds.has(source) || !validNodeIds.has(target))) return;

        const dedupeKey = `${source}-${target}`;
        if (!uniqueEdges.has(dedupeKey)) {
            uniqueEdges.set(dedupeKey, { ...edge, source, target });
        }
    });

    return Array.from(uniqueEdges.values()).map((edge, index) => ({
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.label || undefined,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        style: { stroke: 'rgba(0,0,0,0.55)', strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fontWeight: 700, fill: '#222' },
    }));
};

const StrategyCanvas = ({ graphData }) => {
    const nodes = useMemo(() => convertNodes(graphData?.nodes || [], graphData?.edges || []), [graphData?.nodes, graphData?.edges]);
    const edges = useMemo(() => {
        const validNodeIds = new Set(nodes.map((node) => node.id));
        return convertEdges(graphData?.edges || [], validNodeIds);
    }, [graphData?.edges, nodes]);
    const nodeTypes = useMemo(() => ({ finance: FinanceNode }), []);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={2}
                attributionPosition="bottom-right"
                defaultEdgeOptions={{ type: 'smoothstep' }}
            >
                <Background gap={24} size={1} color="rgba(0,0,0,0.08)" />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
};

export default StrategyCanvas;
