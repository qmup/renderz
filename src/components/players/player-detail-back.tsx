'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function PlayerDetailBack({ href = '/players' }: { href?: string }) {
  const router = useRouter();

  function goBack() {
    try {
      const referrer = document.referrer;
      if (referrer && new URL(referrer).origin === window.location.origin) {
        router.back();
        return;
      }
    } catch {
      // fall through
    }
    router.push(href);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-9 gap-1 self-start px-2"
      onClick={goBack}
    >
      <ChevronLeft data-icon="inline-start" />
      Back
    </Button>
  );
}
