
import TradeDetailPage from "./client"

export async function generateStaticParams() {
  return [{ id: '0' }]
}

export default function Page() {
  return <TradeDetailPage />
}
