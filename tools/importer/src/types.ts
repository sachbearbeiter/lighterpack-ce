/**
 * MongoDB source types — shape of the raw user document from a lighterpack dump.
 * Fields are optional because old documents may be missing them.
 */

export interface MongoUser {
  _id: { $oid: string } | string;
  username?: string;
  email?: string;
  /** bcrypt hash — NOT imported into the new system */
  password?: string;
  /** Session token — NOT imported */
  token?: string;
  syncToken?: number;
  externalIds?: string[];
  library?: MongoLibrary;
}

export interface MongoLibrary {
  version?: string;
  sequence?: number;
  defaultListId?: number | string;
  totalUnit?: string;
  itemUnit?: string;
  currencySymbol?: string;
  showSidebar?: boolean;
  showImages?: boolean;
  optionalFields?: {
    worn?: boolean;
    consumable?: boolean;
    price?: boolean;
    images?: boolean;
    listDescription?: boolean;
  };
  items?: MongoItem[];
  categories?: MongoCategory[];
  lists?: MongoList[];
}

export interface MongoItem {
  id?: number | string;
  name?: string;
  description?: string;
  weight?: number;
  authorUnit?: string;
  price?: number | string;
  image?: string;
  imageUrl?: string;
  url?: string;
}

export interface MongoCategory {
  id?: number | string;
  name?: string;
  color?: unknown;
  categoryItems?: MongoCategoryItem[];
}

export interface MongoCategoryItem {
  itemId?: number | string;
  qty?: number;
  worn?: boolean | number;
  consumable?: boolean | number;
  star?: number;
  sortOrder?: number;
}

export interface MongoList {
  id?: number | string;
  name?: string;
  externalId?: string;
  description?: string;
  categoryIds?: (number | string)[];
  chart?: unknown;
}
