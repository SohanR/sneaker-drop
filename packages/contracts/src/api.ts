export interface BuyerSessionResponse {
  data: { id: string; displayUsername: string; expiresAt: string };
}

export interface AdminLoginResponse {
  data: { accessToken: string; tokenType: "Bearer"; expiresIn: number };
}

export interface RecentPurchaser {
  displayUsername: string;
  completedAt: string;
}

export interface DashboardDrop {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  currency: string;
  totalStock: number;
  availableStock: number;
  startsAt: string;
  stockVersion: string;
  serverTime: string;
  recentPurchasers: RecentPurchaser[];
}

export interface DashboardDropsResponse {
  data: DashboardDrop[];
}
