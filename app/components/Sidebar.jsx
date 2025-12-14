"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

// Icons
import {
  LayoutDashboard,
  Users,
  Settings,
  ListChecks,
  Workflow,
} from "lucide-react";

const menu = [
  { name: "Dashboard", href: "/", icon: <LayoutDashboard size={20} /> },
  { name: "Agents", href: "/agents", icon: <Users size={20} /> },
  { name: "Routing Rules", href: "/rules", icon: <Workflow size={20} /> },
  { name: "Lead Logs", href: "/logs", icon: <ListChecks size={20} /> },
  { name: "Settings", href: "/settings", icon: <Settings size={20} /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen border-r bg-white flex flex-col">
      <div className="p-4 border-b text-xl font-bold tracking-wide">
        LeadFlow AI
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 p-2">
        {menu.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-lg mb-1 cursor-pointer
                transition-all duration-150
                ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100 text-gray-800"
                }
              `}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT BUTTON */}
      <div className="p-4 border-t">
        <button
          onClick={() => signOut()}
          className="w-full p-2 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-all"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
