import { NextResponse } from "next/server";

// Whole-record deletion is DISABLED (KM-02). The approved scope only allows
// deleting individual Evidence rows inside the record editor; deleting a whole
// knowledge record (content + all evidence + all PIC assignments) has no
// business approval. The route stays in place and answers 405 so that no other
// module or client gains a working deletion path while the decision is pending.
export async function DELETE() {
  return NextResponse.json(
    {
      error: {
        message:
          "Penghapusan record Knowledge Management belum diaktifkan. Hapus evidence satu per satu melalui editor record.",
      },
    },
    { status: 405 },
  );
}
