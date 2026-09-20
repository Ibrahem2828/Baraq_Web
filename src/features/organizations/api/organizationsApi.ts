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

/**
 * What `/my/memberships/` actually returns: three lists, not one.
 *
 * A learner's place in the platform has three parts and they are not
 * interchangeable -- the school they belong to, the classes inside it, and
 * anything still waiting on a teacher. Flattening them would lose exactly
 * the distinction the page exists to show.
 */
export interface MyMemberships {
  organizations: Array<{
    organization: { public_id: string; name: string; organization_type: string };
    member_type: string;
    status: string;
    joined_at: string | null;
  }>;
  classes: Array<{
    classroom: { public_id: string; name: string };
    organization: { public_id: string; name: string };
    status: string;
    joined_at: string | null;
  }>;
  join_requests: Array<{
    public_id: string;
    organization: { public_id: string; name: string };
    classroom: { public_id: string; name: string } | null;
    status: JoinRequestSummary["status"];
    created_at: string;
    decided_at: string | null;
  }>;
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
  return apiClient.get<MyMemberships>(endpoints.organizations.myMemberships);
}
