import { CheckCircle, CreditCard, Coins } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'wasp/client/auth';
import { generateCheckoutSession } from 'wasp/client/operations';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { PaymentPlanId } from './plans';

const PricingPage = () => {
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: user } = useAuth();

  const navigate = useNavigate();

  async function handleBuyCredits() {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setIsPaymentLoading(true);
      setErrorMessage(null);

      const checkoutResults = await generateCheckoutSession(PaymentPlanId.Credits40);

      if (checkoutResults?.sessionUrl) {
        window.open(checkoutResults.sessionUrl, '_self');
      } else {
        throw new Error('Error generating checkout session URL');
      }
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Error processing payment. Please try again later.');
      }
      setIsPaymentLoading(false);
    }
  }

  return (
    <div className='py-10 lg:mt-10'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        <div className='mx-auto max-w-4xl text-center'>
          <h2 className='mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
            Buy <span className='text-primary'>Credits</span>
          </h2>
          <p className='mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-muted-foreground'>
            Each credit lets you create one digital contact card with a custom tile.
          </p>
        </div>

        {user && (
          <div className='mx-auto mt-8 max-w-md text-center'>
            <div className='inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2'>
              <Coins className='h-5 w-5 text-primary' />
              <span className='text-sm font-medium text-foreground'>
                Current balance: <span className='text-primary font-bold'>{user.credits} credits</span>
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <Alert variant='destructive' className='mt-8 max-w-md mx-auto'>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className='mx-auto mt-12 max-w-md'>
          <Card className='relative overflow-hidden ring-2 ring-primary'>
            <div
              className='absolute top-0 right-0 -z-10 w-full h-full transform-gpu blur-3xl'
              aria-hidden='true'
            >
              <div
                className='absolute w-full h-full bg-gradient-to-br from-primary/40 via-primary/20 to-primary/10 opacity-30'
                style={{ clipPath: 'circle(670% at 50% 50%)' }}
              />
            </div>
            <CardHeader className='text-center pb-2'>
              <CardTitle className='text-2xl font-bold text-foreground'>
                40 Credits
              </CardTitle>
              <p className='mt-2 flex items-baseline justify-center gap-x-1'>
                <span className='text-5xl font-bold tracking-tight text-foreground'>$9.99</span>
              </p>
              <p className='mt-2 text-sm text-muted-foreground'>
                Just $0.25 per card
              </p>
            </CardHeader>
            <CardContent className='pt-4'>
              <ul role='list' className='space-y-3 text-sm leading-6 text-muted-foreground'>
                <li className='flex gap-x-3'>
                  <CheckCircle className='h-5 w-5 flex-none text-primary' aria-hidden='true' />
                  Create 40 digital contact cards
                </li>
                <li className='flex gap-x-3'>
                  <CheckCircle className='h-5 w-5 flex-none text-primary' aria-hidden='true' />
                  Custom tile generation for each card
                </li>
                <li className='flex gap-x-3'>
                  <CheckCircle className='h-5 w-5 flex-none text-primary' aria-hidden='true' />
                  Edit contacts anytime for free
                </li>
                <li className='flex gap-x-3'>
                  <CheckCircle className='h-5 w-5 flex-none text-primary' aria-hidden='true' />
                  Credits never expire
                </li>
                <li className='flex gap-x-3'>
                  <CheckCircle className='h-5 w-5 flex-none text-primary' aria-hidden='true' />
                  Download vCard files
                </li>
              </ul>
            </CardContent>
            <CardFooter className='pt-2'>
              <Button
                onClick={handleBuyCredits}
                className='w-full'
                size='lg'
                disabled={isPaymentLoading}
              >
                <CreditCard className='mr-2 h-5 w-5' />
                {isPaymentLoading
                  ? 'Processing...'
                  : user
                    ? 'Buy 40 Credits'
                    : 'Log in to buy credits'}
              </Button>
            </CardFooter>
          </Card>

          <p className='mt-6 text-center text-xs text-muted-foreground'>
            Secure payment powered by Stripe. Use test card{' '}
            <span className='px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono'>
              4242 4242 4242 4242
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
