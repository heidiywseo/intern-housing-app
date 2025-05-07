import React from 'react';

const Swirly = () => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 0,
      overflow: 'hidden'
    }}>
      {/* bottom left */}
      <svg 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '800px',
          height: '500px',
          opacity: 0.2
        }}
        viewBox="0 0 330 170"
      >
        <path
          d="M -37 -27 C 31 167 58 55 92 129 Q 127 206 194 138 C 246 90 339 189 376 163"
          fill="none"
          stroke="#4E674A"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      
      {/* top right */}
      <svg 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '800px',
          height: '500px',
          opacity: 0.2
        }}
        viewBox="-5 20 180 160"
      >
        <path
          d="M -150 13 Q -61 48 -53 31 C -29 -26 -28 54 -1 36 C 41 7 39 46 85 62 C 160 80 131 17 123 39 C 120 70 140 90 170 94 C 248 109 100 150 136 174"
          fill="none"
          stroke="#6A8A66"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default Swirly;