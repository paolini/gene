import { Document, Model } from 'mongoose';

export type UserRole = 'guest' | 'editor' | 'admin' | null;

export interface UserDocument extends Document {
  name?: string;
  email: string;
  image?: string;
  role?: UserRole;
  provider?: string;
  providerAccountId?: string;
  emailVerified?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

declare const UserModel: Model<UserDocument>;
export default UserModel;
