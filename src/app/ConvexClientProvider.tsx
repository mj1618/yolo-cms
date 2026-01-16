"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import * as React from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!convex) {
    // Allow the app to boot even before Convex is configured.
    // CMS functionality that uses Convex will require NEXT_PUBLIC_CONVEX_URL.
    return children;
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

