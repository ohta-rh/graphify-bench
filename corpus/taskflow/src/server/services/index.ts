/**
 * Barrel for the service layer; Server Actions import from here.
 *
 * Each service is exposed as a namespace so a call site reads
 * `issueService.createIssue(actor, input)` — the actor-first convention stays
 * visible, and two services may share a method name without colliding.
 */
export * as activityService from "./activity-service";
export * as attachmentService from "./attachment-service";
export * as authService from "./auth-service";
export * as billingService from "./billing-service";
export * as commentService from "./comment-service";
export * as digestService from "./digest-service";
export * as emailService from "./email-service";
export * as featureFlagService from "./feature-flag-service";
export * as invitationService from "./invitation-service";
export * as issueService from "./issue-service";
export * as labelService from "./label-service";
export * as memberService from "./member-service";
export * as notificationService from "./notification-service";
export * as organizationService from "./organization-service";
export * as projectService from "./project-service";
export * as searchService from "./search-service";
export * as sessionService from "./session-service";
export * as usageService from "./usage-service";
export * as webhookService from "./webhook-service";

export {
  registerEventHandlers,
  unregisterEventHandlers,
} from "./event-registry";

export type { ActivityRecordInput } from "./activity-service";
export type {
  EmailTemplate,
  OutgoingEmail,
  RenderedEmail,
} from "./email-service";
export type { NotificationPayload } from "./notification-service";
export type { SearchHit } from "./search-service";
