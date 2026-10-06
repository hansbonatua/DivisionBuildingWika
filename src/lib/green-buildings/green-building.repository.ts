import { Collection, Db, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type {
  GreenBuildingCertificateDocument,
  GreenBuildingCertificatePublic,
  NewGreenBuildingCertificateDocument,
} from "@/lib/green-buildings/green-building.types";

// Pure MongoDB access. No HTTP logic, no validation here.
const COLLECTION = "green_building_certificates";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<GreenBuildingCertificateDocument>> {
  const db: Db = await getDb();
  const collection = db.collection<GreenBuildingCertificateDocument>(COLLECTION);
  if (!indexesEnsured) {
    // Idempotent; runs once per server process. No unique index on sortOrder.
    // Manual equivalent:
    //   db.green_building_certificates.createIndex({ publishStatus: 1, sortOrder: 1 })
    await collection.createIndex({ publishStatus: 1, sortOrder: 1 });
    indexesEnsured = true;
  }
  return collection;
}

export async function findAll(): Promise<GreenBuildingCertificateDocument[]> {
  const collection = await getCollection();
  return collection.find({}).sort({ sortOrder: 1 }).toArray();
}

export async function findById(id: string): Promise<GreenBuildingCertificateDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function insertOne(
  data: NewGreenBuildingCertificateDocument,
): Promise<GreenBuildingCertificateDocument> {
  const collection = await getCollection();
  const result = await collection.insertOne(data as GreenBuildingCertificateDocument);
  const created = await collection.findOne({ _id: result.insertedId });
  if (!created) {
    throw new Error("Failed to read inserted green building certificate document");
  }
  return created;
}

export async function updateById(
  id: string,
  patch: Partial<Omit<GreenBuildingCertificateDocument, "_id" | "createdAt">>,
): Promise<GreenBuildingCertificateDocument | null> {
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

export async function findPublishedPublic(): Promise<GreenBuildingCertificatePublic[]> {
  const collection = await getCollection();
  return collection
    .find({ publishStatus: "Published" })
    .sort({ sortOrder: 1 })
    .project<GreenBuildingCertificatePublic>({
      _id: 0,
      projectName: 1,
      certificationBody: 1,
      imageUrl: 1,
      imageAlt: 1,
      level: 1,
      year: 1,
      score: 1,
      description: 1,
    })
    .toArray();
}
