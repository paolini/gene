import { Document, Types, Model } from 'mongoose';

export interface PersonMedia {
  file?: string;
  format?: string;
  title?: string;
  isPrimary?: boolean;
  type?: string;
}

export interface PersonDocument extends Document {
  gedId?: string;
  name?: string;
  sex?: string;
  birthDate?: string;
  deathDate?: string;
  media: PersonMedia[];
  fams: Types.ObjectId[];
  famc: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

declare const PersonModel: Model<PersonDocument>;
export default PersonModel;
