import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function Icon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

function Icon32({ size = 32, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function ClipboardTextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v2h6V3" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </Icon>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 22h12a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z" />
      <path d="M14 2v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </Icon>
  );
}

export function GraphIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 21h18" />
      <path d="M3 14l4-4 4 4 6-6" />
      <path d="M17 8h4v4" />
    </Icon>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-5" />
    </Icon>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36Z" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  );
}

export function ChatsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 6h-4V2l6 6v12a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h10Z" />
      <path d="M4 10H2v12a2 2 0 0 0 2 2h10v-4" />
    </Icon>
  );
}

export function CurrencyDollarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12" />
      <path d="M9 9c0-.72.41-1.38 1.05-1.72A2 2 0 0 1 12 7c1.55 0 2.5 1 2.5 2 0 1.5-2.5 1.5-2.5 3v1" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l3 3" />
    </Icon>
  );
}

export function TrendUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 17 9 9l4 4 6-7" />
      <path d="M14 6h6v6" />
    </Icon>
  );
}

export function ShieldWarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v4" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function BrainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 22c3.5 0 6-2.5 6-6v-4a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v4c0 3.5 2.5 6 6 6Z" />
      <path d="M10 6.5A3.5 3.5 0 0 1 13.5 3h0A3.5 3.5 0 0 1 17 6.5" />
      <path d="M14 6.5A3.5 3.5 0 0 1 10.5 3h0A3.5 3.5 0 0 1 7 6.5" />
      <path d="M9 14h1" />
      <path d="M14 14h1" />
    </Icon>
  );
}

export function FlaskIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 2h6" />
      <path d="M10 2v4.47a2 2 0 0 1-.37 1.17l-5.37 8.53A2 2 0 0 0 6 19.06h12a2 2 0 0 0 1.74-2.89l-5.37-8.53A2 2 0 0 1 14 6.47V2" />
    </Icon>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function HandHeartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6V2l-1.5 1.5L9 2v4" />
      <path d="M18 10c0-1.5-1.5-3-3-3h-2.08A3 3 0 0 0 10 5H6a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h8.5a3 3 0 0 0 2.9-2.21L19 11" />
      <path d="M12 22v-3" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </Icon>
  );
}

export function BabyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 12 5Z" />
      <path d="M9.5 6.5h5c2.5 0 4.5 2.2 4.5 4.9V15a7 7 0 0 1-7 7 7 7 0 0 1-7-7v-3.6c0-2.7 2-4.9 4.5-4.9Z" />
      <path d="M8 13v2" />
      <path d="M16 13v2" />
      <path d="M12 18v-2" />
    </Icon>
  );
}

export function HandshakeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m11 17 2 2a1 1 0 0 0 1.5-.1L20 13" />
      <path d="m13 5 2-2a1 1 0 0 1 1.5.1L22 8.5" />
      <path d="M2 8.5 5.5 3a1 1 0 0 1 1.5-.1L10 5.5" />
      <path d="M10 5.5 13 8l-1.5 1.5-3-3" />
      <path d="m13 8 3 3-1.5 1.5-3-3" />
      <path d="M16 11.5 22 8.5l-3 7.5-4-4" />
      <path d="m2 8.5 4 4-3.5 7.5L2 8.5Z" />
    </Icon>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12h4l2.5-6 4 12L16 12h5" />
    </Icon>
  );
}

export function SproutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 22v-8" />
      <path d="M12 14c0-4 3-7 8-7 0 4-3 7-8 7Z" />
      <path d="M12 11c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6Z" />
      <path d="M12 14v4" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18.5 14a6.5 6.5 0 0 1 3 6" />
    </Icon>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
  );
}

export function ArrowDownIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

export function SpinnerIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="animate-spin"
      {...props}
    >
      <path d="M12 2a10 10 0 1 0 10 10" />
    </svg>
  );
}
