'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { ShoppingCart, Check } from 'lucide-react';
import { cn } from '@kit/ui/utils';

interface CartItem {
  courseId: string;
  quantity: number;
}

interface AddToCartButtonProps {
  courseId: string;
  price?: number;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
}

export function AddToCartButton({ 
  courseId, // This will now be the SKU like 'DOT-HAZMAT-001'
  price, 
  className,
  size = 'default',
  children 
}: AddToCartButtonProps) {
  const router = useRouter();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    // Get existing cart or initialize empty array
    const existingCart = localStorage.getItem('training-cart');
    let cartItems: CartItem[] = [];
    
    if (existingCart) {
      try {
        cartItems = JSON.parse(existingCart);
      } catch (e) {
        console.error('Error parsing cart:', e);
        cartItems = [];
      }
    }

    // Check if course already in cart
    const existingItemIndex = cartItems.findIndex(item => item.courseId === courseId);
    
    if (existingItemIndex > -1) {
      // If already in cart, increment quantity
      cartItems[existingItemIndex].quantity += 1;
    } else {
      // Add new item with quantity 1
      cartItems.push({ courseId, quantity: 1 });
    }

    // Save to localStorage
    localStorage.setItem('training-cart', JSON.stringify(cartItems));
    
    // Dispatch custom event to update cart count
    window.dispatchEvent(new Event('cart-updated'));

    // Show success state
    setIsAdded(true);
    
    // Navigate to cart after short delay
    setTimeout(() => {
      router.push('/cart');
    }, 500);
  };

  return (
    <Button
      size={size}
      className={cn(
        "bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)]",
        isAdded && "bg-green-600 hover:bg-green-600",
        className
      )}
      onClick={handleAddToCart}
      disabled={isAdded}
    >
      {isAdded ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          Added!
        </>
      ) : (
        <>
          {children || (
            <>
              <ShoppingCart className="h-4 w-4 mr-1" />
              {price ? `Buy Seats - $${price} per seat` : 'Buy Seats'}
            </>
          )}
        </>
      )}
    </Button>
  );
}