'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/state/auth';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export default function ForbiddenPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const router = useRouter();
  const { t } = useI18n();
  const { currentUser, canAccessStaffView } = useAuth();

  // Redirect to appropriate page based on role
  const handleGoBack = () => {
    if (canAccessStaffView) {
      router.push(`/stores/${storeId}/floor/todo`);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-8">
      <div className="rounded-full bg-destructive/10 p-6 mb-6">
        <ShieldX className="h-16 w-16 text-destructive" />
      </div>
      
      <h1 className="text-3xl font-bold mb-2">
        {t('error.forbidden.title')}
      </h1>
      
      <p className="text-muted-foreground mb-8 max-w-md">
        {t('error.forbidden.message')}
      </p>
      
      <div className="flex gap-4">
        <Button variant="outline" onClick={handleGoBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('error.forbidden.goBack')}
        </Button>
        <Button onClick={() => router.push(`/stores/${storeId}/floor/todo`)} className="gap-2">
          <Home className="h-4 w-4" />
          {t('error.forbidden.goHome')}
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mt-8">
        {t('error.forbidden.currentRole')}: <span className="font-medium">{currentUser.role}</span>
      </p>
    </div>
  );
}
