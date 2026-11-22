import type { Metadata } from "next";
import ThemeRegistry from "./theme-registry";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Dashboard",
  description: "Personal health tracking and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeRegistry>
          {/* Server-only env var, passed down rather than baked into the bundle. */}
          <AuthProvider authBaseUrl={process.env.AUTH_BASE_URL ?? ""}>{children}</AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
