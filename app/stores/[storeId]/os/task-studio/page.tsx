'use client';

import { TaskStudio } from '@/components/os/TaskStudio';
import { useI18n } from '@/i18n/I18nProvider';

export default function TaskStudioPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">{t('taskStudio.title')}</h1>
        <p className="text-muted-foreground">{t('taskStudio.subtitle')}</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <TaskStudio />
      </div>
    </div>
  );
}
