import * as React from 'react';

export function BrandMark({
  className,
  title = 'OTISUD',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {/* Outer ring */}
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="var(--otilink-sage)"
        strokeWidth="6"
        opacity="0.95"
      />

      {/* Dentelles (3 small lace shapes) */}
      <g fill="var(--otilink-sage)" opacity="0.95" transform="translate(0,2)">
        <path d="M38 18c4 0 6 2 6 6 0 2-1 3-2 4 2 1 3 3 3 5 0 4-3 7-7 7s-7-3-7-7c0-2 1-4 3-5-1-1-2-2-2-4 0-4 2-6 6-6zm0 6c-1 0-2 1-2 2s1 2 2 2 2-1 2-2-1-2-2-2z" />
        <path d="M60 18c4 0 6 2 6 6 0 2-1 3-2 4 2 1 3 3 3 5 0 4-3 7-7 7s-7-3-7-7c0-2 1-4 3-5-1-1-2-2-2-4 0-4 2-6 6-6zm0 6c-1 0-2 1-2 2s1 2 2 2 2-1 2-2-1-2-2-2z" />
        <path d="M82 18c4 0 6 2 6 6 0 2-1 3-2 4 2 1 3 3 3 5 0 4-3 7-7 7s-7-3-7-7c0-2 1-4 3-5-1-1-2-2-2-4 0-4 2-6 6-6zm0 6c-1 0-2 1-2 2s1 2 2 2 2-1 2-2-1-2-2-2z" />
      </g>

      {/* Volcano */}
      <path
        d="M28 66c10-10 19-18 32-22 13 4 22 12 32 22 2 2 3 4 3 6 0 5-4 8-10 8H35c-6 0-10-3-10-8 0-2 1-4 3-6z"
        fill="var(--otilink-volcan)"
      />

      {/* Small curry accent (sprout) */}
      <path
        d="M60 34c5 1 10 6 10 10-4-2-8-3-10-3-2 0-6 1-10 3 0-4 5-9 10-10z"
        fill="var(--otilink-curry)"
      />

      {/* Water lines */}
      <path
        d="M30 80c10 6 20 6 30 0 10 6 20 6 30 0"
        fill="none"
        stroke="var(--otilink-teal)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M32 92c9 5 18 5 28 0 10 5 19 5 28 0"
        fill="none"
        stroke="var(--otilink-teal)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

