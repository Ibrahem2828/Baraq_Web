import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

/**
 * What a learner is shown before committing to anything.
 *
 * Names only. The backend deliberately returns no member list, no email
 * addresses and no counts here, because this endpoint answers questions from
 * whoever holds the code -- including someone who found it on a photographed
 * whiteboard. Enough to recognise the school; nothing to harvest.
 */
export interface JoinPreview {
  organization: { name: string; organization_type: string };
  classroom: { name: string } | null;
}

export interface JoinRequestSummary {
  public_id: string;
  organization: string;
  classroom: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  created_at: string;
  decided_at: string | null;
}

export interface Membership {
  organization: { name: string; organization_type: string };
  classroom: { name: string } | null;
  status: string;
  joined_at: string | null;
}

/** A link carries a token; a whiteboard carries a code. Either resolves. */
export interface JoinCredential {
  token?: string;
  code?: string;
}

export function previewInvitation(credential: JoinCredential) {
  return apiClient.post<JoinPreview>(endpoints.organizations.joinPreview, credential);
}

export function confirmInvitation(credential: JoinCredential) {
  return apiClient.post<JoinRequestSummary>(endpoints.organizations.joinConfirm, credential);
}

export function listMyMemberships() {
  return apiClient.get<Membership[]>(endpoints.organizations.myMemberships);
}
