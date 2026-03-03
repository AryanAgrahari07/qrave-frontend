import { useState, useEffect } from 'react';

/**
 * Hook to dynamically load the Razorpay checkout script
 * 
 * @returns boolean indicating if the script has loaded successfully
 */
export function useRazorpay() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Check if script is already loaded
        if (window.Razorpay) {
            setIsLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;

        script.onload = () => {
            setIsLoaded(true);
        };

        script.onerror = () => {
            console.error('Failed to load Razorpay script');
            setIsLoaded(false);
        };

        document.body.appendChild(script);

        return () => {
            // Cleanup if needed, though usually we want to keep it cached
            if (document.body.contains(script) && !window.Razorpay) {
                document.body.removeChild(script);
            }
        };
    }, []);

    return isLoaded;
}

// Ensure TypeScript knows about window.Razorpay
declare global {
    interface Window {
        Razorpay: any;
    }
}
