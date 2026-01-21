import { redirect } from 'next/navigation';

export default function SalesForecastRedirect({
  params,
}: {
  params: { storeId: string };
}) {
  redirect(`/stores/${params.storeId}/food-service/stores/sales-forecast`);
}
