import ExchangeRequestForm from "@/components/account/ExchangeRequestForm";
import { notFound } from "next/navigation";

export default async function ExchangePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ExchangeRequestForm orderId={id} />;
}
