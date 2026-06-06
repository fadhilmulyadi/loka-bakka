import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "kader") {
    redirect("/kader/dashboard");
  }

  if (session.user.role === "ibu") {
    redirect("/ibu/dashboard");
  }

  redirect("/login");
}
