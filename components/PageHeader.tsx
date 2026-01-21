'use client';

import type React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string; // alias for subtitle
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, description, actions }: PageHeaderProps) {
  const subText = subtitle || description;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subText && <p className="text-muted-foreground">{subText}</p>}
      </div>
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </div>
  );
}
