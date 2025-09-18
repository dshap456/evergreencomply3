'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { ArrowLeft, ShoppingCart, Plus, Minus, Loader2, ChevronDown, User, Users, Lock } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { toast } from '@kit/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Label } from '@kit/ui/label';
import pathsConfig from '~/config/paths.config';
import { CustomShieldIcon } from '../../_components/custom-icons';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

interface Course {
  id: string;
  title: string;
  slug: string;
  price: string;
  description: string | null;
  billing_product_id: string | null;
  expectedSlug?: string;
  sku?: string;
  status: string;
}

interface CartClientProps {
  availableCourses: Course[];
}

export function CartClient({ availableCourses }: CartClientProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  // Purchase type is now determined by quantity, not user selection
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customerName, setCustomerName] = useState('');

  // Load initial quantities from localStorage and check auth
  useEffect(() => {
    const savedCart = localStorage.getItem('training-cart');
    const savedName = localStorage.getItem('checkout-customer-name');
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart);
        const newQuantities: Record<string, number> = {};
        
        cartItems.forEach((item: { courseId: string; quantity: number }) => {
          // Find course by any identifier
          const course = availableCourses.find(c => 
            c.slug === item.courseId || 
            c.expectedSlug === item.courseId ||
            c.sku === item.courseId || 
            c.id === item.courseId
          );
          
          if (course) {
            // Store by course ID for consistency
            newQuantities[course.id] = item.quantity;
          }
        });
        
        setQuantities(newQuantities);
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
    if (savedName) {
      try {
        setCustomerName(JSON.parse(savedName));
      } catch {
        setCustomerName(savedName);
      }
    }
    
    // Check if user is authenticated
    checkAuth();
    
    setIsLoading(false);
  }, [availableCourses]);
  
  // Check authentication and load team accounts
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      setIsAuthenticated(true);
      
      // Try to load user's name from their account
      const { data: account } = await supabase
        .from('accounts')
        .select('name')
        .eq('id', session.user.id)
        .eq('is_personal_account', true)
        .single();
      
      if (account?.name) {
        setCustomerName(account.name);
      }
    }
  };

  // Save to localStorage whenever quantities change
  useEffect(() => {
    if (!isLoading) {
      const cartItems = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([courseId, quantity]) => {
          const course = availableCourses.find(c => c.id === courseId);
          // Store by slug if available, otherwise by ID
          return {
            courseId: course?.slug || courseId,
            quantity
          };
        });
      
      localStorage.setItem('training-cart', JSON.stringify(cartItems));
      
      // Dispatch custom event to update cart count
      window.dispatchEvent(new Event('cart-updated'));
    }
  }, [quantities, isLoading, availableCourses]);

  const updateQuantity = (courseId: string, quantity: number) => {
    if (quantity <= 0) {
      setQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[courseId];
        return newQuantities;
      });
    } else {
      setQuantities(prev => ({
        ...prev,
        [courseId]: quantity
      }));
    }
  };

  const getQuantity = (courseId: string) => quantities[courseId] || 0;

  const calculateSubtotal = () => {
    return Object.entries(quantities).reduce((total, [courseId, qty]) => {
      const course = availableCourses.find(c => c.id === courseId);
      return total + (parseFloat(course?.price || '0') * qty);
    }, 0);
  };

  const totalItems = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  const getCartCourses = () => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([courseId, qty]) => {
        const course = availableCourses.find(c => c.id === courseId);
        return { course, quantity: qty };
      })
      .filter(item => item.course);
  };

  const handleCheckout = async () => {
    const cartCourses = getCartCourses();
    
    if (cartCourses.length === 0) {
      toast.error('Please add at least one course to your cart');
      return;
    }
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Please sign in to complete your purchase');
      router.push(pathsConfig.auth.signIn);
      return;
    }
    
    // Validate name is provided (only for single-seat purchases)
    if (totalItems === 1 && !customerName.trim()) {
      toast.error('Please enter your name for the certificate');
      return;
    }

    setIsCheckingOut(true);
    
    try {
      // Create checkout session - use the training endpoint with fixed price IDs
      const response = await fetch('/api/checkout/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: cartCourses.map(({ course, quantity }) => ({
            courseId: course?.slug || course?.id,  // Use slug as the courseId
            quantity,
          })),
          customerName: totalItems === 1 ? customerName.trim() : '',  // Only send name for single seat
          accountType: totalItems > 1 ? 'team' : 'personal',  // Determine by quantity
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();  // The training endpoint returns 'url' not 'sessionUrl'
      
      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const publishedCourses = availableCourses.filter(c => c.status === 'published');
  const subtotal = calculateSubtotal();
  const tax = 0; // No tax for digital products
  const total = subtotal + tax;

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
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
            <Link href="/contact" className="text-sm font-medium hover:text-primary">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center text-sm text-muted-foreground">
              Call or text{' '}
              <Link href="tel:9709190034" className="ml-1 underline">(970) 919‑0034</Link>
              <span className="mx-1">·</span>
              <Link href="sms:9709190034" className="underline">Text us</Link>
            </div>
            <Link href="/contact">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container">
          <div className="mb-6">
            <Link href="/" className="hidden md:inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
            <div className="text-xs text-muted-foreground mb-2">
              <span className="font-medium text-foreground">Cart</span>
              <span className="mx-2">→</span>
              <span>Account</span>
              <span className="mx-2">→</span>
              <span>Checkout</span>
              <span className="mx-2">→</span>
              <span>Success</span>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
              Shopping Cart
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Select the courses and number of seats you need for your team
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Course Selection */}
            <div className="lg:col-span-2">
              <Card className="border-primary/30 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    Available Courses
                    <Badge className="hidden md:inline-flex bg-accent text-accent-foreground border border-accent/40">Team-ready</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {publishedCourses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No courses available at this time.
                    </p>
                  ) : (
                    publishedCourses.map((course) => {
                      const quantity = getQuantity(course.id);
                      const lineTotal = parseFloat(course.price) * quantity;
                      
                      return (
                        <div 
                          key={course.id} 
                          className={`p-2 border rounded-lg transition-all ${
                            quantity > 0 
                              ? 'bg-primary/15 border-primary/40 shadow-sm border-l-4 border-l-primary' 
                              : 'hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{course.title}</h4>
                              <p className="text-xs font-medium mt-0.5">
                                ${course.price} per seat
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {quantity === 0 ? (
                                <Button
                                  size="sm"
                                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  onClick={() => updateQuantity(course.id, 1)}
                                  aria-label={`Add ${course.title} to cart`}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className={`h-9 w-9 ${quantity > 0 ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''}`}
                                    onClick={() => updateQuantity(course.id, Math.max(0, quantity - 1))}
                                    aria-label={`Decrease ${course.title} seats`}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={quantity}
                                    readOnly
                                    className="w-14 text-center h-9 px-1"
                                    min="0"
                                    aria-label={`${course.title} quantity`}
                                  />
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={() => updateQuantity(course.id, quantity + 1)}
                                    aria-label={`Increase ${course.title} seats`}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="hidden sm:inline-flex h-8 px-2 text-xs text-muted-foreground"
                                    onClick={() => updateQuantity(course.id, 0)}
                                    aria-label={`Remove ${course.title} from cart`}
                                  >
                                    Remove
                                  </Button>
                                  <div className="text-right min-w-[60px]">
                                    <p className="font-semibold text-sm">${lineTotal.toFixed(2)}</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24 border-primary/30 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-primary">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {totalItems > 0 ? (
                    <>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {getCartCourses().map(({ course, quantity }) => (
                          <div key={course!.id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground truncate mr-2">
                              {course!.title} × {quantity}
                            </span>
                            <span className="font-medium">${(parseFloat(course!.price) * quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t pt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-1 hidden md:block">
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span className="text-base">${total.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Estimated tax calculated at checkout</p>
                      </div>

                      {/* Name field for single-seat purchases (shown regardless of auth) */}
                      {totalItems === 1 && (
                        <div className="space-y-2 border-t pt-3">
                          <Label htmlFor="customer-name" className="text-xs font-medium">
                            Name for Certificate <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="customer-name"
                            type="text"
                            placeholder="Enter full legal name"
                            value={customerName}
                            onChange={(e) => {
                              setCustomerName(e.target.value);
                              try {
                                localStorage.setItem('checkout-customer-name', JSON.stringify(e.target.value));
                              } catch {}
                            }}
                            className="h-8 text-xs"
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            This name will appear on your completion certificate
                          </p>
                        </div>
                      )}
                      
                      {/* Authentication Check */}
                      {!isAuthenticated ? (
                        <div className="border-t pt-3 space-y-3">
                          <div className="text-center py-4">
                            <p className="hidden md:block text-xs text-muted-foreground mb-4">
                              Create a free account to complete your purchase
                            </p>
                            <div className="space-y-2">
                              <Button 
                                className="hidden md:inline-flex w-full bg-[#F4C542] text-[#17472D] font-semibold hover:bg-[#E0B63B] focus-visible:ring-[#17472D]/40" 
                                size="sm"
                                onClick={() => {
                                  try {
                                    if (totalItems === 1 && customerName.trim()) {
                                      localStorage.setItem('checkout-customer-name', JSON.stringify(customerName.trim()));
                                    }
                                  } catch {}
                                  router.push(`${pathsConfig.auth.signUp}?redirect=/cart`);
                                }}
                              >
                                Create Account to Checkout
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Multi-seat purchase notice */}
                          {totalItems > 1 && (
                            <div className="border-t pt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium">Team Purchase</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                You're purchasing {totalItems} seats. After checkout, you'll be able to:
                              </p>
                              <ul className="text-xs text-muted-foreground ml-4 space-y-1">
                                <li>• Assign seats to team members</li>
                                <li>• Self-assign seats for your own training</li>
                                <li>• Track progress and completions</li>
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                      
                      {isAuthenticated ? (
                        <Button 
                          className="hidden md:inline-flex w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                          size="sm"
                          onClick={handleCheckout}
                          disabled={isCheckingOut || totalItems === 0}
                        >
                          {isCheckingOut ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Checkout (${totalItems} ${totalItems === 1 ? 'seat' : 'seats'})`
                          )}
                        </Button>
                      ) : null}
                      
                      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                        <Lock className="h-3 w-3" /> Secure checkout powered by Stripe • 30-day refund
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Select courses and seats to begin
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile bottom CTA */}
      {totalItems > 0 && (
        <div className="md:hidden fixed bottom-0 inset-x-0 border-t bg-gradient-to-t from-primary/10 to-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold">Total ${total.toFixed(2)}</div>
              <div className="text-muted-foreground text-xs">{totalItems} {totalItems === 1 ? 'seat' : 'seats'}</div>
            </div>
            {isAuthenticated ? (
              <Button size="sm" onClick={handleCheckout} className="min-w-[140px] bg-primary text-primary-foreground hover:bg-primary/90">
                Checkout
              </Button>
            ) : (
              <Button size="sm" onClick={() => { try { if (totalItems === 1 && customerName.trim()) { localStorage.setItem('checkout-customer-name', JSON.stringify(customerName.trim())); } } catch {} ; router.push(`${pathsConfig.auth.signUp}?redirect=/cart`); }} className="min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90">
                Create Account to Checkout
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
