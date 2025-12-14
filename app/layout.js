import "./globals.css";
import Providers from "./components/Providers";
import Sidebar from "./components/Sidebar.jsx";

export const metadata = {
  title: "LeadFlow AI",
  description: "AI-powered lead distribution system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex bg-black text-white">
        <Providers>
          {/* Sidebar on the left */}
          <Sidebar />

          {/* Main content on the right */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
