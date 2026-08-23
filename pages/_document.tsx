import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-PT">
      <Head>
        <meta name="theme-color" content="#ea580c" />
        <script
          dangerouslySetInnerHTML={{
            __html: "if (typeof window !== 'undefined') { const host = window.location.hostname.toLowerCase(); const target = 'https://enzoloft.pt' + window.location.pathname + window.location.search + window.location.hash; if (host === 'www.enzoloft.pt') { window.location.replace(target); } else if (host === 'enzoloft-51508.web.app' || host === 'enzoloft.web.app' || host.endsWith('.web.app') || host.endsWith('.firebaseapp.com')) { window.location.replace('https://enzoloft.pt' + window.location.pathname + window.location.search + window.location.hash); } }",
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
