'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@kit/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { cn } from '@kit/ui/utils';

interface LeadMagnetDownloadButtonProps {
  source?: string;
  downloadUrl?: string;
  buttonClassName?: string;
  buttonVariant?: 'default' | 'outline';
  children: React.ReactNode;
}

export function LeadMagnetDownloadButton({
  source = 'dot-hazmat-crosswalk',
  downloadUrl = '/resources/dot-hazmat-crosswalk.pdf',
  buttonClassName,
  buttonVariant = 'default',
  children,
}: LeadMagnetDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setEmail('');
    setIsSubmitting(false);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/lead-magnet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail, source }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? 'Unable to process your request right now.');
      }

      const targetUrl: string = data?.downloadUrl ?? downloadUrl;

      setIsOpen(false);
      resetState();

      setTimeout(() => {
        window.open(`${targetUrl}?src=${encodeURIComponent(source)}`, '_blank', 'noopener');
      }, 100);
    } catch (err) {
      console.error('lead magnet signup failed', err);
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetState();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={buttonVariant}
          className={cn('w-auto rounded-md font-semibold', buttonClassName)}
        >
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock the Cross-Walk</DialogTitle>
          <DialogDescription>
            Drop in your email and we&apos;ll open the PDF immediately.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="lead-magnet-email">Work email</Label>
            <Input
              id="lead-magnet-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Unlocking…' : 'Open the PDF'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            We collect the email for follow-up. The PDF opens in a new tab right away.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
