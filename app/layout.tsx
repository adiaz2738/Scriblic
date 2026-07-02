import "./globals.css";

export const metadata = {
  title: "Scriblic",
  description: "A minimal, hand-drawn whiteboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
