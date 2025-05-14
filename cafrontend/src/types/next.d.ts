// Type declarations for Next.js modules
import { ComponentType, ReactNode } from 'react';

declare module 'next/head' {
  export interface HeadProps {
    children: ReactNode;
  }
  export default function Head(props: HeadProps): JSX.Element;
}

declare module 'next/document' {
  export interface DocumentProps {
    children?: ReactNode;
  }
  export interface HeadProps {
    children?: ReactNode;
  }
  export interface HtmlProps {
    children?: ReactNode;
    lang?: string;
  }
  export interface MainProps {
    children?: ReactNode;
  }
  export interface NextScriptProps {
    children?: ReactNode;
  }
  
  export class Head extends React.Component<HeadProps> {}
  export class Html extends React.Component<HtmlProps> {}
  export class Main extends React.Component<MainProps> {}
  export class NextScript extends React.Component<NextScriptProps> {}
  export default class Document extends React.Component<DocumentProps> {}
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

// Material-UI type augmentation
import { Theme, SxProps } from '@mui/material/styles';

declare module '@mui/material' {
  // Re-export SelectChangeEvent to make it available
  export interface SelectChangeEvent<T = string> {
    target: {
      value: T;
      name?: string;
    };
  }

  interface BoxProps {
    component?: React.ElementType;
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
  }
  
  interface IconButtonProps {
    component?: React.ElementType;
    size?: 'small' | 'medium' | 'large';
    color?: 'inherit' | 'primary' | 'secondary' | 'default' | 'error' | 'info' | 'success' | 'warning';
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    edge?: 'start' | 'end' | false;
    disabled?: boolean;
    'aria-label'?: string;
    children?: React.ReactNode;
  }
  
  interface ButtonProps {
    component?: React.ElementType;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    variant?: 'text' | 'outlined' | 'contained';
    color?: 'inherit' | 'primary' | 'secondary' | 'default' | 'error' | 'info' | 'success' | 'warning';
    fullWidth?: boolean;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    children?: React.ReactNode;
  }
  
  interface AppBarProps {
    position?: 'fixed' | 'absolute' | 'sticky' | 'static' | 'relative';
    color?: 'inherit' | 'primary' | 'secondary' | 'default' | 'transparent';
    elevation?: number;
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
  }
  
  interface PaperProps {
    sx?: SxProps<Theme>;
    elevation?: number;
    children?: React.ReactNode;
  }
  
  interface TypographyProps {
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption' | 'button' | 'overline';
    component?: React.ElementType;
    gutterBottom?: boolean;
    color?: string;
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
    fontWeight?: 'light' | 'regular' | 'medium' | 'bold' | number;
  }
  
  interface TableCellProps {
    align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
    colSpan?: number;
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
  }
  
  interface ContainerProps {
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
  }
  
  interface GridProps {
    item?: boolean;
    container?: boolean;
    spacing?: number;
    xs?: number | boolean;
    sm?: number | boolean;
    md?: number | boolean;
    lg?: number | boolean;
    xl?: number | boolean;
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
  }
  
  interface AvatarProps {
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
    bgcolor?: string;
    color?: string;
  }

  interface CardProps {
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
  }

  interface CardContentProps {
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
  }

  interface FormControlProps {
    fullWidth?: boolean;
    children?: React.ReactNode;
  }

  interface SelectProps {
    value?: string | number | readonly string[] | undefined;
    onChange?: (event: SelectChangeEvent<any>) => void;
    label?: string;
    name?: string;
    children?: React.ReactNode;
  }

  interface MenuItemProps {
    value?: any;
    key?: string | number;
    children?: React.ReactNode;
  }

  interface PaginationProps {
    count: number;
    page: number;
    onChange: (event: React.ChangeEvent<unknown>, page: number) => void;
    color?: 'primary' | 'secondary' | 'standard';
  }

  interface TableContainerProps {
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
  }

  interface TableProps {
    children?: React.ReactNode;
  }

  interface TableHeadProps {
    children?: React.ReactNode;
  }

  interface TableBodyProps {
    children?: React.ReactNode;
  }

  interface TableRowProps {
    sx?: SxProps<Theme>;
    onClick?: () => void;
    key?: string | number;
    children?: React.ReactNode;
  }

  interface TextFieldProps {
    fullWidth?: boolean;
    label?: string;
    variant?: 'outlined' | 'filled' | 'standard';
    placeholder?: string;
    value?: string;
    name?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }

  interface InputLabelProps {
    children?: React.ReactNode;
  }

  interface ToolbarProps {
    children?: React.ReactNode;
  }

  interface DialogProps {
    fullScreen?: boolean;
    open: boolean;
    onClose: () => void;
    'aria-labelledby'?: string;
    children?: React.ReactNode;
  }

  interface DialogTitleProps {
    children?: React.ReactNode;
  }

  interface DialogContentProps {
    children?: React.ReactNode;
  }

  interface DialogActionsProps {
    children?: React.ReactNode;
  }

  interface CircularProgressProps {
    size?: number | string;
    color?: 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  }

  interface AlertProps {
    severity?: 'error' | 'warning' | 'info' | 'success';
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
  }

  interface SnackbarProps {
    open: boolean;
    onClose?: () => void;
    message?: string;
    autoHideDuration?: number;
    children?: React.ReactNode;
  }

  interface FormHelperTextProps {
    children?: React.ReactNode;
  }

  interface DividerProps {
    sx?: SxProps<Theme>;
  }
}

// Global type augmentation
declare global {
  interface Window {
    // Add any global window properties here if needed
  }
}
