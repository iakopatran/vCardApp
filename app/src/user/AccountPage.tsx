import { Link as WaspRouterLink, routes } from 'wasp/client/router';
import type { User } from 'wasp/entities';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';

export default function AccountPage({ user }: { user: User }) {
  return (
    <div className='mt-10 px-6'>
      <Card className='mb-4 lg:m-8'>
        <CardHeader>
          <CardTitle className='text-base font-semibold leading-6 text-foreground'>
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='space-y-0'>
            {!!user.email && (
              <div className='py-4 px-6'>
                <div className='grid grid-cols-1 sm:grid-cols-3 sm:gap-4'>
                  <dt className='text-sm font-medium text-muted-foreground'>Email address</dt>
                  <dd className='mt-1 text-sm text-foreground sm:col-span-2 sm:mt-0'>{user.email}</dd>
                </div>
              </div>
            )}
            {!!user.username && (
              <>
                <Separator />
                <div className='py-4 px-6'>
                  <div className='grid grid-cols-1 sm:grid-cols-3 sm:gap-4'>
                    <dt className='text-sm font-medium text-muted-foreground'>Username</dt>
                    <dd className='mt-1 text-sm text-foreground sm:col-span-2 sm:mt-0'>{user.username}</dd>
                  </div>
                </div>
              </>
            )}
            <Separator />
            <div className='py-4 px-6'>
              <div className='grid grid-cols-1 sm:grid-cols-3 sm:gap-4'>
                <dt className='text-sm font-medium text-muted-foreground'>Credits</dt>
                <dd className='mt-1 text-sm text-foreground sm:col-span-1 sm:mt-0'>
                  <span className='font-semibold text-primary'>{user.credits}</span> remaining
                </dd>
                <div className='ml-4 flex-shrink-0 sm:col-span-1 sm:mt-0'>
                  <WaspRouterLink
                    to={routes.PricingPageRoute.to}
                    className='font-medium text-sm text-primary hover:text-primary/80 transition-colors duration-200'
                  >
                    Buy More Credits
                  </WaspRouterLink>
                </div>
              </div>
            </div>
            <Separator />
            <div className='py-4 px-6'>
              <div className='grid grid-cols-1 sm:grid-cols-3 sm:gap-4'>
                <dt className='text-sm font-medium text-muted-foreground'>Total Spent</dt>
                <dd className='mt-1 text-sm text-foreground sm:col-span-2 sm:mt-0'>${user.totalSpent.toFixed(2)}</dd>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
