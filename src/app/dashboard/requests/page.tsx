import { getConnectionRequests } from "@/lib/connections/actions"; import { RequestsClient } from "@/components/connections/RequestsClient";
export const metadata={title:"Connection requests"}; export default async function RequestsPage(){const r=await getConnectionRequests();return <RequestsClient incoming={r.success?r.incoming:[]} outgoing={r.success?r.outgoing:[]} />}
