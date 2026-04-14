import { cn } from '@/lib/utils';

export default function GateGuardLogo({ size = 84, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('select-none', className)}
      aria-label="GateGuard logo"
      role="img"
    >
      <circle cx="160" cy="160" r="146" stroke="#00AEEF" strokeWidth="6" />
      <circle cx="160" cy="160" r="102" stroke="#00AEEF" strokeWidth="5" opacity="0.95" />

      <g stroke="#00AEEF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M160 160 C122 128, 122 72, 160 58 C198 72, 198 128, 160 160" />
        <path d="M160 160 C198 128, 254 128, 268 160 C254 198, 198 198, 160 160" />
        <path d="M160 160 C198 198, 198 254, 160 268 C122 254, 122 198, 160 160" />
        <path d="M160 160 C122 198, 66 198, 52 160 C66 122, 122 122, 160 160" />

        <path d="M160 160 C134 130, 86 130, 74 160 C86 190, 134 190, 160 160" transform="rotate(-45 160 160)" />
        <path d="M160 160 C134 130, 86 130, 74 160 C86 190, 134 190, 160 160" transform="rotate(45 160 160)" />
      </g>

      <circle cx="160" cy="160" r="9" fill="#FF0033" />
      <circle cx="160" cy="84" r="6" fill="#FF0033" />
      <circle cx="236" cy="160" r="6" fill="#FF0033" />
      <circle cx="160" cy="236" r="6" fill="#FF0033" />
      <circle cx="84" cy="160" r="6" fill="#FF0033" />
      <circle cx="214" cy="106" r="6" fill="#FF0033" />
      <circle cx="214" cy="214" r="6" fill="#FF0033" />

      <g fill="#00AEEF" opacity="0.95">
        <path d="M120 287l3.1 6.3 7 1-5 4.8 1.2 6.8-6.3-3.3-6.3 3.3 1.2-6.8-5-4.8 7-1L120 287Z" />
        <path d="M140 289l2.8 5.6 6.2.9-4.5 4.3 1.1 6.1-5.6-2.9-5.6 2.9 1.1-6.1-4.5-4.3 6.2-.9L140 289Z" />
        <path d="M160 290l3.2 6.6 7.3 1.1-5.3 5 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.3-5 7.3-1.1L160 290Z" />
        <path d="M180 289l2.8 5.6 6.2.9-4.5 4.3 1.1 6.1-5.6-2.9-5.6 2.9 1.1-6.1-4.5-4.3 6.2-.9L180 289Z" />
        <path d="M200 287l3.1 6.3 7 1-5 4.8 1.2 6.8-6.3-3.3-6.3 3.3 1.2-6.8-5-4.8 7-1L200 287Z" />
      </g>
    </svg>
  );
}
