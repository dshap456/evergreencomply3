import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { CustomShieldIcon } from '../_components/custom-icons';
import { CartCount } from '../_components/cart-count';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <CustomShieldIcon className="h-6 w-6" />
            <span className="text-xl font-bold">Evergreen Comply</span>
          </Link>
        </div>
        <nav className="hidden md:flex gap-6">
          <Link href="/#features" className="text-sm font-medium hover:text-primary">
            Features
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary">
              Courses
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/courses/dot-hazmat" className="cursor-pointer">
                  DOT HAZMAT - General
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/courses/advanced-hazmat" className="cursor-pointer">
                  DOT HAZMAT - Advanced
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/courses/epa-rcra" className="cursor-pointer">
                  EPA RCRA
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/about" className="text-sm font-medium hover:text-primary">
            About
          </Link>
          <Link href="/contact" className="text-sm font-medium hover:text-primary">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <CartCount />
          {/** Point to /login alias to avoid any cached 404 on /auth/sign-in */}
          <Link href={`${(process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/,'') || 'https://www.evergreencomply.com')}/login`}>
            <Button variant="outline">Log In</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}