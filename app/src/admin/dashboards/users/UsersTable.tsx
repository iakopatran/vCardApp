import { useEffect, useState } from 'react';
import { useAuth } from 'wasp/client/auth';
import { getPaginatedUsers, updateIsUserAdminById, useQuery } from 'wasp/client/operations';
import { type User } from 'wasp/entities';
import useDebounce from '../../../client/hooks/useDebounce';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import LoadingSpinner from '../../layout/LoadingSpinner';
import UserDetailModal from './UserDetailModal';

function AdminSwitch({ id, isAdmin }: Pick<User, 'id' | 'isAdmin'>) {
  const { data: currentUser } = useAuth();
  const isCurrentUser = currentUser?.id === id;

  return (
    <Switch
      checked={isAdmin}
      onCheckedChange={(value) => updateIsUserAdminById({ id: id, isAdmin: value })}
      disabled={isCurrentUser}
    />
  );
}

const UsersTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState<string | undefined>(undefined);
  const [isAdminFilter, setIsAdminFilter] = useState<boolean | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleUserRowClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsDetailModalOpen(true);
  };

  const debouncedEmailFilter = useDebounce(emailFilter, 300);

  const skipPages = currentPage - 1;

  const { data, isLoading } = useQuery(getPaginatedUsers, {
    skipPages,
    filter: {
      ...(debouncedEmailFilter && { emailContains: debouncedEmailFilter }),
      ...(isAdminFilter !== undefined && { isAdmin: isAdminFilter }),
    },
  });

  useEffect(
    function backToPageOne() {
      setCurrentPage(1);
    },
    [debouncedEmailFilter, isAdminFilter]
  );

  return (
    <div className='flex flex-col gap-4'>
      <div className='rounded-sm border border-border bg-card shadow'>
        <div className='flex-col flex items-start justify-between p-6 gap-3 w-full bg-muted/40'>
          <span className='text-sm font-medium'>Filters:</span>
          <div className='flex items-center justify-between gap-3 w-full px-2'>
            <div className='relative flex items-center gap-3 '>
              <Label htmlFor='email-filter' className='text-sm text-muted-foreground'>
                email:
              </Label>
              <Input
                type='text'
                id='email-filter'
                placeholder='dude@example.com'
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setEmailFilter(value === '' ? undefined : value);
                }}
              />
              <div className='flex items-center gap-2'>
                <Label htmlFor='admin-filter' className='text-sm ml-2 text-muted-foreground'>
                  isAdmin:
                </Label>
                <Select
                  onValueChange={(value) => {
                    if (value === 'both') {
                      setIsAdminFilter(undefined);
                    } else {
                      setIsAdminFilter(value === 'true');
                    }
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='both' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='both'>both</SelectItem>
                    <SelectItem value='true'>true</SelectItem>
                    <SelectItem value='false'>false</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {data?.totalPages && (
              <div className='max-w-60 flex flex-row items-center'>
                <span className='text-md mr-2 text-foreground'>page</span>
                <Input
                  type='number'
                  min={1}
                  defaultValue={currentPage}
                  max={data?.totalPages}
                  onChange={(e) => {
                    const value = parseInt(e.currentTarget.value);
                    if (data?.totalPages && value <= data?.totalPages && value > 0) {
                      setCurrentPage(value);
                    }
                  }}
                  className='w-20'
                />
                <span className='text-md text-foreground'> /{data?.totalPages} </span>
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-8 border-t-4 border-border py-4.5 px-4 md:px-6 '>
          <div className='col-span-3 flex items-center'>
            <p className='font-medium'>Email / Username</p>
          </div>
          <div className='col-span-2 flex items-center'>
            <p className='font-medium'>Credits</p>
          </div>
          <div className='col-span-2 flex items-center'>
            <p className='font-medium'>Total Spent</p>
          </div>
          <div className='col-span-1 flex items-center'>
            <p className='font-medium'>Is Admin</p>
          </div>
        </div>
        {isLoading && <LoadingSpinner />}
        {!!data?.users &&
          data?.users?.length > 0 &&
          data.users.map((user) => (
            <div
              key={user.id}
              className='grid grid-cols-8 gap-4 py-4.5 px-4 md:px-6 cursor-pointer hover:bg-muted/50 transition-colors'
              onClick={() => handleUserRowClick(user.id)}
            >
              <div className='col-span-3 flex items-center'>
                <div className='flex flex-col gap-1 '>
                  <p className='text-sm text-foreground'>{user.email}</p>
                  <p className='text-sm text-muted-foreground'>{user.username}</p>
                </div>
              </div>
              <div className='col-span-2 flex items-center'>
                <p className='text-sm text-foreground'>{user.credits}</p>
              </div>
              <div className='col-span-2 flex items-center'>
                <p className='text-sm text-foreground'>${user.totalSpent.toFixed(2)}</p>
              </div>
              <div className='col-span-1 flex items-center' onClick={(e) => e.stopPropagation()}>
                <div className='text-sm text-foreground'>
                  <AdminSwitch {...user} />
                </div>
              </div>
            </div>
          ))}
      </div>

      <UserDetailModal
        userId={selectedUserId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedUserId(null);
        }}
      />
    </div>
  );
};

export default UsersTable;
