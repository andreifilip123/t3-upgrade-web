import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Upgrade T3 App",
  description: "A tool to upgrade your create-t3-app instance",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
