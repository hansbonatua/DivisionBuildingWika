import { Collection, Db, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type {
  NewSocialPostDocument,
  SocialPostDocument,
  SocialPostPublic,
} from "@/lib/social-posts/social-post.types";

// Pure MongoDB access. No HTTP logic, no validation here.
const COLLECTION = "social_posts";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<SocialPostDocument>> {
  const db: Db = await getDb();
  const collection = db.collection<SocialPostDocument>(COLLECTION);
  if (!indexesEnsured) {
    // Idempotent; runs once per server process. No unique index on sortOrder.
    // Manual equivalent:
    //   db.social_posts.createIndex({ status: 1, sortOrder: 1 })
    await collection.createIndex({ status: 1, sortOrder: 1 });
    indexesEnsured = true;
  }
  return collection;
}

export async function findAll(): Promise<SocialPostDocument[]> {
  const collection = await getCollection();
  return collection.find({}).sort({ sortOrder: 1 }).toArray();
}

export async function findById(id: string): Promise<SocialPostDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function insertOne(data: NewSocialPostDocument): Promise<SocialPostDocument> {
  const collection = await getCollection();
  const result = await collection.insertOne(data as SocialPostDocument);
  const created = await collection.findOne({ _id: result.insertedId });
  if (!created) {
    throw new Error("Failed to read inserted social post document");
  }
  return created;
}

export async function updateById(
  id: string,
  patch: Partial<Omit<SocialPostDocument, "_id" | "createdAt">>,
): Promise<SocialPostDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await getCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: patch },
    { returnDocument: "after" },
  );
  return result;
}

export async function deleteById(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }
  const collection = await getCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function getMaxSortOrder(): Promise<number | null> {
  const collection = await getCollection();
  const top = await collection.find({}).sort({ sortOrder: -1 }).limit(1).toArray();
  return top.length > 0 ? top[0].sortOrder : null;
}

export async function findPublishedPublic(): Promise<SocialPostPublic[]> {
  const collection = await getCollection();
  return collection
    .find({ status: "Published" })
    .sort({ sortOrder: 1 })
    .project<SocialPostPublic>({
      _id: 0,
      platform: 1,
      account: 1,
      caption: 1,
      url: 1,
      type: 1,
      imageUrl: 1,
    })
    .toArray();
}
