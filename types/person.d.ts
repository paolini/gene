export interface PersonName {
  given: string[];
  surname?: string;
  full?: string;
}

export interface PersonEvent {
  date?: string;
  place?: string;
  note?: string;
}

export interface Person {
  _id?: string;
  gedcomId?: string;
  name: PersonName;
  sex?: "M" | "F" | "U";
  birth?: PersonEvent;
  death?: PersonEvent;
  fams?: string[]; // family ids where person is spouse
  famc?: string | null; // family id where person is child
}
