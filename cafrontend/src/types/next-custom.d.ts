// Custom type declarations for Next.js modules
import { ReactNode } from 'react';

declare module 'next/head' {
  export default function Head(props: { children: ReactNode }): JSX.Element;
}

declare module 'next/link' {
  export interface LinkProps {
    href: string | { pathname: string; query?: Record<string, string | number> };
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    legacyBehavior?: boolean;
    prefetch?: boolean;
    locale?: string | false;
    children: ReactNode;
  }

  export default function Link(props: LinkProps): JSX.Element;
}

declare module 'next/router' {
  export interface RouterProps {
    route: string;
    pathname: string;
    query: Record<string, string | string[]>;
    asPath: string;
    push(url: string, as?: string, options?: any): Promise<boolean>;
    replace(url: string, as?: string, options?: any): Promise<boolean>;
    reload(): void;
    back(): void;
    prefetch(url: string): Promise<void>;
    beforePopState(cb: (state: any) => boolean): void;
    events: {
      on(type: string, handler: (...args: any[]) => void): void;
      off(type: string, handler: (...args: any[]) => void): void;
      emit(type: string, ...args: any[]): void;
    };
    isFallback: boolean;
    isReady: boolean;
  }

  export function useRouter(): RouterProps;
}
