/**
 * Barrel for the data-access layer.
 *
 * Services import the namespace they need (`import * as issueRepo from
 * "@/server/repositories/issue-repository"`) — this barrel exists for the few
 * call sites that touch several tables at once, and to give the layer one
 * documented entry point. Nothing outside `src/server/**` may import it: the
 * app and component layers go through `src/server/services`.
 */
export * as activityRepository from "./activity-repository";
export * as attachmentRepository from "./attachment-repository";
export * as commentRepository from "./comment-repository";
export * as invitationRepository from "./invitation-repository";
export * as invoiceRepository from "./invoice-repository";
export * as issueRepository from "./issue-repository";
export * as labelRepository from "./label-repository";
export * as memberRepository from "./member-repository";
export * as notificationPreferenceRepository from "./notification-preference-repository";
export * as notificationRepository from "./notification-repository";
export * as organizationRepository from "./organization-repository";
export * as projectMemberRepository from "./project-member-repository";
export * as projectRepository from "./project-repository";
export * as searchRepository from "./search-repository";
export * as sessionRepository from "./session-repository";
export * as subscriptionRepository from "./subscription-repository";
export * as usageRepository from "./usage-repository";
export * as userRepository from "./user-repository";
export * as webhookRepository from "./webhook-repository";

export {
  decodeCursor,
  encodeCursor,
  livePredicate,
  orgPredicate,
} from "./base-repository";
export type { SearchSubjectKind } from "./search-repository";
