import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "KasbLink",
  description: "Offline freelancer booking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
