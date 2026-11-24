import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Noto_Sans_Sundanese } from "next/font/google";

const noto = Noto_Sans_Sundanese({
  variable: "--font-noto-sundanese",
  subsets: ["latin", "sundanese"],
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${noto.variable} contents`}>
      <Component {...pageProps} />
    </div>
  );
}
