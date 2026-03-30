"use client";

/**
 * Pure-CSS confetti burst for reading goal completion.
 * Particles are hardcoded (not random) to avoid SSR/hydration mismatches.
 * Each particle's trajectory is driven by CSS custom properties so the
 * animation runs entirely on the GPU compositor thread — zero TBT impact.
 */

type Particle = {
  x: string;   // starting offset from container center
  y: string;
  dx: string;  // travel distance
  dy: string;
  dr: string;  // rotation
  color: string;
  delay: string;
  w: string;
  h: string;
};

const PARTICLES: Particle[] = [
  { x: '-4px',  y: '0px',  dx: '-70px', dy: '-55px', dr: '-140deg', color: '#f59e0b', delay: '0ms',   w: '8px',  h: '6px'  },
  { x: '0px',   y: '-2px', dx: '10px',  dy: '-72px', dr:  '100deg', color: '#ef4444', delay: '40ms',  w: '6px',  h: '8px'  },
  { x: '4px',   y: '0px',  dx: '72px',  dy: '-48px', dr:  '210deg', color: '#10b981', delay: '70ms',  w: '7px',  h: '5px'  },
  { x: '-2px',  y: '2px',  dx: '-50px', dy: '52px',  dr: '-90deg',  color: '#3b82f6', delay: '20ms',  w: '5px',  h: '9px'  },
  { x: '2px',   y: '2px',  dx: '55px',  dy: '58px',  dr:  '170deg', color: '#8b5cf6', delay: '55ms',  w: '8px',  h: '5px'  },
  { x: '-6px',  y: '-1px', dx: '-80px', dy: '-20px', dr: '-200deg', color: '#f59e0b', delay: '90ms',  w: '5px',  h: '7px'  },
  { x: '6px',   y: '-1px', dx: '80px',  dy: '-22px', dr:  '180deg', color: '#ef4444', delay: '30ms',  w: '6px',  h: '6px'  },
  { x: '-3px',  y: '3px',  dx: '-30px', dy: '68px',  dr: '-120deg', color: '#10b981', delay: '60ms',  w: '9px',  h: '5px'  },
  { x: '3px',   y: '3px',  dx: '35px',  dy: '70px',  dr:  '240deg', color: '#3b82f6', delay: '15ms',  w: '5px',  h: '8px'  },
  { x: '0px',   y: '4px',  dx: '-10px', dy: '75px',  dr: '-160deg', color: '#8b5cf6', delay: '80ms',  w: '7px',  h: '6px'  },
  { x: '-5px',  y: '-3px', dx: '-55px', dy: '-65px', dr:  '130deg', color: '#f59e0b', delay: '45ms',  w: '6px',  h: '9px'  },
  { x: '5px',   y: '-3px', dx: '60px',  dy: '-60px', dr: '-220deg', color: '#ef4444', delay: '100ms', w: '8px',  h: '5px'  },
];

export function GoalConfetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="confetti-particle"
          style={{
            '--x': p.x,
            '--y': p.y,
            '--dx': p.dx,
            '--dy': p.dy,
            '--dr': p.dr,
            backgroundColor: p.color,
            width: p.w,
            height: p.h,
            top: '50%',
            left: '50%',
            animationDelay: p.delay,
          } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
