export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  restaurantGroupId?: string | null;
  restaurantIds?: string[];
}

export interface UserRestaurant {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export type UserRole = 'owner' | 'manager' | 'staff' | 'super_admin';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  restaurants: UserRestaurant[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
