import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-PT">
      <Head>
        <meta name="theme-color" content="#ea580c" />
        <script
          dangerouslySetInnerHTML={{
            __html: "if (typeof window !== 'undefined' && window.location.hostname === 'www.enzoloft.pt') { window.location.replace('https://enzoloft.pt' + window.location.pathname + window.location.search + window.location.hash); }",
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
