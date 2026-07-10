/**
 * Seed dataset for the Munin demo engagement:
 * "Nova Payments Platform — Transition to New Vendor"
 *
 * This mirrors the dataset baked into the frontend so the demo is
 * internally consistent once the frontend is wired to the API.
 */

const MODULES = [
  "Payments Core",
  "Batch & Settlement",
  "Channel APIs",
  "Fraud Screening",
  "Reporting & Recon",
  "Customer Notifications",
];

const PHASES = ["Discovery", "KT", "Shadow", "Reverse Shadow", "Cutover", "Steady State"];

const ENGAGEMENT = {
  name: "Nova Payments Platform — Transition to New Vendor",
  phase: "Reverse Shadow",
  phases: PHASES,
};

const READINESS_INITIAL = {
  "Payments Core": 88,
  "Batch & Settlement": 71,
  "Reporting & Recon": 67,
  "Fraud Screening": 61,
  "Customer Notifications": 58,
  "Channel APIs": 54,
};

const SME_ROLES = {
  "Rajesh Iyer": "Incumbent SME, Payments Core",
  "Priya Nair": "Incumbent SME, Payments Core",
  "Marcus Weber": "Incumbent SME, Batch & Settlement",
  "Ines Almeida": "Incumbent SME, Fraud Screening",
  "Daniel Kowalski": "Incumbent SME, Reporting & Recon",
  "Sofia Conti": "Incumbent SME, Customer Notifications",
  "Tom Okafor": "Incoming Engineer",
  "Lena Fischer": "Incoming Engineer",
  "Yusuf Demir": "Incoming Engineer",
};

const seg = (t, s, x) => ({ t, s, x });

const SESSIONS_SEED = [
  {
    id: "s1", num: 1, module: "Payments Core",
    title: "KT Session 1 — Payments Core: Architecture Overview",
    date: "2026-05-04", duration: "55 min", status: "Processed",
    attendees: ["Rajesh Iyer", "Priya Nair", "Tom Okafor", "Lena Fischer"],
    transcript: [
      seg("00:00:12", "Rajesh Iyer", "So Payments Core is the central authorization engine — every inbound payment, card or SEPA, routes through here before it touches settlement."),
      seg("00:01:40", "Rajesh Iyer", "The service is split into three components: intake, validation, and the authorization orchestrator. Intake normalizes ISO 20022 and legacy formats into our internal envelope."),
      seg("00:03:15", "Tom Okafor", "Is the orchestrator stateful, or does it hand off to a queue immediately?"),
      seg("00:03:28", "Rajesh Iyer", "Stateful for the duration of the auth decision — usually under 400ms — then it publishes an outcome event and forgets the payment."),
      seg("00:05:02", "Priya Nair", "One thing that trips people up: the orchestrator has a hard-coded circuit breaker at 2,000 concurrent authorizations. Above that it starts shedding load, which incoming teams always assume is a bug."),
      seg("00:07:44", "Rajesh Iyer", "It's not a bug, it's deliberate — we learned that the hard way during a Black Friday spike three years ago."),
      seg("00:09:10", "Lena Fischer", "Where does configuration for routing rules live?"),
      seg("00:09:22", "Rajesh Iyer", "A YAML file deployed alongside the service, but it's cached in memory and only reloaded on restart — so config changes need a rolling restart, not a hot reload."),
      seg("00:12:05", "Priya Nair", "We'll walk through the authorization state machine in the next session, it deserves its own hour."),
      seg("00:14:30", "Rajesh Iyer", "Last thing for today — Payments Core owns the idempotency key store. If that gets wiped, duplicate payments can slip through, so treat it as tier-1 data."),
    ],
  },
  {
    id: "s2", num: 2, module: "Payments Core",
    title: "KT Session 2 — Payments Core: Authorization Flow Deep Dive",
    date: "2026-05-06", duration: "62 min", status: "Processed",
    attendees: ["Rajesh Iyer", "Tom Okafor", "Lena Fischer"],
    transcript: [
      seg("00:00:20", "Rajesh Iyer", "Today's the authorization state machine end to end: Received, Validated, Screened, Authorized or Declined, Settled."),
      seg("00:02:11", "Rajesh Iyer", "Screened is the handoff to Fraud Screening — it's an external call over gRPC with a 250ms timeout."),
      seg("00:04:00", "Tom Okafor", "What happens if fraud screening times out?"),
      seg("00:04:09", "Rajesh Iyer", "It fails open for low-value payments under 50 euros, fails closed for everything else. That threshold is configurable but nobody's touched it in two years."),
      seg("00:08:45", "Rajesh Iyer", "The runbook for a stuck authorization is: check the event bus lag first, then the fraud screening health endpoint, then restart the orchestrator pods in a rolling fashion — never all at once, you'll drop in-flight state."),
      seg("00:15:30", "Lena Fischer", "Is there a dashboard for orchestrator health?"),
      seg("00:15:40", "Rajesh Iyer", "Grafana board called 'payments-core-orch'. I'll make sure that gets shared."),
      seg("00:22:10", "Rajesh Iyer", "Honestly the trickiest failure mode is silent — the orchestrator stays healthy but the idempotency store falls behind on replication, and you get duplicate charges nobody notices for hours."),
      seg("00:28:50", "Rajesh Iyer", "We check replication lag manually every morning. It's not automated and it really should be."),
    ],
  },
  {
    id: "s3", num: 3, module: "Batch & Settlement",
    title: "KT Session 3 — Settlement Engine Architecture",
    date: "2026-05-08", duration: "58 min", status: "Processed",
    attendees: ["Marcus Weber", "Tom Okafor", "Yusuf Demir"],
    transcript: [
      seg("00:00:15", "Marcus Weber", "Settlement runs as a nightly batch, kicked off at 23:00 CET by a cron on the mainframe gateway box, not Kubernetes."),
      seg("00:02:40", "Marcus Weber", "It reads the day's authorized payments, nets them by counterparty bank, and produces settlement files in the local clearing format."),
      seg("00:06:12", "Yusuf Demir", "What's the dependency chain before settlement can start?"),
      seg("00:06:20", "Marcus Weber", "It needs the day's fraud screening reconciliation to be complete and the FX rate snapshot from Treasury's feed, which lands around 22:30."),
      seg("00:10:05", "Marcus Weber", "If the FX feed is late, settlement waits — there's a 90 minute grace window before it pages someone."),
      seg("00:14:00", "Tom Okafor", "Who gets paged?"),
      seg("00:14:05", "Marcus Weber", "Right now, me. That needs to change before cutover, obviously."),
      seg("00:18:30", "Marcus Weber", "The engine itself is a monolith I wrote six years ago in a mix of Java and shell scripts. It's not pretty but it's stable — just don't touch the netting logic without me in the room."),
    ],
  },
  {
    id: "s4", num: 4, module: "Batch & Settlement",
    title: "KT Session 4 — Batch Operations",
    date: "2026-05-11", duration: "60 min", status: "Processed",
    attendees: ["Marcus Weber", "Tom Okafor", "Yusuf Demir"],
    transcript: [
      seg("00:00:18", "Marcus Weber", "Let's talk failure recovery. The most common incident is a stuck batch — usually caused by a malformed record from an upstream feed."),
      seg("00:04:05", "Marcus Weber", "Runbook: check the batch log for the last successfully processed record ID, quarantine the bad record into the exceptions table, then restart from checkpoint using the resume flag — never a cold restart, it double-processes everything before the checkpoint."),
      seg("00:09:30", "Marcus Weber", "Month-end is the dangerous window. Volume triples and the queue that feeds the netting stage has a fixed buffer of 50,000 messages. We've overflowed it twice."),
      seg("00:14:20", "Yusuf Demir", "Is there monitoring on queue depth?"),
      seg("00:14:28", "Marcus Weber", "There's a metric, no alert. I just know to watch it on the last business day of the month."),
      seg("00:23:14", "Marcus Weber", "One more thing that isn't written anywhere — if the settlement engine gets stuck mid-run, restarting it before draining the in-flight netting batch corrupts the day's ledger totals. You have to let it drain, even if that takes twenty minutes of nothing happening on screen."),
      seg("00:31:00", "Marcus Weber", "Also: the settlement file naming convention encodes the value date, not the run date. Get that wrong and the bank's clearing system silently rejects the file two days later."),
    ],
  },
  {
    id: "s5", num: 5, module: "Fraud Screening",
    title: "KT Session 5 — Fraud Rules & Screening Pipeline",
    date: "2026-05-13", duration: "50 min", status: "Processed",
    attendees: ["Ines Almeida", "Lena Fischer", "Tom Okafor"],
    transcript: [
      seg("00:00:20", "Ines Almeida", "Screening is a rules engine plus a lightweight scoring model. Rules are evaluated first and can hard-block; the model score only matters if no rule fires."),
      seg("00:03:10", "Ines Almeida", "Rules live in a versioned JSON file deployed independently of the service — this is important — it has its own release pipeline."),
      seg("00:05:40", "Lena Fischer", "How often do rules change?"),
      seg("00:05:45", "Ines Almeida", "Weekly, sometimes daily during active fraud campaigns. Compliance signs off, then it goes out."),
      seg("00:09:00", "Ines Almeida", "Tribal knowledge nobody wrote down: the new ruleset has to be deployed before 6 AM CET, because that's when the highest-risk corridor — Southeast Asia remittances — starts its daily volume ramp. Deploy after that and you're screening a spike with yesterday's rules."),
      seg("00:15:12", "Tom Okafor", "Is there a rollback path if a new rule causes false positives?"),
      seg("00:15:20", "Ines Almeida", "Yes, one command reverts to the previous ruleset version, but it's manual — someone has to notice the false-positive spike first."),
      seg("00:20:00", "Ines Almeida", "The scoring model is retrained monthly, offline, by a data science team that doesn't sit with us. I just consume the artifact they hand over."),
    ],
  },
  {
    id: "s6", num: 6, module: "Reporting & Recon",
    title: "KT Session 6 — Reporting & Reconciliation",
    date: "2026-05-15", duration: "52 min", status: "Processed",
    attendees: ["Daniel Kowalski", "Priya Nair", "Yusuf Demir"],
    transcript: [
      seg("00:00:16", "Daniel Kowalski", "Reconciliation compares settlement output against the bank's confirmation files, which arrive by SFTP around 07:00."),
      seg("00:03:20", "Daniel Kowalski", "Interface point: the SFTP drop is polled every five minutes by a small watcher service. If a file lands with the wrong checksum extension it's silently ignored — that's bitten us before."),
      seg("00:08:40", "Priya Nair", "Reporting also feeds the regulatory submission — that's a separate monthly job, correct?"),
      seg("00:08:48", "Daniel Kowalski", "Correct, it aggregates the daily recon outputs and formats them for the regulator's schema. It's brittle — any schema drift from the regulator breaks it silently until someone checks the acknowledgment file."),
      seg("00:16:00", "Yusuf Demir", "What's the runbook when recon shows a break?"),
      seg("00:16:08", "Daniel Kowalski", "Pull the transaction ID, check both ledgers manually — there's no automated break-resolution tool yet, it's a spreadsheet process. I know, it's on the backlog."),
      seg("00:24:30", "Daniel Kowalski", "Breaks under 1 euro are auto-written off nightly. Anything above needs a human and a ticket."),
    ],
  },
  {
    id: "s7", num: 7, module: "Customer Notifications",
    title: "KT Session 7 — Customer Notifications & Templates",
    date: "2026-05-18", duration: "45 min", status: "Processed",
    attendees: ["Sofia Conti", "Lena Fischer"],
    transcript: [
      seg("00:00:14", "Sofia Conti", "Notifications listens to the payment outcome event stream and fans out to email, push, and SMS depending on customer preference."),
      seg("00:03:00", "Sofia Conti", "Templates are stored per-market, per-language, in a CMS the marketing team owns — we just render them."),
      seg("00:06:15", "Lena Fischer", "What happens if a customer's preferred channel is down, say the push provider?"),
      seg("00:06:22", "Sofia Conti", "It falls back to email automatically after two failed push attempts, retried over fifteen minutes."),
      seg("00:11:40", "Sofia Conti", "SMS is metered — we pay per message — so there's a daily budget cap per market. If it's hit, SMS just silently stops for the rest of the day and queues for the next."),
      seg("00:18:05", "Sofia Conti", "I haven't had time to walk through the notification gateway itself yet, or what happens if it goes down entirely — that's really a session on its own."),
    ],
  },
  {
    id: "s8", num: 8, module: "Channel APIs",
    title: "KT Session 8 — Channel APIs Overview",
    date: "2026-05-20", duration: "40 min", status: "Processed",
    attendees: ["Rajesh Iyer", "Tom Okafor"],
    transcript: [
      seg("00:00:20", "Rajesh Iyer", "Channel APIs is the external-facing layer — mobile app, web, and partner banks integrate through here."),
      seg("00:03:15", "Rajesh Iyer", "It's mostly a thin REST gateway in front of Payments Core, with its own rate limiting and API key management."),
      seg("00:07:00", "Tom Okafor", "Who owns the partner bank integrations specifically?"),
      seg("00:07:08", "Rajesh Iyer", "Honestly that's been a gap on our side too — there's a separate integrations team, we've never done a joint session with them."),
      seg("00:10:30", "Rajesh Iyer", "We're short on time today, I'd really recommend a dedicated session on rate limiting policy and the partner onboarding flow — we've barely scratched the surface."),
    ],
  },
];

// Simulated 9th session, added by the "Upload session recording" flow
const SESSION_9 = {
  id: "s9", num: 9, module: "Customer Notifications",
  title: "KT Session 9 — Notification Gateway Failover & DR",
  date: "2026-06-02", duration: "38 min", status: "Processed",
  attendees: ["Sofia Conti", "Lena Fischer", "Tom Okafor"],
  transcript: [
    seg("00:00:18", "Sofia Conti", "Picking up from last time — this session is specifically the notification gateway and what happens when it's unhealthy."),
    seg("00:02:40", "Sofia Conti", "The gateway runs active-passive across two regions. Failover is not automatic — someone has to flip a DNS weight manually in the provider console."),
    seg("00:07:15", "Tom Okafor", "So there's no health-check-triggered failover at all?"),
    seg("00:07:22", "Sofia Conti", "Correct, and that's the biggest single risk in this module. It's on the roadmap to automate but hasn't happened."),
    seg("00:12:05", "Sofia Conti", "Runbook for a regional outage: confirm the primary region is actually down via the status page, not just alerts, then flip the weighted DNS record to the passive region, then re-run the last two hours of queued notifications from the dead-letter topic."),
    seg("00:19:30", "Lena Fischer", "How long does the DNS flip take to propagate?"),
    seg("00:19:36", "Sofia Conti", "TTL is 300 seconds, so call it five to ten minutes worst case before most traffic shifts."),
  ],
};

let koCounter = 0;
const ko = (title, type, module, description, confidence, source) => {
  koCounter += 1;
  return {
    id: `ko${koCounter}`,
    title, type, module, description, confidence, source,
    needsReview: confidence < 0.7,
  };
};

const KNOWLEDGE_OBJECTS_SEED = [
  // Payments Core (s1, s2)
  ko("Authorization state machine", "Runbook", "Payments Core", "Payments move through Received, Validated, Screened, Authorized or Declined, and Settled. Fraud screening is invoked at the Screened step over gRPC with a 250ms timeout, and low-value payments under €50 fail open on timeout while everything else fails closed.", 0.95, "KT Session 2 — Payments Core: Authorization Flow Deep Dive, 00:02:11"),
  ko("Stuck authorization recovery", "Runbook", "Payments Core", "Check event bus lag first, then the fraud screening health endpoint, then restart orchestrator pods one at a time in a rolling fashion. Restarting all pods simultaneously drops in-flight authorization state.", 0.93, "KT Session 2 — Payments Core: Authorization Flow Deep Dive, 00:08:45"),
  ko("Orchestrator concurrency circuit breaker", "Failure Mode", "Payments Core", "The authorization orchestrator hard-caps at 2,000 concurrent authorizations and deliberately sheds load above that threshold. This is intentional behavior dating back to a Black Friday incident, not a defect, and incoming teams often mistake it for a bug.", 0.9, "KT Session 1 — Payments Core: Architecture Overview, 00:05:02"),
  ko("Idempotency key store replication lag", "Failure Mode", "Payments Core", "The orchestrator can appear fully healthy while the idempotency key store silently falls behind on replication, allowing duplicate charges to slip through undetected for hours. Replication lag is currently checked manually each morning rather than being alerted on.", 0.81, "KT Session 2 — Payments Core: Authorization Flow Deep Dive, 00:22:10"),
  ko("Routing config requires rolling restart", "Tribal Knowledge", "Payments Core", "Routing rule configuration is cached in memory at startup, so changes to the YAML config file only take effect after a rolling restart — there is no hot reload path.", 0.88, "KT Session 1 — Payments Core: Architecture Overview, 00:09:22"),

  // Batch & Settlement (s3, s4)
  ko("Nightly settlement batch schedule", "Batch Job", "Batch & Settlement", "Settlement kicks off at 23:00 CET via cron on the mainframe gateway box (not Kubernetes), nets the day's authorized payments by counterparty bank, and produces settlement files in the local clearing format.", 0.94, "KT Session 3 — Settlement Engine Architecture, 00:00:15"),
  ko("Settlement dependency on FX feed", "Dependency", "Batch & Settlement", "Settlement requires the day's fraud screening reconciliation to be complete and Treasury's FX rate snapshot, which lands around 22:30. A 90-minute grace window applies before a late feed triggers a page.", 0.87, "KT Session 3 — Settlement Engine Architecture, 00:06:20"),
  ko("Stuck batch recovery", "Runbook", "Batch & Settlement", "Check the batch log for the last successfully processed record ID, quarantine the malformed record into the exceptions table, then restart from checkpoint using the resume flag. A cold restart double-processes everything before the checkpoint.", 0.92, "KT Session 4 — Batch Operations, 00:04:05"),
  ko("Month-end netting queue overflow", "Failure Mode", "Batch & Settlement", "Month-end volume roughly triples and the queue feeding the netting stage has a fixed buffer of 50,000 messages, which has overflowed twice. A depth metric exists but has no alert configured.", 0.85, "KT Session 4 — Batch Operations, 00:09:30"),
  ko("Drain before restart during netting", "Tribal Knowledge", "Batch & Settlement", "If the settlement engine gets stuck mid-run, restarting before the in-flight netting batch drains corrupts the day's ledger totals. The engine must be left to drain fully, which can take up to twenty minutes with no visible progress.", 0.68, "KT Session 4 — Batch Operations, 00:23:14"),
  ko("Settlement file naming uses value date", "Tribal Knowledge", "Batch & Settlement", "Settlement file names encode the value date rather than the run date. Getting this wrong causes the bank's clearing system to silently reject the file, discovered only two days later.", 0.72, "KT Session 4 — Batch Operations, 00:31:00"),
  ko("Settlement engine is a legacy monolith", "Dependency", "Batch & Settlement", "The settlement engine is a six-year-old Java and shell-script monolith. It is stable but its netting logic is considered high-risk to modify without the incumbent SME present.", 0.79, "KT Session 3 — Settlement Engine Architecture, 00:18:30"),
  ko("Settlement paging is undefined post-cutover", "Failure Mode", "Batch & Settlement", "Settlement incidents currently page a single incumbent SME directly with no documented on-call rotation for the incoming team, a gap that needs resolution before cutover.", 0.6, "KT Session 3 — Settlement Engine Architecture, 00:14:05"),

  // Fraud Screening (s5)
  ko("Screening pipeline: rules then model", "Interface", "Fraud Screening", "Screening evaluates rules first, which can hard-block a payment; the scoring model only influences the decision if no rule fires. Rules and the service ship on independent release pipelines.", 0.91, "KT Session 5 — Fraud Rules & Screening Pipeline, 00:03:10"),
  ko("6 AM CET ruleset deployment window", "Tribal Knowledge", "Fraud Screening", "New rulesets must be deployed before 6 AM CET, ahead of the daily volume ramp on the Southeast Asia remittance corridor, the platform's highest-risk traffic. Deploying later means that morning's spike is screened with stale rules. This was never written down before this session.", 0.9, "KT Session 5 — Fraud Rules & Screening Pipeline, 00:09:00"),
  ko("Manual ruleset rollback", "Runbook", "Fraud Screening", "A single command reverts to the previous ruleset version, but rollback is manual and depends on someone first noticing a false-positive spike — there is no automated detection.", 0.74, "KT Session 5 — Fraud Rules & Screening Pipeline, 00:15:20"),
  ko("Scoring model retrain cadence", "Dependency", "Fraud Screening", "The fraud scoring model is retrained monthly offline by a separate data science team; the screening service only consumes the resulting artifact and has no visibility into training.", 0.83, "KT Session 5 — Fraud Rules & Screening Pipeline, 00:20:00"),
  ko("Compliance sign-off on rule changes", "Dependency", "Fraud Screening", "Rule changes go out weekly to daily during active fraud campaigns and require compliance sign-off before release.", 0.86, "KT Session 5 — Fraud Rules & Screening Pipeline, 00:05:45"),

  // Reporting & Recon (s6)
  ko("Bank confirmation file interface", "Interface", "Reporting & Recon", "Reconciliation compares settlement output against bank confirmation files delivered by SFTP around 07:00, polled every five minutes by a watcher service.", 0.89, "KT Session 6 — Reporting & Reconciliation, 00:03:20"),
  ko("Silent checksum extension failure", "Failure Mode", "Reporting & Recon", "Files landing on the SFTP drop with an unexpected checksum extension are silently ignored by the watcher service rather than raising an alert, and this has caused missed reconciliation before.", 0.65, "KT Session 6 — Reporting & Reconciliation, 00:03:20"),
  ko("Regulatory submission job", "Batch Job", "Reporting & Recon", "A separate monthly job aggregates daily reconciliation outputs and formats them for the regulator's schema. It is brittle to schema drift and can fail silently until someone checks the acknowledgment file.", 0.78, "KT Session 6 — Reporting & Reconciliation, 00:08:48"),
  ko("Manual break resolution process", "Runbook", "Reporting & Recon", "Resolving a reconciliation break means pulling the transaction ID and manually checking both ledgers in a spreadsheet; there is no automated break-resolution tool yet.", 0.8, "KT Session 6 — Reporting & Reconciliation, 00:16:08"),
  ko("Break write-off threshold", "Tribal Knowledge", "Reporting & Recon", "Reconciliation breaks under one euro are automatically written off overnight; anything larger requires a human-raised ticket.", 0.84, "KT Session 6 — Reporting & Reconciliation, 00:24:30"),

  // Customer Notifications (s7)
  ko("Notification fan-out on payment events", "Interface", "Customer Notifications", "Notifications listens to the payment outcome event stream and fans out to email, push, and SMS according to stored customer channel preference.", 0.88, "KT Session 7 — Customer Notifications & Templates, 00:00:14"),
  ko("Push-to-email fallback", "Failure Mode", "Customer Notifications", "If push delivery fails twice within fifteen minutes, the system automatically falls back to email for that notification.", 0.82, "KT Session 7 — Customer Notifications & Templates, 00:06:22"),
  ko("SMS daily budget cap", "Tribal Knowledge", "Customer Notifications", "SMS spend is metered with a daily budget cap per market. Once the cap is hit, SMS silently stops for the rest of the day and queues delivery for the next day rather than erroring visibly.", 0.77, "KT Session 7 — Customer Notifications & Templates, 00:11:40"),
  ko("Templates owned outside engineering", "Dependency", "Customer Notifications", "Notification templates are authored per market and language in a marketing-owned CMS; the notifications service only renders them, so content changes do not require a deploy.", 0.86, "KT Session 7 — Customer Notifications & Templates, 00:03:00"),

  // Channel APIs (s8)
  ko("Channel APIs as thin gateway", "Interface", "Channel APIs", "Channel APIs is a REST gateway in front of Payments Core serving mobile, web, and partner banks, handling its own rate limiting and API key management.", 0.72, "KT Session 8 — Channel APIs Overview, 00:03:15"),
  ko("Partner bank integration ownership gap", "Failure Mode", "Channel APIs", "Partner bank integrations are owned by a separate integrations team that has never held a joint KT session with Payments platform staff, leaving an ownership and knowledge gap at the partner boundary.", 0.58, "KT Session 8 — Channel APIs Overview, 00:07:08"),
  ko("Rate limiting policy undocumented", "Tribal Knowledge", "Channel APIs", "Rate limiting policy and the partner onboarding flow were flagged as needing a dedicated follow-up session; only a high-level overview has been covered so far.", 0.55, "KT Session 8 — Channel APIs Overview, 00:10:30"),

  // Session 9 (added by simulated upload) — Customer Notifications
  ko("Notification gateway manual failover", "Runbook", "Customer Notifications", "The notification gateway runs active-passive across two regions with no automatic failover. Recovering from a regional outage requires confirming the outage via the status page, manually flipping a weighted DNS record to the passive region, and re-running the last two hours of queued notifications from the dead-letter topic.", 0.93, "KT Session 9 — Notification Gateway Failover & DR, 00:12:05"),
  ko("No health-check-triggered failover", "Failure Mode", "Customer Notifications", "Failover for the notification gateway is entirely manual today; automating it based on health checks is on the roadmap but has not been built.", 0.9, "KT Session 9 — Notification Gateway Failover & DR, 00:07:22"),
  ko("DNS failover propagation time", "Dependency", "Customer Notifications", "The gateway's DNS record has a 300 second TTL, so a manual failover takes roughly five to ten minutes before most traffic shifts to the passive region.", 0.87, "KT Session 9 — Notification Gateway Failover & DR, 00:19:36"),
  ko("Gateway runs active-passive across regions", "Interface", "Customer Notifications", "The notification gateway is deployed active-passive across two regions rather than active-active, which shapes both its failover runbook and its recovery time.", 0.91, "KT Session 9 — Notification Gateway Failover & DR, 00:02:40"),
];

const KT_TOPICS_SEED = [
  { module: "Payments Core", topic: "Authorization state machine", depth: 3 },
  { module: "Payments Core", topic: "Routing & configuration", depth: 3 },
  { module: "Payments Core", topic: "Idempotency & duplicate prevention", depth: 3 },
  { module: "Payments Core", topic: "Circuit breakers & load shedding", depth: 2 },
  { module: "Batch & Settlement", topic: "Nightly batch schedule", depth: 3 },
  { module: "Batch & Settlement", topic: "Netting & clearing file generation", depth: 2 },
  { module: "Batch & Settlement", topic: "Failure recovery & checkpointing", depth: 3 },
  { module: "Batch & Settlement", topic: "Month-end scaling", depth: 2 },
  { module: "Fraud Screening", topic: "Rules engine & scoring model", depth: 3 },
  { module: "Fraud Screening", topic: "Ruleset deployment process", depth: 2 },
  { module: "Fraud Screening", topic: "Rollback & incident response", depth: 1 },
  { module: "Fraud Screening", topic: "Model retraining pipeline", depth: 1 },
  { module: "Reporting & Recon", topic: "Bank confirmation ingestion", depth: 2 },
  { module: "Reporting & Recon", topic: "Break resolution process", depth: 2 },
  { module: "Reporting & Recon", topic: "Regulatory submission job", depth: 2 },
  { module: "Reporting & Recon", topic: "Historical restatement handling", depth: 0 },
  { module: "Customer Notifications", topic: "Event-driven fan-out", depth: 2 },
  { module: "Customer Notifications", topic: "Template management", depth: 2 },
  { module: "Customer Notifications", topic: "Channel fallback logic", depth: 2 },
  { module: "Customer Notifications", topic: "Gateway failover & DR", depth: 3 },
  { module: "Channel APIs", topic: "Gateway architecture", depth: 1 },
  { module: "Channel APIs", topic: "Rate limiting policy", depth: 0 },
  { module: "Channel APIs", topic: "Partner bank onboarding", depth: 0 },
  { module: "Channel APIs", topic: "API key & credential rotation", depth: 1 },
];

const GAPS_SEED = [
  { id: "g1", module: "Channel APIs", question: "Rate limiting policy and thresholds were never walked through in detail.", status: "Open" },
  { id: "g2", module: "Channel APIs", question: "Partner bank onboarding flow needs a joint session with the integrations team.", status: "Open" },
  { id: "g3", module: "Channel APIs", question: "No session has covered API key and credential rotation procedure.", status: "Scheduled for next session" },
  { id: "g4", module: "Reporting & Recon", question: "Historical restatement handling — how corrected transactions from prior periods are processed — has not been covered.", status: "Open" },
  { id: "g5", module: "Fraud Screening", question: "Incident response playbook for a false-positive spike after a ruleset change is undocumented beyond the manual rollback command.", status: "Open" },
  { id: "g6", module: "Fraud Screening", question: "Model retraining pipeline ownership and escalation path with the data science team is unclear.", status: "Scheduled for next session" },
  { id: "g7", module: "Batch & Settlement", question: "Post-cutover on-call rotation for settlement paging has not been defined.", status: "Open" },
  { id: "g8", module: "Batch & Settlement", question: "Queue depth alerting for the netting stage buffer needs to be built before the first month-end after cutover.", status: "Open" },
  { id: "g9", module: "Customer Notifications", question: "Failover procedure for the notification gateway was never explained.", status: "Open" },
  { id: "g10", module: "Payments Core", question: "Idempotency store replication lag has no automated alerting — manual daily check only.", status: "Open" },
  { id: "g11", module: "Reporting & Recon", question: "SFTP checksum-extension failure mode needs an explicit alert, currently fails silently.", status: "Scheduled for next session" },
  { id: "g12", module: "Payments Core", question: "Grafana dashboard access for 'payments-core-orch' board has not been confirmed for the incoming team.", status: "Closed" },
];

// NOTE: g9 starts "Open" here (unlike the frontend's static mock which had it
// pre-closed) because in the backend it is the *upload flow* that closes it,
// consistent with the product spec ("removes ... and updates ... gaps").

const SME_MAP_SEED = {
  "Payments Core": [{ name: "Rajesh Iyer", share: 62 }, { name: "Priya Nair", share: 38 }],
  "Batch & Settlement": [{ name: "Marcus Weber", share: 92 }, { name: "Tom Okafor", share: 8 }],
  "Channel APIs": [{ name: "Rajesh Iyer", share: 70 }, { name: "Tom Okafor", share: 30 }],
  "Fraud Screening": [{ name: "Ines Almeida", share: 100 }],
  "Reporting & Recon": [{ name: "Daniel Kowalski", share: 74 }, { name: "Priya Nair", share: 26 }],
  "Customer Notifications": [{ name: "Sofia Conti", share: 100 }],
};

const KEY_PERSON_RISK_MODULES = ["Batch & Settlement", "Fraud Screening", "Customer Notifications"];

const ACTIVITY_SEED = [
  { text: "KT Session 8 — Channel APIs Overview processed, 3 knowledge objects extracted.", createdAt: "2026-05-20T09:41:00Z" },
  { text: "Gap logged: partner bank onboarding flow needs a joint session.", createdAt: "2026-05-20T09:38:00Z" },
  { text: "Readiness recalculated for Channel APIs (54%).", createdAt: "2026-05-20T09:37:00Z" },
  { text: "KT Session 7 — Customer Notifications & Templates processed.", createdAt: "2026-05-18T14:05:00Z" },
];

const CHAT_SEED = [
  { role: "user", text: "What happens if fraud screening times out during authorization?", citation: null, isGap: false },
  {
    role: "assistant",
    text: "It fails open for payments under €50 and fails closed for everything else — that threshold is configurable but hasn't been touched in two years.",
    citation: "KT Session 2 — Payments Core: Authorization Flow Deep Dive, 00:04:09",
    isGap: false,
  },
];

module.exports = {
  MODULES,
  PHASES,
  ENGAGEMENT,
  READINESS_INITIAL,
  SME_ROLES,
  SESSIONS_SEED,
  SESSION_9,
  KNOWLEDGE_OBJECTS_SEED,
  KT_TOPICS_SEED,
  GAPS_SEED,
  SME_MAP_SEED,
  KEY_PERSON_RISK_MODULES,
  ACTIVITY_SEED,
  CHAT_SEED,
};
