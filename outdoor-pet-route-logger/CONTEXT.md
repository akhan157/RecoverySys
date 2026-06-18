# Outdoor Pet Route Logger

Domain language for a personal app experiment that tracks the cat's outdoor sessions and audits Moto Tag / Find Hub reliability.

## Language

**Outside Session**:
A bounded period when the cat is outdoors and location checks should be collected.
_Avoid_: Walk, trip, route

**Manual Session Control**:
The rule that outside sessions begin and end only when the user explicitly starts or stops them.
_Avoid_: Auto-detection, schedule

**Reliability Audit**:
The first-priority measurement layer that determines whether Moto Tag location data is timely and trustworthy enough to support route history or recovery use.
_Avoid_: Quality check, tracker score

**Freshness Threshold**:
The rule for classifying a location point by age: usable when under 10 minutes old, stale from 10 to 30 minutes old, and failed when over 30 minutes old.
_Avoid_: Timeout, polling interval

**Location Point**:
A timestamped observation from Find Hub / Moto Tag, including position and any available quality signal such as stale age or precision.
_Avoid_: Ping, GPS point

**Check Attempt**:
A scheduled effort to read the cat's current tracker state, whether it produces a new location point, repeats an old point, or fails.
_Avoid_: Ping, poll

**Collector**:
The mechanism that reads Find Hub / Moto Tag state and turns it into check attempts and location points.
_Avoid_: Scraper, integration

**Collector Viability Contract**:
The minimum data a collector must return to support the reliability audit: location, observation timestamp, freshness age, accuracy or confidence, new-vs-repeated status, and failure reason.
_Avoid_: API response shape, scraper output

**CLI Collector**:
The first implementation surface: a command-line tool that runs collector checks, persists results, and prints reliability summaries before any UI exists.
_Avoid_: Prototype script, backend

**Collector Spike**:
The first technical investigation that compares unofficial sync tooling, Android automation, and browser scraping against the same data-access contract.
_Avoid_: Prototype, implementation

**Recovery-Grade Check**:
A location check that returns enough fresh and precise evidence that it would be reasonable to use it while looking for the cat.
_Avoid_: Successful ping, good update

**Route History**:
The mapped path inferred from collected location points during an outside session.
_Avoid_: Live tracking, GPS trail

**Reliability Summary**:
An aggregate view of check attempts and location points for a session or day, focused on freshness, failures, repeated observations, and recovery-grade rate.
_Avoid_: Report, dashboard

**Measurement-First Model**:
A data model that preserves every check attempt and separates measurement evidence from route visualization.
_Avoid_: Event log, route-first model

**Raw Collector Payload**:
The unprocessed local output from a collector run, retained to debug parser behavior and adapt when Find Hub changes.
_Avoid_: API response, scrape dump

**Recovery Confidence**:
A practical judgment of whether the latest tracker data would help find the cat if needed.
_Avoid_: Accuracy, precision, safety score
