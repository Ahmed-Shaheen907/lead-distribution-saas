import "./globals.css";
import Providers from "./components/Providers";
import Sidebar from "./components/Sidebar";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Providers>
          <Sidebar />

          {/* Main content shifted right */}
          <main className="ml-64 p-6 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
