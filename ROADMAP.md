# Roadmap

The next priorities are bulk receiving and transfer requests between neighboring inventories. The aim is to reduce repetitive entry and make it easier to request supplies another operator has available.

This is a planning document. Items are not complete until they are implemented in this repository and checked. The notification channel and transfer-completion rules still need final decisions.

## 1. Design and build bulk receiving

Status: planned workflow, starting from the application's current single-product receiving feature.

- [ ] Design the multi-product receiving workflow and agree on the interaction before implementing it.
- [ ] Receive several existing products at one destination location, preserving each product's unit size.
- [ ] Review the delivery before saving, including quantities and stock before/after.
- [ ] Keep validation errors readable and preserve entered rows after a failed save.
- [ ] Keep saving all-or-nothing, with a receipt entry for every product and protection against repeated submissions.
- [ ] Decide how a delivery should appear in transaction history and how corrections should work.
- [ ] Implement and run receiving, permissions, correction, and UI checks for the chosen design.
- [ ] Verify the original single-product receiving flow still works.

## 2. Neighbor inventory transfer requests

Status: planned new workflow.

Example: one operator sees a product in a neighboring inventory and requests a quantity from that operator. The other operator gets a notification and can respond, instead of the request being handled entirely outside the app.

### Request creation

- [ ] Start a request from a product in the neighboring inventory view.
- [ ] Choose the exact product/unit variant, quantity, and receiving location.
- [ ] Allow a short note about the request or collection arrangements.
- [ ] Show the supplying and requesting inventories clearly before submission.
- [ ] Reject invalid quantities and prevent accidental repeated requests.

### Responding and tracking

- [ ] Provide incoming and outgoing request lists.
- [ ] Let the receiving operator accept or decline an incoming request.
- [ ] Let the requester cancel an eligible pending request.
- [ ] Show request status, participants, timestamps, and response notes.
- [ ] Record completion after the actual handoff, following an agreed confirmation rule.
- [ ] Enforce permissions on the server so only the appropriate participants can view or act on a request.

### Notifications

- [ ] Start with in-app notifications and an unread/pending-request indicator.
- [ ] Notify the supplying operator when a request arrives.
- [ ] Notify the requester when it is accepted, declined, cancelled, or completed as appropriate.
- [ ] Make a notification open its corresponding request.
- [ ] Provide a simple way to mark notifications as read and avoid duplicate alerts.

Email, text messages, and browser push notifications are possible later additions. No external notification service is selected or required for the first version.

### Inventory handling

- [ ] Keep request creation, notifications, and acceptance separate from physical stock movement. Requesting or accepting supplies must not immediately alter counts.
- [ ] Decide who confirms the handoff and how both inventories record it before automating quantity changes.
- [ ] If automatic fulfillment is included, make it create linked audit records, prevent duplicate movements, and handle changed availability without a partial or misleading result.

## Verification and release work

- [ ] Use the two fictional demo franchises, each with owner, technician, manager, and viewer accounts, for end-to-end checks.
- [ ] Test request creation, responses, cancellation, completion, and notification read/unread behavior.
- [ ] Test forbidden actions, cross-inventory access restrictions, and retry/failure cases.
- [ ] Check the workflows on a phone-sized screen and with empty/loading/error states.
- [ ] Keep setup instructions and test commands repeatable for a reviewer using a disposable database.
- [ ] Test deployment changes separately before intentionally replacing the running application.

## Decisions before transfer implementation

1. Who may request supplies, and who may accept or decline requests?
2. Are in-app notifications sufficient for the first release?
3. Who confirms that the physical handoff happened?
4. Should fulfillment update both inventories automatically, or initially direct users through the existing inventory tools?

Implementation details and remaining effort should be assessed after agreeing on each workflow's scope. This document does not promise a particular number of working hours.
