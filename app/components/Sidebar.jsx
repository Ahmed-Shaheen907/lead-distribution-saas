"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Settings,
  LogIn,
  UserPlus,
} from "lucide-react";

const menu = [
  { name: "Dashboard", href: "/", icon: <LayoutDashboard size={18} /> },
  { name: "Agents", href: "/agents", icon: <Users size={18} /> },
  { name: "Lead Logs", href: "/logs", icon: <ListChecks size={18} /> },
  { name: "Setup", href: "/setup", icon: <Settings size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { status } = useSession();

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-white border-r flex flex-col z-50">
      {/* BRAND */}
      <div className="p-4 border-b text-lg font-bold tracking-wide text-black">
        The Gemini Lab
      </div>

      {/* UNAUTHENTICATED */}
      {status === "unauthenticated" && (
        <nav className="p-4 flex flex-col gap-3">
          <Link
            href="/login"
            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition
              ${
                pathname === "/login"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }
            `}
          >
            <LogIn size={18} />
            Login
          </Link>

          <Link
            href="/signup"
            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition
              ${
                pathname === "/signup"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }
            `}
          >
            <UserPlus size={18} />
            Sign up
          </Link>
        </nav>
      )}

      {/* AUTHENTICATED */}
      {status === "authenticated" && (
        <>
          <nav className="flex-1 p-4 flex flex-col gap-2">
            {menu.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition
                    ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-white text-black hover:bg-gray-100"
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* LOGOUT */}
          <div className="p-4 border-t">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full p-3 rounded-lg text-red-600
                         hover:bg-red-50 cursor-pointer transition"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
