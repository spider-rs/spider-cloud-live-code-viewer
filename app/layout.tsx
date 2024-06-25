import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const description =
  "Crawl and view the website contents in realtime in VSCode. This is an example showcasing spider.cloud.";
const url = process.env.PUBLIC_NEXT_SITENAME || "https://vscode.spider.cloud";

export const metadata: Metadata = {
  title: "VSCode Spider Cloud",
  description,
  openGraph: {
    type: "website",
    url,
    title: "VSCode Spider Cloud",
    description,
    siteName: "Spider Cloud VSCode Live",
    images: [
      {
        url: `${url}/og.png`,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
