export interface Colors {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface Font {
  family: string;
  size: string;
  weight: string;
}

export interface ButtonStyle {
  borderRadius: string;
  padding: string;
}

export interface LoginPageConfig {
  companyName: string;
  logo: {
    file?: File;
    previewUrl?: string;
    altText: string;
    url?: string;
    width?: number;
    height?: number;
  };
  theme: 'light' | 'dark';
  content: {
    title: string;
    subtitle: string;
    welcomeMessage: string;
  };
  layout: {
    logoSize: 'small' | 'medium' | 'large';
    alignment: 'left' | 'center' | 'right';
    maxWidth?: string;
  };
  socialLogin: {
    enabled: boolean;
    providers: {
      google: boolean;
      facebook: boolean;
      twitter: boolean;
    };
  };
  additionalFeatures: {
    rememberMe: boolean;
    forgotPassword: boolean;
    signUp: boolean;
  };
  colors: Colors;
  font: Font;
  buttonStyle: ButtonStyle;
  pageTitle?: string;
}
