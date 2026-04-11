import mongoose, { Document, Model, Schema } from 'mongoose';
import { Types } from 'mongoose';

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

const PersonMediaSchema = new Schema<PersonMedia>({
  file: String,
  format: String,
  title: String,
  isPrimary: Boolean,
  type: String
}, { _id: false });

const PersonSchema = new Schema<PersonDocument>({
  gedId: { type: String, index: true },
  name: String,
  sex: String,
  birthDate: String,
  deathDate: String,
  media: { type: [PersonMediaSchema], default: [] },
  fams: [{ type: Schema.Types.ObjectId, ref: 'Family' }],
  famc: [{ type: Schema.Types.ObjectId, ref: 'Family' }]
}, { timestamps: true });

const PersonModel: Model<PersonDocument> = mongoose.models.Person as Model<PersonDocument> || mongoose.model<PersonDocument>('Person', PersonSchema);

export default PersonModel;
