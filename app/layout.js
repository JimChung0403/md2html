import "./globals.css";

export const metadata = {
  title: "MD Reader",
  description: "Browse local markdown files from the mdfile directory.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
