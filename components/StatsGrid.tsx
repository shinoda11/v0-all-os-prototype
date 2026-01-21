'use client';

import type React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatItem {
  icon: React.ReactNode;
  iconBgColor: string;
  value: string | number;
  label: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`rounded-full p-3 ${stat.iconBgColor}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
