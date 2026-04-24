# AI Chat Assistant

## Status
In progress: the assistant now has durable conversation history, typed workflow confirmations, assistant run/tool logging, role-aware capability gating, analytics/feedback endpoints, and dashboard views for chat history, insights, and settings. Database migration rollout and full end-to-end validation still remain.

## Goal
Provide a tenant-aware AI assistant inside the dashboard that helps school staff complete real operational tasks in natural language with safe tool execution, clear confirmations, and auditable outcomes.

## Users
- School administrators
- Front desk and bursary staff
- Academic operations staff
- Inventory and records staff

## Current Scope
- Dashboard widget entry point via `apps/dashboard/src/components/chat/chat-widget.tsx`
- Sliding chat panel UI via `apps/dashboard/src/components/chat/chat-panel.tsx`
- Client-side streaming/message state via `apps/dashboard/src/components/chat/use-school-chat.ts`
- Tool-aware message rendering via `apps/dashboard/src/components/chat/chat-message.tsx`
- Server route and tool execution via `apps/dashboard/src/app/api/chat/route.ts`
- Conversation/history endpoints via `apps/dashboard/src/app/api/chat/conversations/**`
- Settings, analytics, and feedback endpoints via `apps/dashboard/src/app/api/chat/{settings,analytics,feedback}/route.ts`
- Shared assistant server logic via `apps/dashboard/src/lib/assistant/server.ts`
- Shared assistant capability/workflow definitions via `apps/dashboard/src/lib/assistant/shared.ts`

## Current Capabilities
- Search students for the active tenant
- List classrooms for the current session
- Enroll or move a student for the active term
- Fetch current-term fee balances
- Record student fee payments
- Search inventory items
- Create inventory items
- Record inventory issuance
- Search staff members
- Fetch teacher workspace summary
- Fetch student attendance history
- Search guardian contacts
- Stream assistant responses into the dashboard UI
- Render tool results as interactive cards for student selection, classroom selection, fee confirmation, and success receipts
- Persist conversations and messages per tenant user
- Capture assistant run and tool execution telemetry
- Collect assistant feedback and expose usage analytics
- Manage assistant rollout/settings from the widget

## Current Constraints
- Prisma schema changes require migration rollout before the new assistant persistence layer can work outside codegen/type-check level
- The route now enforces confirmation for risky mutations, but undo/reversal workflows are still domain-specific and not yet generalized
- There is no automated eval harness yet; validation is currently based on isolated type-check coverage and runtime instrumentation design
- Provider/model selection is configurable per tenant assistant config, but cost/performance routing is still static rather than intent-aware
- Tenant module gating is assistant-config-backed for now and should later align with the broader platform module engine

## UX Notes
- The assistant is embedded into the dashboard shell rather than exposed as a standalone page
- Empty-state suggestions focus on enrollment, fee collection, inventory issuance, and student balance checks
- Tool outputs are converted into structured cards, which is the right pattern to expand instead of relying only on free-text assistant replies
- Arabic support is already expected in the prompt and the textarea uses `dir="auto"`, which should remain a first-class product requirement

## Permissions
- All assistant actions inherit the authenticated dashboard tenant context from the auth cookie
- Any future tool expansion must respect existing role/module permissions before exposing data reads or writes
- Destructive or financially sensitive actions should require explicit confirmation steps and audit logging

## Metrics
- Task completion rate per supported workflow
- Time to complete workflow versus manual UI path
- Tool success versus failure rate
- Escalation rate where the assistant cannot complete the task
- Undo or correction rate after assistant-triggered mutations
- Satisfaction/feedback score on assistant outcomes

## Next 10 Phases

### Phase 1: Harden action safety and confirmations
- Separate read-only tools from mutation tools in both prompt design and UI treatment
- Require explicit confirmation payloads for enrollment, payment, and issuance before final execution
- Add standardized success, warning, and failure states for every mutation response
- Validation:
  - Enrollment cannot silently reassign without clear user confirmation
  - Payment flows prevent over-allocation and mismatched totals
  - Inventory issuance blocks insufficient stock with actionable recovery guidance

### Phase 2: Persist conversations and assistant runs
- Add tenant-scoped conversation, message, and tool-run persistence
- Preserve conversations across page reloads and session changes
- Support reopening prior chats for continuity and support follow-up actions
- Validation:
  - Refreshing the page restores prior conversation state
  - Messages remain correctly scoped to tenant and user

### Phase 3: Add audit trail and operational observability
- Record assistant-triggered mutations with actor, tenant, prompt summary, selected tool, and result metadata
- Attach assistant run references to finance, enrollment, and inventory audit records where possible
- Add internal logging for failed tool calls, retries, and incomplete multi-step flows
- Validation:
  - Every mutation can be traced back to a user and assistant run
  - Error logs are actionable enough for support/debugging

### Phase 4: Expand core school operations toolset
- Add attendance lookup/update flows
- Add staff lookup and class-assignment support
- Add timetable, subject, and academic-term awareness tools
- Add parent/contact lookup for support workflows
- Validation:
  - New tools stay tenant-scoped and permission-aware
  - Tool descriptions are narrow enough to reduce model misuse

### Phase 5: Introduce role-aware permissions and module gating
- Filter available tools by user role, institution module access, and active tenant configuration
- Prevent the model from seeing or calling tools that the current user should not access
- Reflect unavailable capabilities in the assistant response without leaking restricted data
- Validation:
  - Bursary-only actions are invisible to unauthorized users
  - Disabled modules do not surface in suggestions or tool lists

### Phase 6: Build a reusable structured workflow framework
- Standardize a pattern for search, disambiguation, confirmation, execution, and receipt
- Replace one-off prompt conventions like free-text “select student id:…” with typed workflow state
- Reuse the same workflow engine across enrollment, payments, inventory, attendance, and future modules
- Validation:
  - Multi-step flows recover cleanly from ambiguous selections
  - Client and server stay aligned on workflow state transitions

### Phase 7: Improve multilingual and response quality controls
- Formalize English and Arabic response rules beyond the current prompt-only instruction
- Add locale-aware currency, dates, school terminology, and text-direction handling
- Introduce response style constraints for concise admin-task execution
- Validation:
  - Arabic conversations render correctly in cards and receipts
  - Numeric/currency formatting is consistent across providers

### Phase 8: Add evaluation, test coverage, and prompt regression checks
- Create fixture-based tests for supported tool flows and edge cases
- Add regression prompts for student search ambiguity, partial fee payments, and low-stock issuance
- Evaluate provider/model behavior on safety, correctness, and task completion
- Validation:
  - Known flows have repeatable test coverage
  - Prompt or model changes can be compared before rollout

### Phase 9: Productize assistant controls and admin settings
- Add settings for provider/model strategy, feature flags, rate limits, and rollout controls
- Allow staged rollout by tenant, plan, or institution type
- Add optional feedback capture and assistant disable switch for support scenarios
- Validation:
  - Assistant can be enabled or disabled without code changes
  - Rollout controls support safe incremental release

### Phase 10: Launch analytics, feedback loops, and roadmap expansion
- Add usage dashboards for adoption, failed intents, and high-value workflows
- Capture unresolved user intents to prioritize the next tool investments
- Use analytics to decide whether to expand toward a standalone assistant workspace, admissions assistant, parent support agent, or website/content assistant
- Validation:
  - Product decisions are grounded in real assistant usage data
  - Roadmap prioritization reflects unresolved demand rather than intuition alone

## Recommended Sequence
- Phase 1 through Phase 7 now have concrete implementation scaffolding in the dashboard and Prisma schema layer
- Phase 8 through Phase 10 now have analytics/feedback surfaces and focused validation setup, but still need deeper automated eval coverage and rollout hardening
- Migration rollout plus live tenant validation should be the next operational checkpoint before broader release

## Open Questions
- Should assistant conversation history be visible only to the initiating user, or shared with authorized staff in the same tenant?
- Which actions need reversible workflows versus immutable audit-only receipts?
- Should the assistant remain a global dashboard utility, or eventually gain module-specific entry points?
- Which provider should be the default production path for cost, latency, and multilingual accuracy?
