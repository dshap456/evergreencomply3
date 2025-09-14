'use client';

import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import { ContactEmailSchema } from '../_lib/contact-email.schema';
import { sendContactEmail } from '../_lib/server/server-actions';

export function ContactForm() {
  const [pending, startTransition] = useTransition();

  const [state, setState] = useState({
    success: false,
    error: false,
  });

  const form = useForm({
    resolver: zodResolver(ContactEmailSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  if (state.success) {
    return <SuccessAlert />;
  }

  if (state.error) {
    return <ErrorAlert />;
  }

  return (
    <Form {...form}>
      <form
        className={'flex flex-col space-y-4'}
        onSubmit={form.handleSubmit((data) => {
          startTransition(async () => {
            try {
              console.log('Submitting contact form with data:', data);
              
              // Use fetch to call the API route as a workaround
              const response = await fetch('/api/contact-form-submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              
              console.log('Response status:', response.status);
              console.log('Response ok:', response.ok);
              
              let result;
              try {
                result = await response.json();
                console.log('Contact form submission result:', result);
              } catch (parseError) {
                console.error('Failed to parse response:', parseError);
                throw new Error('Invalid response from server');
              }
              
              if (!response.ok) {
                console.error('Response not ok:', response.status, result);
                throw new Error(result?.error || `Server error: ${response.status}`);
              }
              
              // Check multiple possible success indicators
              const isSuccess = result?.success === true || 
                               result?.result?.success === true || 
                               (response.ok && result?.result?.emailId);
              
              if (!isSuccess) {
                console.error('Result indicates failure:', result);
                throw new Error(result?.error || 'Failed to send message');
              }

              console.log('Email sent successfully!');
              setState({ success: true, error: false });
              form.reset();
            } catch (error) {
              console.error('Contact form error:', error);
              console.error('Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                name: error instanceof Error ? error.name : undefined,
              });
              setState({ error: true, success: false });
            }
          });
        })}
      >
        <FormField
          name={'name'}
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  Name
                </FormLabel>

                <FormControl>
                  <Input maxLength={200} {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          name={'email'}
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  Email
                </FormLabel>

                <FormControl>
                  <Input type={'email'} {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          name={'message'}
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  Message
                </FormLabel>

                <FormControl>
                  <Textarea
                    className={'min-h-36'}
                    maxLength={5000}
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Button disabled={pending} type={'submit'}>
          Send Message
        </Button>
      </form>
    </Form>
  );
}

function SuccessAlert() {
  return (
    <Alert variant={'success'}>
      <AlertTitle>
        <Trans i18nKey={'marketing:contactSuccess'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'marketing:contactSuccessDescription'} />
      </AlertDescription>
    </Alert>
  );
}

function ErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'marketing:contactError'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'marketing:contactErrorDescription'} />
      </AlertDescription>
    </Alert>
  );
}
