import React from 'react';
import { motion } from 'framer-motion';
import {
  Brain, HelpCircle, CheckCircle2, Settings,
  Layers, Zap, Database, Leaf, Droplet,
  Signal, Cpu, Layout, Box, GitBranch
} from 'lucide-react';

const getIcon = (label = '', type) => {
  const lowLabel = (label || '').toLowerCase();
  if (lowLabel.includes('garden') || lowLabel.includes('plant') || lowLabel.includes('leaf') || lowLabel.includes('basil')) return Leaf;
  if (lowLabel.includes('water') || lowLabel.includes('tank') || lowLabel.includes('moisture')) return Droplet;
  if (lowLabel.includes('sensor') || lowLabel.includes('signal') || lowLabel.includes('wifi')) return Signal;
  if (lowLabel.includes('logic') || lowLabel.includes('algorithm') || lowLabel.includes('process')) return GitBranch;
  if (lowLabel.includes('system') || lowLabel.includes('frame') || lowLabel.includes('structure')) return Layers;
  if (lowLabel.includes('solar') || lowLabel.includes('battery') || lowLabel.includes('power')) return Zap;

  const typeIcons = {
    concept: Brain,
    component: Box,
    process: Cpu,
    item: Layout
  };
  return typeIcons[type] || Brain;
};

const SketchRenderer = ({ sketch }) => {
  if (!sketch || !Array.isArray(sketch)) return null;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '40px', height: '40px', opacity: 0.5, marginLeft: '0.5rem' }}>
      {sketch.map((shape, i) => {
        const shapeProps = {
          key: i,
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round"
        };
        if (shape.type === 'rect') return <rect {...shapeProps} x={shape.x} y={shape.y} width={shape.w} height={shape.h} />;
        if (shape.type === 'circle') return <circle {...shapeProps} cx={shape.cx} cy={shape.cy} r={shape.r} />;
        if (shape.type === 'line') return <line {...shapeProps} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />;
        return null;
      })}
    </svg>
  );
};

const ThoughtNode = ({ node, index }) => {
  const Icon = getIcon(node.label, node.type);

  const sizes = {
    core: { scale: 1, minWidth: '160px', padding: '0.6rem 1rem' },
    normal: { scale: 1, minWidth: '120px', padding: '0.4rem 0.8rem' },
    leaf: { scale: 1, minWidth: '100px', padding: '0.3rem 0.6rem' }
  };

  const currentSize = sizes[node.importance] || sizes.normal;

  return (
    <motion.div
      className="thought-node"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        scale: currentSize.scale,
        opacity: 1,
        y: [0, -2, 0]
      }}
      transition={{
        scale: { type: 'spring', stiffness: 400, damping: 25 },
        y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 }
      }}
      drag
      dragConstraints={{ left: 0, top: 0, right: 0, bottom: 0 }}
      style={{
        cursor: 'grab',
        zIndex: node.importance === 'core' ? 15 : 10
      }}
    >
      <div className={`node-inner ${node.type}`} style={{
        display: 'flex',
        alignItems: 'center',
        padding: currentSize.padding,
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '2rem',
        background: '#fff',
        color: '#000',
        minWidth: currentSize.minWidth,
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <Icon size={12} strokeWidth={2} style={{ opacity: 0.4 }} />
          <div className="node-content" style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em'
          }}>{node.label}</div>
        </div>

        {node.sketch && <SketchRenderer sketch={node.sketch} />}

        {node.importance === 'core' && (
          <div style={{ marginLeft: '0.5rem', width: 4, height: 4, borderRadius: '50%', background: '#000', opacity: 0.3 }} />
        )}
      </div>
    </motion.div>
  );
};

export default ThoughtNode;
