import "~/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { Provider } from "jotai";
import Head from "next/head";

export const metadata = {
  title: "Waifu AI",
  icons: {
    icon: "/static/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider>
      <html lang="en" className={`${GeistSans.variable}`}>
        <Head>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <body>{children}</body>
      </html>
    </Provider>
  );
}