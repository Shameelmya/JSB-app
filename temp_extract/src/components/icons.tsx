import type { SVGProps } from "react";

export function BankIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 21 18 0" />
      <path d="M5 21V5c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v16" />
      <path d="M12 16c-2.8 0-5-2.2-5-5V7c0-.5.4-1 1-1h8c.6 0 1 .5 1 1v4c0 2.8-2.2 5-5 5Z" />
      <path d="M8 7h8" />
      <path d="M12 3v4" />
    </svg>
  );
}

export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M16.75 13.96c.25.13.43.2.5.33.07.13.07.55-.02.93-.1.38-.6.75-1.05.96-.45.2-1.08.3-1.6.14-.53-.15-1.28-.5-2.3-1.13-1.25-.75-2.2-1.62-2.9-2.6-1.04-1.46-1.54-2.9-1.53-3.3.01-.4.4-.6.7-.86.3-.25.54-.3.7-.3.17 0 .34.02.48.05.14.04.2.06.3.25.1.2.14.44.2.65.05.2.04.34-.02.5-.07.15-.17.25-.3.4-.14.14-.24.25-.3.32-.07.07-.12.13-.1.22.02.1.2.36.52.75.45.54.8.9 1.12 1.18.3.25.53.42.7.5.2.07.3.06.4-.04.1-.1.25-.28.38-.45.1-.15.24-.22.4-.16.17.06.9.43 1.05.5.15.07.25.1.28.16.03.04.03.2 0 .3-.04.1-.2.2-.3.26zM12 2a10 10 0 0 0-10 10c0 5.52 4.48 10 10 10a10 10 0 0 0 10-10c0-5.52-4.48-10-10-10zm0 18.2c-4.5 0-8.2-3.7-8.2-8.2S7.5 3.8 12 3.8s8.2 3.7 8.2 8.2-3.7 8.2-8.2 8.2z" />
    </svg>
  );
}
