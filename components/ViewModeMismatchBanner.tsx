'use client';

import { usePathname, useRouter } from 'next/navigation';
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
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-amber-800">
            {isStaffInManagerPage 
              ? t('viewMode.staffInManagerPage') 
              : t('viewMode.managerInStaffPage')}
          </h4>
          <p className="text-sm text-amber-700 mt-1">
            {isStaffInManagerPage 
              ? t('viewMode.staffInManagerPageDesc') 
              : t('viewMode.managerInStaffPageDesc')}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSwitchMode}
          className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-100 flex-shrink-0"
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
      </div>
    </div>
  );
}
