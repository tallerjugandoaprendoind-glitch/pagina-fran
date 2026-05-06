import { cn } from '@/lib/utils'

/**
 * Capybara SVG saludando — versión cartoon profesional.
 * El brazo se mueve con la animación `capy-arm-wave` definida en globals.css.
 */
export function CapyWavingSVG({ className, size = 500 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-label="Capy saludando"
      role="img"
    >
      <defs>
        <linearGradient id="bodyG" x1="30%" y1="20%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#D4A06F" />
          <stop offset="100%" stopColor="#9B7148" />
        </linearGradient>
        <linearGradient id="headG" x1="30%" y1="20%" x2="70%" y2="80%">
          <stop offset="0%" stopColor="#D8A470" />
          <stop offset="100%" stopColor="#A17849" />
        </linearGradient>
        <linearGradient id="hatG" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3A3A3A" />
          <stop offset="100%" stopColor="#151515" />
        </linearGradient>
      </defs>

      {/* Sombra suelo */}
      <ellipse cx="250" cy="478" rx="145" ry="10" fill="#000" opacity="0.1" />

      {/* CUERPO panzón */}
      <path
        d="M 135 395 C 135 310, 170 270, 250 270 C 330 270, 365 310, 365 395 C 365 450, 310 475, 250 475 C 190 475, 135 450, 135 395 Z"
        fill="url(#bodyG)"
        stroke="#7D6547"
        strokeWidth="3"
      />

      {/* Patitas delanteras */}
      <ellipse cx="200" cy="468" rx="32" ry="14" fill="#7A5F3B" stroke="#5A4527" strokeWidth="2" />
      <ellipse cx="300" cy="468" rx="32" ry="14" fill="#7A5F3B" stroke="#5A4527" strokeWidth="2" />

      {/* Pata izquierda recogida */}
      <ellipse cx="155" cy="380" rx="26" ry="50" fill="url(#bodyG)" stroke="#7D6547" strokeWidth="2.5" />

      {/* BRAZO DERECHO SALUDANDO - con animación */}
      <g
        style={{
          transformOrigin: '340px 340px',
          animation: 'capyArmWave 2.2s ease-in-out infinite',
        }}
      >
        <path
          d="M 340 340 Q 395 250 430 155"
          stroke="#6B5338"
          strokeWidth="46"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 340 340 Q 395 250 430 155"
          stroke="#B58A5A"
          strokeWidth="38"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 345 335 Q 395 250 428 160"
          stroke="#D4A679"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />

        {/* Mano */}
        <g transform="translate(430 155)">
          <circle r="34" fill="#C89968" stroke="#7D6547" strokeWidth="3" />
          <ellipse cx="-20" cy="-22" rx="8" ry="18" fill="#C89968" stroke="#7D6547" strokeWidth="2" transform="rotate(-25)" />
          <ellipse cx="-7" cy="-30" rx="8" ry="19" fill="#C89968" stroke="#7D6547" strokeWidth="2" transform="rotate(-8)" />
          <ellipse cx="8" cy="-30" rx="8" ry="19" fill="#C89968" stroke="#7D6547" strokeWidth="2" transform="rotate(8)" />
          <ellipse cx="22" cy="-22" rx="8" ry="18" fill="#C89968" stroke="#7D6547" strokeWidth="2" transform="rotate(25)" />
          <ellipse cx="-28" cy="5" rx="9" ry="14" fill="#C89968" stroke="#7D6547" strokeWidth="2" transform="rotate(-65)" />
          <path d="M -15 5 Q 0 15 15 5" stroke="#A17D4E" strokeWidth="1.5" fill="none" opacity="0.5" />
        </g>
      </g>

      {/* CABEZA ANCHA */}
      <path
        d="M 140 175 C 140 120, 180 95, 250 95 C 320 95, 360 120, 360 175 C 365 240, 330 285, 250 285 C 170 285, 135 240, 140 175 Z"
        fill="url(#headG)"
        stroke="#7D6547"
        strokeWidth="3"
      />

      {/* Hocico claro */}
      <ellipse cx="250" cy="235" rx="78" ry="38" fill="#E8C8A5" opacity="0.7" />

      {/* Orejas */}
      <g>
        <ellipse cx="165" cy="118" rx="16" ry="18" fill="#7A5F3B" stroke="#5A4527" strokeWidth="2.5" transform="rotate(-25 165 118)" />
        <ellipse cx="166" cy="122" rx="8" ry="11" fill="#E8C8A5" transform="rotate(-25 166 122)" />
        <ellipse cx="335" cy="118" rx="16" ry="18" fill="#7A5F3B" stroke="#5A4527" strokeWidth="2.5" transform="rotate(25 335 118)" />
        <ellipse cx="334" cy="122" rx="8" ry="11" fill="#E8C8A5" transform="rotate(25 334 122)" />
      </g>

      {/* GORRO DE GRADUACIÓN */}
      <g>
        <ellipse cx="250" cy="80" rx="55" ry="18" fill="url(#hatG)" stroke="#000" strokeWidth="2" />
        <polygon points="165,58 335,58 355,82 145,82" fill="url(#hatG)" stroke="#000" strokeWidth="2" />
        <polygon points="145,82 355,82 335,100 165,100" fill="#0A0A0A" stroke="#000" strokeWidth="2" />
        <path d="M 250,68 Q 290,78 315,108" stroke="#E8B454" strokeWidth="2.5" fill="none" />
        <g transform="translate(315 112)">
          <circle r="8" fill="#F5C064" stroke="#C68D1A" strokeWidth="2" />
          <line x1="-5" y1="5" x2="-6" y2="16" stroke="#C68D1A" strokeWidth="1.8" />
          <line x1="0" y1="6" x2="0" y2="17" stroke="#C68D1A" strokeWidth="1.8" />
          <line x1="5" y1="5" x2="6" y2="16" stroke="#C68D1A" strokeWidth="1.8" />
        </g>
      </g>

      {/* OJOS */}
      <g>
        <circle cx="210" cy="180" r="16" fill="#FFFFFF" />
        <circle cx="213" cy="183" r="11" fill="#1A1A1A" />
        <circle cx="216" cy="179" r="4.5" fill="#FFFFFF" />
        <circle cx="212" cy="186" r="2" fill="#FFFFFF" opacity="0.7" />

        <circle cx="290" cy="180" r="16" fill="#FFFFFF" />
        <circle cx="293" cy="183" r="11" fill="#1A1A1A" />
        <circle cx="296" cy="179" r="4.5" fill="#FFFFFF" />
        <circle cx="292" cy="186" r="2" fill="#FFFFFF" opacity="0.7" />
      </g>

      {/* Mejillas sonrojadas */}
      <ellipse cx="175" cy="230" rx="14" ry="9" fill="#E89B7A" opacity="0.5" />
      <ellipse cx="325" cy="230" rx="14" ry="9" fill="#E89B7A" opacity="0.5" />

      {/* Nariz */}
      <ellipse cx="250" cy="232" rx="14" ry="9" fill="#1A1A1A" />
      <ellipse cx="246" cy="229" rx="3.5" ry="2.5" fill="#FFFFFF" opacity="0.5" />

      {/* Línea hocico */}
      <line x1="250" y1="243" x2="250" y2="258" stroke="#8B6F4A" strokeWidth="2" opacity="0.6" />

      {/* Boca */}
      <path
        d="M 232 258 Q 250 275 268 258"
        stroke="#1A1A1A"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Detalles pelaje */}
      <g stroke="#8B6F4A" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none">
        <path d="M 160 340 L 172 345" />
        <path d="M 155 370 L 170 372" />
        <path d="M 160 400 L 174 400" />
        <path d="M 340 340 L 328 345" />
        <path d="M 345 370 L 330 372" />
      </g>
    </svg>
  )
}
