import { discoverUsers } from "@/lib/connections/actions";
import { DiscoverClient } from "@/components/connections/DiscoverClient";
export const metadata = { title: "Discover" };
export default async function DiscoverPage(){ const result=await discoverUsers(); return <DiscoverClient initialUsers={result.success?result.users:[]} />; }
