export type NavLinkItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type NavTemplateComponent = (props: {
  title: string;
  items: NavLinkItem[];
  loadingText?: string;
}) => import("react").ReactNode;

