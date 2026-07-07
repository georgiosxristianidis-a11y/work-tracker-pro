/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const Logo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="logo-clip">
        <rect x="5" y="5" width="90" height="90" rx="18" />
      </clipPath>
      <mask id="logo-mask">
        <rect x="0" y="0" width="100" height="100" fill="white" />
        <path d="M-10 25 L25 -10" stroke="black" strokeWidth="12" />
        <path d="M75 110 L110 75" stroke="black" strokeWidth="12" />
      </mask>
    </defs>
    
    <rect width="100" height="100" rx="18" fill="#15171e" />
    <rect x="5" y="5" width="90" height="90" rx="18" stroke="#f4f4f5" strokeWidth="10" mask="url(#logo-mask)" />
    
    <text x="50" y="53" fontFamily="Epilogue, sans-serif" fontSize="50" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fill="#f4f4f5">27</text>
    
    <g clipPath="url(#logo-clip)">
      <rect x="5" y="90" width="90" height="10" fill="#d4af37"/>
    </g>
  </svg>
);
