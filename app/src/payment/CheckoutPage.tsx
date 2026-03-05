import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyPayment } from 'wasp/client/operations';
import { Card, CardContent } from '../components/ui/card';

export default function CheckoutPage() {
  const [status, setStatus] = useState<'loading' | 'verifying' | 'paid' | 'canceled' | 'error'>('loading');
  const [creditsAwarded, setCreditsAwarded] = useState<number>(0);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const isSuccess = queryParams.get('success');
    const isCanceled = queryParams.get('canceled');
    const sessionId = queryParams.get('session_id');

    if (isCanceled) {
      setStatus('canceled');
      const timeoutId = setTimeout(() => navigate('/pricing'), 4000);
      return () => clearTimeout(timeoutId);
    }

    if (isSuccess && sessionId) {
      setStatus('verifying');
      verifyPayment({ sessionId })
        .then((result) => {
          setCreditsAwarded(result.creditsAwarded);
          setNewBalance(result.newBalance);
          setStatus('paid');
          const timeoutId = setTimeout(() => navigate('/profile'), 4000);
          // Store timeout for cleanup - but component will unmount on navigate
          return () => clearTimeout(timeoutId);
        })
        .catch((err) => {
          console.error('Payment verification failed:', err);
          setErrorMessage(err.message || 'Failed to verify payment');
          setStatus('error');
        });
    } else {
      // No valid query params - redirect to profile
      navigate('/profile');
    }
  }, [location.search, navigate]);

  return (
    <div className='flex min-h-full flex-col justify-center mt-10 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <Card>
          <CardContent className='py-8 px-6 text-center'>
            {status === 'loading' && (
              <p className='text-muted-foreground'>Loading...</p>
            )}

            {status === 'verifying' && (
              <>
                <h1 className='text-2xl font-bold text-foreground mb-2'>Verifying Payment...</h1>
                <p className='text-muted-foreground'>Please wait while we confirm your purchase.</p>
              </>
            )}

            {status === 'paid' && (
              <>
                <h1 className='text-2xl font-bold text-foreground mb-2'>Payment Successful!</h1>
                <p className='text-lg text-primary font-semibold mt-4'>
                  +{creditsAwarded} credits added
                </p>
                <p className='text-muted-foreground mt-2'>
                  Your new balance: <span className='font-semibold text-foreground'>{newBalance} credits</span>
                </p>
                <p className='text-sm text-muted-foreground mt-4'>
                  Redirecting to your profile...
                </p>
              </>
            )}

            {status === 'canceled' && (
              <>
                <h1 className='text-2xl font-bold text-foreground mb-2'>Payment Canceled</h1>
                <p className='text-muted-foreground'>
                  No charges were made. Redirecting to pricing...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <h1 className='text-2xl font-bold text-destructive mb-2'>Payment Error</h1>
                <p className='text-muted-foreground'>
                  {errorMessage || 'Something went wrong. Please contact support.'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
