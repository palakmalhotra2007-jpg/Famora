import { Document, Types } from 'mongoose';

export function toApiDoc<T extends Document>(
  doc: T | null | undefined
): Record<string, unknown> | null {
  if (!doc) return null;

  const obj = doc.toObject({ virtuals: true }) as Record<string, unknown>;
  obj.id = String(obj._id);
  delete obj._id;
  delete obj.__v;
  return obj;
}

export function toApiDocs<T extends Document>(docs: T[]): Record<string, unknown>[] {
  return docs.map((doc) => toApiDoc(doc)!);
}

export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date: Date = new Date()): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
