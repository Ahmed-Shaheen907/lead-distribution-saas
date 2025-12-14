import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p>Welcome {session.user.email}</p>
    </div>
  );
}
