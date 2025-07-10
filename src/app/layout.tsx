import '@/globals.css';

export const metadata = { title: 'ServerlessLLM-web' };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen">
        {children}
        <div id="portal-container"></div>
      </body>
    </html>
  );
}
