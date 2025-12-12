
import StockDetailPage from "./client"

export async function generateStaticParams() {
  return [{ symbol: 'dummy' }]
}

export default function Page() {
  return <StockDetailPage />
}
