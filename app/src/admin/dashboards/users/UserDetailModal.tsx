import { useState } from 'react';
import { getAdminUserDetails, useQuery } from 'wasp/client/operations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import LoadingSpinner from '../../layout/LoadingSpinner';
import {
  User as UserIcon,
  Mail,
  CreditCard,
  Calendar,
  Users,
  Clock,
  ExternalLink,
  FileText,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

type UserDetailModalProps = {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

type TabId = 'overview' | 'payments' | 'activity';

export default function UserDetailModal({ userId, isOpen, onClose }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { data, isLoading, error } = useQuery(
    getAdminUserDetails,
    { userId: userId! },
    { enabled: isOpen && !!userId }
  );

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number | Date) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (timestamp: number | Date) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string | null) => {
    const statusClasses: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      past_due: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      cancel_at_period_end: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      deleted: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      succeeded: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return statusClasses[status?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-800';
  };

  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: UserIcon },
    { id: 'payments' as TabId, label: 'Payments', icon: CreditCard },
    { id: 'activity' as TabId, label: 'Activity', icon: Clock },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <UserIcon className='h-5 w-5' />
            User Details
          </DialogTitle>
          <DialogDescription>View detailed information about this user</DialogDescription>
        </DialogHeader>

        {isLoading && <LoadingSpinner />}

        {error && (
          <div className='flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg'>
            <AlertCircle className='h-5 w-5' />
            <span>Failed to load user details. Please try again.</span>
          </div>
        )}

        {data && (
          <>
            {/* Tab Navigation */}
            <div className='flex gap-2 border-b pb-2'>
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size='sm'
                  onClick={() => setActiveTab(tab.id)}
                  className='flex items-center gap-2'
                >
                  <tab.icon className='h-4 w-4' />
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className='space-y-6'>
                {/* User Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg flex items-center gap-2'>
                      <Mail className='h-4 w-4' />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='grid grid-cols-2 gap-4'>
                    <div>
                      <p className='text-sm text-muted-foreground'>Email</p>
                      <p className='font-medium'>{data.user.email ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Username</p>
                      <p className='font-medium'>{data.user.username ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>User ID</p>
                      <p className='font-mono text-sm'>{data.user.id}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Created At</p>
                      <p className='font-medium'>{formatDateTime(data.user.createdAt)}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Admin</p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          data.user.isAdmin
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {data.user.isAdmin ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Credits</p>
                      <p className='font-medium'>{data.user.credits}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg flex items-center gap-2'>
                      <CreditCard className='h-4 w-4' />
                      Payment Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='grid grid-cols-2 gap-4'>
                    <div>
                      <p className='text-sm text-muted-foreground'>Credits</p>
                      <p className='font-medium'>{data.user.credits}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Total Spent</p>
                      <p className='font-medium'>${data.user.totalSpent.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Last Payment</p>
                      <p className='font-medium'>
                        {data.user.datePaid ? formatDateTime(data.user.datePaid) : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Payment Processor ID</p>
                      <p className='font-mono text-sm'>{data.user.paymentProcessorUserId ?? 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className='space-y-6'>
                {!data.stripeData ? (
                  <div className='text-center py-8 text-muted-foreground'>
                    <CreditCard className='h-12 w-12 mx-auto mb-4 opacity-50' />
                    <p>No payment data available for this user.</p>
                    <p className='text-sm'>User has not made any payments yet.</p>
                  </div>
                ) : (
                  <>
                    {/* Active Subscriptions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className='text-lg'>Active Subscriptions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {data.stripeData.subscriptions.length === 0 ? (
                          <p className='text-muted-foreground'>No active subscriptions</p>
                        ) : (
                          <div className='space-y-3'>
                            {data.stripeData.subscriptions.map((sub) => (
                              <div
                                key={sub.id}
                                className='flex items-center justify-between p-3 bg-muted rounded-lg'
                              >
                                <div>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(sub.status)}`}
                                  >
                                    {sub.status}
                                  </span>
                                  <p className='text-sm mt-1'>
                                    {sub.planAmount && formatCurrency(sub.planAmount, 'usd')}
                                    {sub.planInterval && ` / ${sub.planInterval}`}
                                  </p>
                                </div>
                                <div className='text-right text-sm'>
                                  <p>
                                    Period: {formatDate(sub.currentPeriodStart)} -{' '}
                                    {formatDate(sub.currentPeriodEnd)}
                                  </p>
                                  {sub.cancelAtPeriodEnd && (
                                    <p className='text-yellow-600'>Cancels at period end</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recent Invoices */}
                    <Card>
                      <CardHeader>
                        <CardTitle className='text-lg flex items-center gap-2'>
                          <FileText className='h-4 w-4' />
                          Recent Invoices
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {data.stripeData.invoices.length === 0 ? (
                          <p className='text-muted-foreground'>No invoices found</p>
                        ) : (
                          <div className='space-y-2'>
                            {data.stripeData.invoices.map((invoice) => (
                              <div
                                key={invoice.id}
                                className='flex items-center justify-between p-3 border rounded-lg'
                              >
                                <div className='flex items-center gap-3'>
                                  <DollarSign className='h-4 w-4 text-muted-foreground' />
                                  <div>
                                    <p className='font-medium'>
                                      {formatCurrency(invoice.amountPaid, invoice.currency)}
                                    </p>
                                    <p className='text-sm text-muted-foreground'>
                                      {formatDate(invoice.created)}
                                    </p>
                                  </div>
                                </div>
                                <div className='flex items-center gap-2'>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}
                                  >
                                    {invoice.status}
                                  </span>
                                  {invoice.invoicePdf && (
                                    <a
                                      href={invoice.invoicePdf}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className='text-primary hover:underline'
                                    >
                                      <ExternalLink className='h-4 w-4' />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recent Charges */}
                    <Card>
                      <CardHeader>
                        <CardTitle className='text-lg flex items-center gap-2'>
                          <CreditCard className='h-4 w-4' />
                          Recent Charges
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {data.stripeData.charges.length === 0 ? (
                          <p className='text-muted-foreground'>No charges found</p>
                        ) : (
                          <div className='space-y-2'>
                            {data.stripeData.charges.map((charge) => (
                              <div
                                key={charge.id}
                                className='flex items-center justify-between p-3 border rounded-lg'
                              >
                                <div className='flex items-center gap-3'>
                                  <DollarSign className='h-4 w-4 text-muted-foreground' />
                                  <div>
                                    <p className='font-medium'>
                                      {formatCurrency(charge.amount, charge.currency)}
                                    </p>
                                    <p className='text-sm text-muted-foreground'>
                                      {formatDate(charge.created)}
                                      {charge.description && ` - ${charge.description}`}
                                    </p>
                                  </div>
                                </div>
                                <div className='flex items-center gap-2'>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(charge.status)}`}
                                  >
                                    {charge.status}
                                  </span>
                                  {charge.receiptUrl && (
                                    <a
                                      href={charge.receiptUrl}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className='text-primary hover:underline'
                                    >
                                      <ExternalLink className='h-4 w-4' />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className='space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg flex items-center gap-2'>
                      <Users className='h-4 w-4' />
                      Account Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='grid grid-cols-2 gap-4'>
                    <div>
                      <p className='text-sm text-muted-foreground'>Contacts Created</p>
                      <p className='text-2xl font-bold'>{data.contactsCount}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Last Activity</p>
                      <p className='font-medium'>
                        {data.lastActivity ? formatDateTime(data.lastActivity) : 'No activity'}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Account Age</p>
                      <p className='font-medium'>
                        {Math.floor(
                          (Date.now() - new Date(data.user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                        )}{' '}
                        days
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
