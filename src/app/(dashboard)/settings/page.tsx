/**
 * Settings Page
 * 
 * User profile management, password change, and account deletion.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Loader2, Trash2, Save, Key, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  profileImage: string | null;
  provider: 'credentials' | 'google';
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile form state
  const [name, setName] = useState('');
  const [profileImage, setProfileImage] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data = await response.json();
        setUser(data);
        setName(data.name || '');
        setProfileImage(data.profileImage || '');
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          profileImage: profileImage.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to update profile';
        // Provide more specific error messages
        if (errorMessage.includes('configuration') || errorMessage.includes('Configuration')) {
          toast.error('Account configuration error. Please contact support.');
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      setUser(data);
      toast.success('Profile updated successfully!');
      // Refresh session to update header
      router.refresh();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to change password';
        // Provide more specific error messages
        if (errorMessage.includes('configuration') || errorMessage.includes('Configuration')) {
          toast.error('Password change configuration error. Please contact support.');
        } else if (errorMessage.includes('Google accounts')) {
          toast.error('Password change is not available for Google accounts');
        } else if (errorMessage.includes('incorrect')) {
          toast.error('Current password is incorrect');
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAccountDelete = async () => {
    setIsDeleting(true);

    try {
      // For credentials users, verify password
      const body: { password?: string } = {};
      if (user?.provider === 'credentials' && deletePassword) {
        body.password = deletePassword;
      }

      const response = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete account');
        setIsDeleting(false);
        return;
      }

      toast.success('Account deleted successfully');
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isOAuthUser = user.provider === 'google';

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profile">
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Key className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Avatar Preview */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profileImage || user.profileImage || undefined} alt={user.name} />
                    <AvatarFallback className="text-lg">
                      {getInitials(name || user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {name || user.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </div>

                <Input
                  label="Name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={1}
                  maxLength={50}
                  disabled={isSaving}
                />

                <Input
                  label="Profile Image URL (optional)"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  disabled={isSaving}
                />

                <div className="flex gap-4">
                  <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Password Change */}
          {!isOAuthUser && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <Input
                    type="password"
                    label="Current Password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    disabled={isChangingPassword}
                  />

                  <Input
                    type="password"
                    label="New Password"
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={100}
                    disabled={isChangingPassword}
                  />

                  <Input
                    type="password"
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isChangingPassword}
                  />

                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-red-500">Passwords do not match</p>
                  )}

                  <Button type="submit" isLoading={isChangingPassword} disabled={isChangingPassword}>
                    <Key className="mr-2 h-4 w-4" />
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {isOAuthUser && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-slate-600 dark:text-slate-400">
                  Password management is not available for Google OAuth accounts.
                </p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Account Deletion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove all your data from our servers.
                      {!isOAuthUser && ' Please enter your password to confirm.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                    {!isOAuthUser && (
                      <Input
                        type="password"
                        label="Password"
                        placeholder="Enter your password to confirm"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        disabled={isDeleting}
                      />
                    )}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="delete-confirm"
                        checked={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.checked)}
                        disabled={isDeleting}
                        className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                      <label
                        htmlFor="delete-confirm"
                        className="text-sm font-medium text-slate-900 dark:text-white"
                      >
                        I understand this action is irreversible
                      </label>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleAccountDelete}
                      disabled={
                        isDeleting ||
                        !deleteConfirm ||
                        (!isOAuthUser && !deletePassword)
                      }
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Account'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

