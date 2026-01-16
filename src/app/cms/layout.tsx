import { AuthGate } from "./AuthGate";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  // Force dark-mode Tailwind variants for the CMS, regardless of OS preference.
  return (
    <div className="dark">
      <AuthGate>{children}</AuthGate>
    </div>
  );
}

