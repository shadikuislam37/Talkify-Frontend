export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  image?: string | null;
  
  // Eigulo optional (?) banai din:
  phone?: string | null;
  role?: string;
  phoneVerified?: boolean;
}