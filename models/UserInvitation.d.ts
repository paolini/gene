import { Document, Types, Model } from 'mongoose';

export interface UserInvitationDocument extends Document {
  token: string;
  role: 'guest' | 'editor' | 'admin';
  isReusable: boolean;
  isActive: boolean;
  createdBy?: Types.ObjectId | null;
  usedBy?: Types.ObjectId | null;
  usedAt?: Date | null;
  lastUsedBy?: Types.ObjectId | null;
  lastUsedAt?: Date | null;
  redemptionCount: number;
  disabledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

declare const UserInvitationModel: Model<UserInvitationDocument>;
export default UserInvitationModel;
