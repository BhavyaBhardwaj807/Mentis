import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, PerspectiveCamera, Float, Line } from '@react-three/drei';
import * as THREE from 'three';

function ConnectingLines() {
    const lineRef = useRef();

    // Create static horizontal guide lines that span the width
    const lines = useMemo(() => {
        const l = [];
        for (let i = 0; i < 6; i++) {
            const y = (i - 3) * 4;
            l.push([[-30, y, -5], [30, y, -5]]); // Wide background guides
        }
        return l;
    }, []);

    return (
        <group>
            {lines.map((pts, i) => (
                <Line
                    key={i}
                    points={pts}
                    color="#000000"
                    lineWidth={0.5}
                    transparent
                    opacity={0.03}
                />
            ))}
        </group>
    );
}

function ClusterEdges({ positions }) {
    const linePositions = useMemo(() => {
        const l = [];
        // Draw lines between consecutive module centers to create a "spine"
        for (let i = 0; i < positions.length - 1; i++) {
            l.push([positions[i], positions[i + 1]]);
        }
        // Cross connections
        l.push([positions[0], positions[positions.length - 1]]);
        return l;
    }, [positions]);

    return (
        <group>
            {linePositions.map((pts, i) => (
                <Line
                    key={i}
                    points={pts}
                    color="#000000"
                    lineWidth={1}
                    transparent
                    opacity={0.1}
                />
            ))}
        </group>
    );
}

function DataStreamer({ start, end, speed = 1, delay = 0, isThinking }) {
    const meshRef = useRef();
    const [curve] = useState(() => {
        const s = new THREE.Vector3(...start);
        const e = new THREE.Vector3(...end);
        // Create a slight arc for more dynamic movement
        const mid = s.clone().lerp(e, 0.5).add(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ));
        return new THREE.QuadraticBezierCurve3(s, mid, e);
    });

    useFrame((state) => {
        const t = (state.clock.getElapsedTime() * (isThinking ? speed * 2 : speed) + delay) % 1;
        if (meshRef.current) {
            curve.getPoint(t, meshRef.current.position);
            meshRef.current.material.opacity = Math.sin(t * Math.PI) * (isThinking ? 0.8 : 0.4);
            meshRef.current.scale.setScalar(isThinking ? 1.5 : 1);
        }
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#000000" transparent opacity={0} />
        </mesh>
    );
}

function GrowingConnection({ start, end, isThinking, delay = 0 }) {
    const lineRef = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        const progress = Math.min(1, (time - delay) * 0.5);
        if (lineRef.current) {
            lineRef.current.material.opacity = progress * (isThinking ? 0.25 : 0.1);
        }
    });

    return (
        <Line
            ref={lineRef}
            points={[start, end]}
            color="#000000"
            lineWidth={isThinking ? 1.5 : 0.8}
            transparent
            opacity={0}
        />
    );
}

function KineticNode({ position, isThinking, delay = 0, isOrigin = false }) {
    const groupRef = useRef();
    const innerRef = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        const speed = isThinking ? 4 : 1;

        if (groupRef.current) {
            // Strictly sequential formation
            const growthProgress = Math.max(0, Math.min(1, (time - delay) * 1.5));
            groupRef.current.scale.setScalar(growthProgress * (1 + Math.sin((time + delay) * (isThinking ? 4 : 1)) * 0.05));

            groupRef.current.rotation.y = time * (isOrigin ? 0.3 : speed);
            groupRef.current.rotation.z = time * (isOrigin ? 0.2 : speed * 0.4);
        }
    });

    return (
        <group ref={groupRef} position={position} scale={0}>
            {/* Structural Core: Low-poly Octahedron */}
            <mesh ref={innerRef}>
                <octahedronGeometry args={[isOrigin ? 0.35 : 0.22, 0]} />
                <meshBasicMaterial
                    color="#000000"
                    wireframe
                    transparent
                    opacity={isOrigin ? 0.8 : 0.4}
                />
            </mesh>
            {/* Outer Brutalist Frame (Icosahedron) */}
            <mesh>
                <icosahedronGeometry args={[isOrigin ? 0.6 : 0.45, 1]} />
                <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={isOrigin ? 0.12 : 0.05}
                    wireframe
                />
            </mesh>
        </group>
    );
}

const BrutalistScaffold = ({ isThinking }) => {
    const nodePositions = useMemo(() => [
        [0, 0, 0], [4, 3, -4], [-3, -4, 2], [6, -2, 3],
        [-6, 2, -5], [2, 6, -2], [-5, 5, 4], [3, -6, -3],
        [9, 1, -2], [-9, -2, 1], [0, -8, 2], [0, 8, -2],
        [5, 5, 5], [-5, -5, -5], [12, 4, 0], [-12, -4, 0]
    ], []);

    // Calculate hierarchical "Branching" sequential delays
    const nodeMetadata = useMemo(() => {
        // Build graph adjacency
        const adj = Array.from({ length: nodePositions.length }, () => []);
        const conns = [];
        for (let i = 0; i < nodePositions.length; i++) {
            for (let j = i + 1; j < nodePositions.length; j++) {
                const d = new THREE.Vector3(...nodePositions[i]).distanceTo(new THREE.Vector3(...nodePositions[j]));
                if (d < 10) {
                    conns.push({ start: nodePositions[i], end: nodePositions[j], i, j });
                    adj[i].push(j);
                    adj[j].push(i);
                }
            }
        }

        // BFS Discovery Order for "Tree-like" building
        const discoveryOrder = [];
        const visited = new Set();
        const queue = [0];
        visited.add(0);

        while (queue.length > 0) {
            // Shuffle queue slightly for organic variety but keep it topological
            const curr = queue.shift();
            discoveryOrder.push(curr);

            // Get neighbors and shuffle them
            const neighbors = adj[curr].filter(n => !visited.has(n));
            for (let i = neighbors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
            }

            neighbors.forEach(n => {
                visited.add(n);
                queue.push(n);
            });
        }

        // Map Discovery index to delay
        const nodeDelays = new Array(nodePositions.length).fill(100); // Default far out
        discoveryOrder.forEach((nodeIdx, orderIdx) => {
            nodeDelays[nodeIdx] = orderIdx * 1.2; // One node every 1.2s for slow organic build
        });

        return { nodeDelays, conns };
    }, [nodePositions]);

    return (
        <group position={[6, 0, 0]}>
            <ConnectingLines />

            {nodeMetadata.conns.map((c, i) => {
                const startDelay = Math.max(nodeMetadata.nodeDelays[c.i], nodeMetadata.nodeDelays[c.j]);
                return (
                    <group key={i}>
                        <GrowingConnection
                            start={c.start}
                            end={c.end}
                            isThinking={isThinking}
                            delay={startDelay}
                        />
                        {isThinking && (
                            <>
                                <DataStreamer start={c.start} end={c.end} speed={1.2} delay={startDelay + 0.3} isThinking={true} />
                                <DataStreamer start={c.end} end={c.start} speed={0.9} delay={startDelay + 0.6} isThinking={true} />
                            </>
                        )}
                    </group>
                );
            })}

            {nodePositions.map((pos, i) => (
                <KineticNode
                    key={i}
                    position={pos}
                    isThinking={isThinking}
                    delay={nodeMetadata.nodeDelays[i]}
                    isOrigin={i === 0}
                />
            ))}

            <Float speed={isThinking ? 6 : 2} rotationIntensity={0.5} floatIntensity={1}>
                <Points positions={new Float32Array(3000).map(() => (Math.random() - 0.5) * 25)} stride={3}>
                    <PointMaterial
                        transparent
                        color="#000000"
                        size={0.015}
                        sizeAttenuation={true}
                        depthWrite={false}
                        opacity={isThinking ? 0.35 : 0.12}
                    />
                </Points>
            </Float>
        </group>
    );
}

const Canvas3D = ({ isThinking }) => {
    return (
        <div className="canvas-container" style={{
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 1,
            pointerEvents: 'none'
        }}>
            <Canvas alpha={true}>
                <PerspectiveCamera makeDefault position={[0, 0, 18]} fov={50} />
                <BrutalistScaffold isThinking={isThinking} />
            </Canvas>
        </div>
    );
};

export default Canvas3D;
