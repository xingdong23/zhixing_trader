
import PlanDetailPage from "./client"

export async function generateStaticParams() {
    return [{ id: '0' }]
}

export default function Page() {
    return <PlanDetailPage />
}
