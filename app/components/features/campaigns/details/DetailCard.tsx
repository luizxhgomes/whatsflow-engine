'use client';

import React from 'react';
import { Container } from '@/components/ui/container';
import { DetailCardProps } from './types';

export const DetailCard: React.FC<DetailCardProps> = ({
  title,
  value,
  subvalue,
  icon: Icon,
  color,
  onClick,
  isActive,
}) => (
  <Container
    variant="glass"
    padding="lg"
    hover={!!onClick}
    onClick={onClick}
    className={`border-l-4 ${onClick ? 'cursor-pointer' : 'cursor-default'} ${isActive ? 'ring-2 ring-white/20 bg-white/5' : ''}`}
    style={{ borderLeftColor: color }}
  >
    <div className="flex justify-between items-start mb-2">
      <div>
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div className="p-2 rounded-lg bg-white/5 text-white">
        <Icon size={20} color={color} />
      </div>
    </div>
    <p className="text-xs text-gray-500">{subvalue}</p>
  </Container>
);
