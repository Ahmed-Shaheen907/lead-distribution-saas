import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AgentsClient from "./AgentsClient";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function AgentsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <AgentsClient user={session.user} />;
}
