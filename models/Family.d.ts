import { Document, Types, Model } from 'mongoose';

export interface FamilyDocument extends Document {
  gedId?: string;
  husband?: Types.ObjectId | null;
  wife?: Types.ObjectId | null;
  children: Types.ObjectId[];
  events: Record<string, any>;
  notes: string[];
  raw?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

declare const FamilyModel: Model<FamilyDocument>;
export default FamilyModel;
