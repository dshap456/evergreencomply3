'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@kit/ui/button';
import { ShoppingCart } from 'lucide-react';

interface CartItem {
  courseId: string;
  quantity: number;
}

export function CartCount() {
  const [cartCount, setCartCount] = useState(0);

  // Function to calculate total items in cart
  const calculateCartCount = () => {
    try {
      const savedCart = localStorage.getItem('training-cart');
      if (savedCart) {
        const cartItems: CartItem[] = JSON.parse(savedCart);
        const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalCount);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error('Error reading cart:', error);
      setCartCount(0);
    }
  };

  // Update count on mount and when localStorage changes
  useEffect(() => {
    // Initial count
    calculateCartCount();

    // Listen for storage events (changes from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'training-cart') {
        calculateCartCount();
      }
    };

    // Listen for custom events (changes from same tab)
    const handleCartUpdate = () => {
      calculateCartCount();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cart-updated', handleCartUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, []);

  return (
    <Link href="/cart">
      <Button variant="ghost" size="sm" className="relative">
        <ShoppingCart className="h-5 w-5" />
        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {cartCount}
        </span>
      </Button>
    </Link>
  );
}