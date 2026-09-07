import { db } from "../database";
import type { Collection } from "../../models";
import { createId, nowIso } from "../../utils/id";

export async function addCollection(
  name: string,
  description?: string,
): Promise<Collection> {
  const timestamp = nowIso();
  const collection: Collection = {
    id: createId(),
    name,
    description,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.collections.add(collection);
  return collection;
}

export async function updateCollection(
  id: string,
  changes: Partial<Pick<Collection, "name" | "description">>,
): Promise<void> {
  await db.collections.update(id, { ...changes, updatedAt: nowIso() });
}

export async function deleteCollection(id: string): Promise<void> {
  await db.transaction("rw", db.collections, db.scriptures, async () => {
    await db.collections.delete(id);
    const affected = await db.scriptures
      .filter((s) => s.collectionIds.includes(id))
      .toArray();
    await Promise.all(
      affected.map((s) =>
        db.scriptures.update(s.id, {
          collectionIds: s.collectionIds.filter((c) => c !== id),
        }),
      ),
    );
  });
}

export async function getAllCollections(): Promise<Collection[]> {
  return db.collections.toArray();
}
