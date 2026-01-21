import { redirect } from 'next/navigation';

export default function DailySalesRedirect({
  params,
}: {
  params: { storeId: string };
}) {
  redirect(`/stores/${params.storeId}/food-service/stores/analytics/daily-sales`);
}
