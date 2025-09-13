"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, UserX, UserPlus, Trash2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface OrphanedUser {
  user_id: string;
  email: string;
  created_at: string;
}

export default function OrphanedUsersPage() {
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const supabase = createClient();

  const loadOrphanedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_orphaned_users');
      
      if (error) {
        console.error('Error loading orphaned users:', error);
        toast.error('Failed to load orphaned users');
      } else {
        setOrphanedUsers(data || []);
        if (data && data.length > 0) {
          toast.warning(`Found ${data.length} orphaned user(s)`);
        } else {
          toast.success('No orphaned users found');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while loading orphaned users');
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (userId: string) => {
    setProcessing(userId);
    try {
      const { data, error } = await supabase.rpc('create_missing_profile', {
        user_id: userId,
        user_role: 'patient' // Default to patient, can be changed
      });
      
      if (error) {
        console.error('Error creating profile:', error);
        toast.error('Failed to create profile');
      } else if (data) {
        toast.success('Profile created successfully');
        await loadOrphanedUsers(); // Reload the list
      } else {
        toast.warning('Profile may already exist');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while creating profile');
    } finally {
      setProcessing(null);
    }
  };

  const deleteOrphanedUser = async (email: string) => {
    if (!confirm(`Are you sure you want to delete the orphaned user with email: ${email}?\n\nThis action cannot be undone!`)) {
      return;
    }

    setProcessing(email);
    try {
      const { data, error } = await supabase.rpc('delete_orphaned_user', {
        user_email: email
      });
      
      if (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete orphaned user');
      } else if (data?.success) {
        toast.success(`Deleted orphaned user: ${email}`);
        await loadOrphanedUsers(); // Reload the list
      } else {
        toast.error(data?.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while deleting user');
    } finally {
      setProcessing(null);
    }
  };

  const repairAllOrphans = async () => {
    setProcessing('all');
    try {
      const { data, error } = await supabase.rpc('repair_all_orphaned_users');
      
      if (error) {
        console.error('Error repairing orphans:', error);
        toast.error('Failed to repair orphaned users');
      } else if (data?.success) {
        toast.success(`Repaired ${data.profiles_created} out of ${data.orphans_found} orphaned users`);
        await loadOrphanedUsers(); // Reload the list
      } else {
        toast.error('Failed to repair orphaned users');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while repairing orphaned users');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    loadOrphanedUsers();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-6 w-6" />
            Orphaned Users Management
          </CardTitle>
          <CardDescription>
            Manage users that exist in auth.users but don&apos;t have profiles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>What are orphaned users?</AlertTitle>
            <AlertDescription>
              These are users that were created in the authentication system but failed to get a profile created. 
              This can happen if the signup process is interrupted or if there&apos;s a database trigger failure.
              You can either create their missing profiles or delete them entirely.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 mb-6">
            <Button onClick={loadOrphanedUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {orphanedUsers.length > 0 && (
              <Button 
                onClick={repairAllOrphans} 
                disabled={processing === 'all'}
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Repair All ({orphanedUsers.length})
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading orphaned users...
            </div>
          ) : orphanedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orphaned users found!</p>
              <p className="text-sm mt-2">All users have proper profiles.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orphanedUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/20"
                >
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      User ID: {user.user_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(user.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createProfile(user.user_id)}
                      disabled={processing === user.user_id || processing === user.email}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Create Profile
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteOrphanedUser(user.email)}
                      disabled={processing === user.user_id || processing === user.email}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete User
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
