
import { useState } from 'react';
import { useResource } from '@/shared/hooks/useResource';
import { usersService, getUserRolesWithRetry } from '@/entities/user/api/user.service';
import { UserResponse } from '@/shared/api/generated/swaggerTypes';
import api from "@/shared/api/client";
// import { userStatsToChartData } from '@/shared/utils/dataUtils';


interface RoleInfo {
  count: number;
  percentage: number;
}
interface RolesResponse {
  roles: Record<string, RoleInfo>;
  total_users: number;
}
interface RoleArrayItem {
  role: string;
  count: number;
  percentage: number;
}
interface UserRolesData extends RolesResponse {
  rolesArray: RoleArrayItem[];
}

export const useUsers = (options?: { autoFetch?: boolean }) => {
  const resource = useResource<UserResponse, any>(usersService as any, {
    autoFetch: options?.autoFetch !== false,
  });

  // Custom state for roles and status
  // const [usersStatusData, setUsersStatusData] = useState<ChartDataItem[]>([]);
  const [userRolesData, setUserRolesData] = useState<any[] | UserRolesData>([]);
  const [userStatusData, setUserStatusData] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const fetchUserRoles = async () => {
    setLoadingRoles(true);
    try {
      const data: RolesResponse = await getUserRolesWithRetry();
      if (data && data.roles) {
        const rolesArray: RoleArrayItem[] = Object.entries(data.roles).map(([role, info]: [string, RoleInfo]) => ({
          role,
          count: info.count,
          percentage: info.percentage
        }));
        const userRolesData: UserRolesData = { ...data, rolesArray };
        setUserRolesData(userRolesData);
      } else {
        setUserRolesData({ ...data, rolesArray: [] });
      }
    } catch (err) {
      setUserRolesData([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchUserStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await api.get('/users/status');
      setUserStatusData(response.data);
    } catch (error) {
      console.error('Error fetching user status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  return {
  ...resource,
  users: (resource as any).data,
  addUser: (resource as any).createItem,
  editUser: (resource as any).updateItem,
  deleteUser: (resource as any).deleteItem,
    userRolesData,
    userStatusData,
    loadingRoles,
    loadingStatus,
    fetchUserRoles,
    fetchUserStatus,
  };
};

