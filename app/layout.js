import "./globals.css";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "LeadFlow AI",
  description: "AI-Powered Lead Distribution System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex bg-gray-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
