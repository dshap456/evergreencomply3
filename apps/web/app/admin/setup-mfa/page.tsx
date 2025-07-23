import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import pathsConfig from '~/config/paths.config';

export default function SetupMfaPage() {
  return (
    <>
      <PageHeader
        title={<Trans i18nKey="admin:mfaRequired.title" defaults="MFA Required" />}
        description={<Trans i18nKey="admin:mfaRequired.description" defaults="Multi-Factor Authentication is required for admin access" />}
      />

      <PageBody>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Admin Access Requires MFA</CardTitle>
                  <CardDescription>
                    For security reasons, all super admin accounts must have Multi-Factor Authentication enabled.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTitle>Why is MFA required?</AlertTitle>
                <AlertDescription>
                  Super admin accounts have elevated privileges that can affect all users and data in the system. 
                  MFA provides an additional layer of security to protect against unauthorized access.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-medium">To access admin features:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Go to your individual account settings</li>
                  <li>Set up Multi-Factor Authentication (TOTP)</li>
                  <li>Scan the QR code with an authenticator app</li>
                  <li>Enter the verification code to complete setup</li>
                  <li>Return to the admin section</li>
                </ol>
              </div>

              <div className="flex gap-4">
                <Button asChild>
                  <Link href={pathsConfig.app.personalAccountSettings}>
                    Go to Settings
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={pathsConfig.app.home}>
                    Back to Home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}