import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { PgUser } from "@/lib/pg/schema";
import type { UpdateUserInput } from "@/lib/users/schema";

// The last-active-Admin rule is exercised through the service with the
// persistence boundary replaced by in-memory stubs: no database, no bcrypt, no
// session rows. Only the guard (and the activity row it should produce when the
// change is allowed) is under test here.
//
// The stubs are installed into require.cache BEFORE the service is required, so
// the service binds to them at load time — the same pattern the recharts stub in
// MslSection.test.tsx uses.

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_ID = "22222222-2222-4222-8222-222222222222";

type RepositoryStub = {
  findUserById(id: string): Promise<PgUser | null>;
  findUserByNip(nip: string): Promise<PgUser | null>;
  findUserByEmail(email: string): Promise<PgUser | null>;
  countActiveAdmins(): Promise<number>;
  updateUser(id: string, data: Partial<PgUser>): Promise<PgUser | null>;
  createUser(): Promise<never>;
  deleteUser(): Promise<null>;
  listUsers(): Promise<PgUser[]>;
};

let target: PgUser;
let activeAdminCount = 1;
const updateCalls: Array<{ id: string; data: Partial<PgUser> }> = [];
const activityCalls: Array<{
  actorId: string;
  action: string;
  entityType: string;
  title: string;
}> = [];

// zod's transform() makes phone/password/photoUrl required in the OUTPUT type,
// so a valid patch always carries them; "undefined" password means "unchanged".
function userPatch(overrides: Partial<UpdateUserInput>): UpdateUserInput {
  return {
    phone: null,
    password: undefined,
    photoUrl: null,
    ...overrides,
  };
}

function makeUser(overrides: Partial<PgUser> = {}): PgUser {
  return {
    id: USER_ID,
    name: "Budi Santoso",
    email: "budi@wika.co.id",
    passwordHash: "stored-hash",
    phone: null,
    nip: "123456",
    position: "Staff",
    photoUrl: null,
    role: "Admin",
    status: "active",
    mslAccess: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

target = makeUser();

const repositoryStub: RepositoryStub = {
  findUserById: async (id) => (target.id === id ? target : null),
  findUserByNip: async (nip) =>
    target.nip !== null && target.nip === nip ? target : null,
  findUserByEmail: async (email) =>
    target.email.toLowerCase() === email.toLowerCase() ? target : null,
  countActiveAdmins: async () => activeAdminCount,
  updateUser: async (id, data) => {
    updateCalls.push({ id, data });
    target = { ...target, ...data };
    return target;
  },
  createUser: async () => {
    throw new Error("createUser must not be called in this test");
  },
  deleteUser: async () => null,
  listUsers: async () => [target],
};

function installStub(specifier: string, exports: unknown): void {
  const id = require.resolve(specifier);
  require.cache[id] = {
    id,
    filename: id,
    loaded: true,
    exports,
  } as unknown as NodeModule;
}

installStub("@/lib/users/repository", repositoryStub);
installStub("@/lib/activity-log/service", {
  logActivity: async (
    actorId: string,
    action: string,
    entityType: string,
    title: string,
  ) => {
    activityCalls.push({ actorId, action, entityType, title });
  },
});
installStub("@/lib/auth/password", {
  hashPassword: async () => "new-hash",
});
installStub("@/lib/auth/session", {
  deleteUserSessions: async () => undefined,
});

let headPhotoResult: {
  pathname: string;
  size: number;
  contentType: string;
  url: string;
} | null = null;
let headPhotoCalls = 0;
const deletePhotoCalls: string[] = [];
let photoReachable: boolean | null = true;

// Keep the real error classes so the service's `instanceof` checks stay valid;
// only the storage calls are replaced.
/* eslint-disable @typescript-eslint/no-require-imports */
const realPublicImageModule = require(
  "@/lib/storage/public-image",
) as typeof import("@/lib/storage/public-image");
/* eslint-enable @typescript-eslint/no-require-imports */

installStub("@/lib/storage/public-image", {
  ...realPublicImageModule,
  headPublicCmsImage: async (pathname: string) => {
    headPhotoCalls += 1;
    return headPhotoResult && headPhotoResult.pathname === pathname
      ? headPhotoResult
      : null;
  },
  deletePublicCmsBlob: async (pathname: string) => {
    deletePhotoCalls.push(pathname);
    return { deleted: true, reason: "deleted" };
  },
  isPublicImageReachable: async () => photoReachable,
});

/* eslint-disable @typescript-eslint/no-require-imports */
const { CannotChangeLastAdminRoleError, InvalidUserPhotoError, updateSafeUser } =
  require("@/lib/users/service") as typeof import("@/lib/users/service");
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => {
  target = makeUser();
  activeAdminCount = 1;
  repositoryStub.countActiveAdmins = async () => activeAdminCount;
  updateCalls.length = 0;
  activityCalls.length = 0;
  headPhotoResult = null;
  headPhotoCalls = 0;
  deletePhotoCalls.length = 0;
  photoReachable = true;
});

describe("updateSafeUser — proteksi Admin aktif terakhir", () => {
  it("menolak menurunkan role Admin aktif terakhir tanpa menyentuh database", async () => {
    await assert.rejects(
      updateSafeUser(USER_ID, userPatch({ role: "Head Office" }), ACTOR_ID, "Admin"),
      (error: unknown) => {
        assert.equal(error instanceof CannotChangeLastAdminRoleError, true);
        assert.equal(
          (error as Error).message,
          "Admin aktif terakhir tidak dapat diubah rolenya",
        );
        return true;
      },
    );

    assert.equal(updateCalls.length, 0);
    assert.equal(activityCalls.length, 0);
    assert.equal(target.role, "Admin");
  });

  it("mengizinkan penurunan role bila masih ada Admin aktif lain dan mencatat aktivitas", async () => {
    activeAdminCount = 2;

    const updated = await updateSafeUser(
      USER_ID,
      userPatch({ role: "Head Office" }),
      ACTOR_ID,
      "Admin",
    );

    assert.equal(updated.role, "Head Office");
    assert.equal(updateCalls.length, 1);
    assert.equal(updateCalls[0]?.data.role, "Head Office");
    assert.equal(activityCalls.length, 1);
    assert.deepEqual(activityCalls[0], {
      actorId: ACTOR_ID,
      action: "UPDATE",
      entityType: "USER",
      title: "Budi Santoso — role Admin → Head Office",
    });
  });

  it("tidak membatasi penurunan role non-Admin meskipun hanya ada satu Admin aktif", async () => {
    target = makeUser({ role: "Head Office" });
    activeAdminCount = 1;

    const updated = await updateSafeUser(
      USER_ID,
      userPatch({ role: "Project" }),
      ACTOR_ID,
      "Admin",
    );

    assert.equal(updated.role, "Project");
    assert.equal(updateCalls.length, 1);
    assert.equal(activityCalls.length, 1);
    assert.equal(activityCalls[0]?.entityType, "USER");
  });

  it("mengizinkan penurunan role Admin yang sedang suspended", async () => {
    target = makeUser({ status: "suspended" });
    activeAdminCount = 1;

    const updated = await updateSafeUser(
      USER_ID,
      userPatch({ role: "Management" }),
      ACTOR_ID,
      "Admin",
    );

    assert.equal(updated.role, "Management");
    assert.equal(updateCalls.length, 1);
  });

  it("tidak memanggil countActiveAdmins saat role tidak berubah", async () => {
    let countCalls = 0;
    repositoryStub.countActiveAdmins = async () => {
      countCalls += 1;
      return activeAdminCount;
    };

    await updateSafeUser(USER_ID, userPatch({ role: "Admin" }), ACTOR_ID, "Admin");

    assert.equal(countCalls, 0);
  });
});

describe("updateSafeUser — verifikasi foto profil", () => {
  const OTHER_ID = "33333333-3333-4333-8333-333333333333";
  const UPLOAD_ID = "44444444-4444-4444-8444-444444444444";

  function photoUrlFor(userId: string): string {
    return `https://bdwika-cms.public.blob.vercel-storage.com/user-photos/${userId}/${UPLOAD_ID}/avatar-budi.jpg`;
  }

  it("menerima URL eksternal tanpa memverifikasi storage", async () => {
    const updated = await updateSafeUser(
      USER_ID,
      userPatch({ photoUrl: "https://example.com/foto.jpg" }),
      ACTOR_ID,
      "Admin",
    );

    assert.equal(updated.photoUrl, "https://example.com/foto.jpg");
    assert.equal(headPhotoCalls, 0);
    assert.equal(updateCalls.length, 1);
  });

  it("menolak URL di namespace user sendiri bila objek tidak ditemukan", async () => {
    headPhotoResult = null;

    await assert.rejects(
      updateSafeUser(
        USER_ID,
        userPatch({ photoUrl: photoUrlFor(USER_ID) }),
        ACTOR_ID,
        "Admin",
      ),
      (error: unknown) => error instanceof InvalidUserPhotoError,
    );

    assert.equal(headPhotoCalls, 1);
    assert.equal(updateCalls.length, 0);
  });

  it("memperlakukan namespace user lain sebagai URL eksternal", async () => {
    const otherUrl = photoUrlFor(OTHER_ID);

    const updated = await updateSafeUser(
      USER_ID,
      userPatch({ photoUrl: otherUrl }),
      ACTOR_ID,
      "Admin",
    );

    assert.equal(updated.photoUrl, otherUrl);
    assert.equal(headPhotoCalls, 0);
  });

  it("menerima foto tersimpan yang valid lalu menghapus foto lama di namespace sendiri", async () => {
    const oldUrl = photoUrlFor(USER_ID);
    const newUrl = `https://bdwika-cms.public.blob.vercel-storage.com/user-photos/${USER_ID}/${UPLOAD_ID}/avatar-baru.jpg`;
    target = makeUser({ photoUrl: oldUrl });
    headPhotoResult = {
      pathname: `user-photos/${USER_ID}/${UPLOAD_ID}/avatar-baru.jpg`,
      size: 1024,
      contentType: "image/jpeg",
      url: newUrl,
    };

    const updated = await updateSafeUser(
      USER_ID,
      userPatch({ photoUrl: newUrl }),
      ACTOR_ID,
      "Admin",
    );

    assert.equal(updated.photoUrl, newUrl);
    assert.deepEqual(deletePhotoCalls, [
      `user-photos/${USER_ID}/${UPLOAD_ID}/avatar-budi.jpg`,
    ]);
  });
});
