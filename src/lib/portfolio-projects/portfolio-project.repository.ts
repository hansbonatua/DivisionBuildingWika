import { Collection, Db, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type {
  NewPortfolioProjectDocument,
  PortfolioProjectDocument,
  PortfolioProjectPublic,
} from "@/lib/portfolio-projects/portfolio-project.types";

// Pure MongoDB access. No HTTP logic, no validation here.
const COLLECTION = "portfolio_projects";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<PortfolioProjectDocument>> {
  const db: Db = await getDb();
  const collection = db.collection<PortfolioProjectDocument>(COLLECTION);
  if (!indexesEnsured) {
    // Idempotent; runs once per server process. No unique index on sortOrder.
    // Manual equivalent:
    //   db.portfolio_projects.createIndex({ status: 1, sortOrder: 1 })
    await collection.createIndex({ status: 1, sortOrder: 1 });
    indexesEnsured = true;
  }
  return collection;
}

export async function findAll(): Promise<PortfolioProjectDocument[]> {
  const collection = await getCollection();
  return collection.find({}).sort({ sortOrder: 1 }).toArray();
}

export async function findById(id: string): Promise<PortfolioProjectDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function insertOne(data: NewPortfolioProjectDocument): Promise<PortfolioProjectDocument> {
  const collection = await getCollection();
  const result = await collection.insertOne(data as PortfolioProjectDocument);
  const created = await collection.findOne({ _id: result.insertedId });
  if (!created) {
    throw new Error("Failed to read inserted portfolio project document");
  }
  return created;
}

export async function updateById(
  id: string,
  patch: Partial<Omit<PortfolioProjectDocument, "_id" | "createdAt">>,
): Promise<PortfolioProjectDocument | null> {
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

export async function findActivePublic(): Promise<PortfolioProjectPublic[]> {
  const collection = await getCollection();
  return collection
    .find({ status: "Active" })
    .sort({ sortOrder: 1 })
    .project<PortfolioProjectPublic>({
      _id: 0,
      title: 1,
      category: 1,
      location: 1,
      imageUrl: 1,
      imageAlt: 1,
    })
    .toArray();
}
