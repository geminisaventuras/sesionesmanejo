// @build: 2026-09-03 | id: INSTRUCTOR-RESERVA-CARD-SKELETON | backup: ReservaCardSkeleton.backup-20260903-000000 | desc: Skeleton específico para tarjetas de reserva del instructor
import React from 'react';
import SkeletonCard from '../../shared/components/SkeletonCard';

export default function ReservaCardSkeleton() {
  return <SkeletonCard lines={3} showButton={true} />;
}
