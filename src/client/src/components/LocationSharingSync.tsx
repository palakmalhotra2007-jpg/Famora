import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFamilyStore } from '../store';
import { fetchMemberLocations } from '../services/family.service';
import { useLocationSharing } from '../hooks/useLocationSharing';

export function LocationSharingSync() {
  const familyId = useFamilyStore((s) => s.currentFamily?.id);

  const { data } = useQuery({
    queryKey: ['memberLocations', familyId],
    queryFn: () => fetchMemberLocations(familyId!),
    enabled: !!familyId,
    refetchInterval: 60_000,
  });

  const sharingEnabled = data?.members.find((m) => m.isSelf)?.sharingEnabled ?? false;
  useLocationSharing(sharingEnabled);

  return null;
}
