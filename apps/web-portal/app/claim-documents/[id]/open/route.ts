import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth-server";

const FRESH_SIGNED_URL_SECONDS = 60 * 10;

type ClaimDocumentStorageRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: document, error } = await supabase
    .from("claim_documents")
    .select("id, storage_bucket, storage_path")
    .eq("id", id)
    .maybeSingle<ClaimDocumentStorageRow>();

  if (error || !document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(document.storage_bucket)
    .createSignedUrl(document.storage_path, FRESH_SIGNED_URL_SECONDS);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: signedError?.message ?? "Unable to open document." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
