'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useViewMode, getViewModeMismatch, type ViewMode } from '@/core/viewMode';
import { useStore } from '@/state/store';
import { selectCurrentStore } from '@/core/selectors';
import { useI18n } from '@/i18n/I18nProvider';
import { AlertTriangle, Briefcase, Users } from 'lucide-react';

/**
 * Shows a banner when the user is viewing a page that doesn't match their current view mode.
 * For example, if they're in Staff View but visiting a Manager page.
 */
export function ViewModeMismatchBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { state } = useStore();
  const currentStore = selectCurrentStore(state);
  const [viewMode, setViewMode, isLoaded] = useViewMode();

  if (!isLoaded || !currentStore) return null;

  const mismatch = getViewModeMismatch(pathname, viewMode);
  
  if (!mismatch) return null;

  const handleSwitchMode = () => {
    const newMode: ViewMode = viewMode === 'manager' ? 'staff' : 'manager';
    setViewMode(newMode);
    
    // Navigate to the appropriate default page
    const storeId = currentStore.id;
    if (newMode === 'manager') {
      router.push(`/stores/${storeId}/os/cockpit`);
    } else {
      router.push(`/stores/${storeId}/floor/todo`);
    }
  };

  const isStaffInManagerPage = mismatch === 'staff-in-manager-page';

  return (
    <Alert variant="default" className="mb-4 border-amber-300 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">
        {isStaffInManagerPage 
          ? t('viewMode.staffInManagerPage') 
          : t('viewMode.managerInStaffPage')}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-700">
          {isStaffInManagerPage 
            ? t('viewMode.staffInManagerPageDesc') 
            : t('viewMode.managerInStaffPageDesc')}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSwitchMode}
          className="ml-4 gap-2 border-amber-300 text-amber-800 hover:bg-amber-100"
        >
          {isStaffInManagerPage ? (
            <>
              <Briefcase className="h-4 w-4" />
              {t('viewMode.switchToManager')}
            </>
          ) : (
            <>
              <Users className="h-4 w-4" />
              {t('viewMode.switchToStaff')}
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
