import type { Metadata } from "next";
import ThemeRegistry from "./theme-registry";
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
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
