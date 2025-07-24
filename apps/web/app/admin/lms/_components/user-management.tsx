'use client';

import { useState, useEffect } from 'react';

import { UserDetailsDialog } from './user-details-dialog';
import { loadUsersAction } from '../_lib/server/load-users-action';
import { debugEnrollmentAction } from '../_lib/server/debug-enrollment-action';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Spinner } from '@kit/ui/spinner';
import { toast } from '@kit/ui/sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'team_manager' | 'learner';
  account: string;
  enrollments: number;
  completions: number;
  last_active: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('🔄 UserManagement: Loading users...');
      const userData = await loadUsersAction();
      console.log('✅ UserManagement: Loaded users:', userData);
      console.log('📊 UserManagement: User count:', userData.length);
      console.log('📊 UserManagement: Users with enrollments:', userData.filter(u => u.enrollments > 0).length);
      
      // Look for the specific user we know has enrollments
      const davidUser = userData.find(u => u.email === 'davidbannon010@gmail.com');
      if (davidUser) {
        console.log('🔍 Found davidbannon010@gmail.com:', davidUser);
      } else {
        console.log('❌ davidbannon010@gmail.com not found in user data!');
      }
      
      setUsers(userData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('❌ UserManagement: Failed to load users:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const runDebugTest = async () => {
    try {
      console.log('🔬 Running enrollment debug test...');
      const debugResult = await debugEnrollmentAction();
      console.log('🔬 Debug test results:', debugResult);
      toast.success('Debug test completed - check console');
    } catch (error) {
      console.error('🔬 Debug test failed:', error);
      toast.error('Debug test failed');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.account.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'team_manager': return 'bg-blue-100 text-blue-800';
      case 'learner': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'team_manager': return 'Team Manager';
      case 'learner': return 'Learner';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">User Management</h2>
            </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Spinner className="mr-2" />
            Loading user data...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadUsers} disabled={loading}>
            🔄 Refresh
          </Button>
          <Button variant="outline" onClick={runDebugTest}>
            🔬 Debug
          </Button>
          <Button>+ Invite User</Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">+12 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Team Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'team_manager').length}
            </div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Learners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'learner' && u.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Learning actively</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(users.reduce((acc, u) => acc + (u.completions / u.enrollments || 0), 0) / users.length * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Course completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="team_manager">Team Manager</SelectItem>
            <SelectItem value="learner">Learner</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
                  {/* User Avatar */}
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full text-primary font-medium">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{user.name}</h4>
                      <Badge variant="secondary" className={getRoleBadgeColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Badge variant="secondary" className={getStatusBadgeColor(user.status)}>
                        {user.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span>{user.account}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>{user.enrollments} enrolled</span>
                        <span>•</span>
                        <span>{user.completions} completed</span>
                        <span>•</span>
                        <span>Last active: {new Date(user.last_active).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {user.enrollments > 0 ? Math.round((user.completions / user.enrollments) * 100) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">completion</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <UserDetailsDialog
                      userId={user.id}
                      userName={user.name}
                    >
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </UserDetailsDialog>
                    <Button variant="ghost" size="sm">
                      ⋮
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