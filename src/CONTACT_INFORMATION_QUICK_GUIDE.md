# Contact Information Section - Quick Reference
## Visual Guide and Usage Examples

---

## 🎨 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Case Identification                    [Blue Border]    │
│  LENS Case Number, Create Date, Case Status                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  💬 Contact Information                    [Purple Border]  │ ← NEW!
│                                                              │
│  Country Contact         LE Contact                          │
│  [Select status ▼]      [Select status ▼]                   │
│                                                              │
│  Attorney Contact        Operational Contact                │
│  [Select status ▼]      [Select status ▼]                   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Active Contact Flows                                        │
│  [Country: Approved] [LE: Awaiting Review] [Attorney: Red]  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🛡️  Legal Classification                 [Orange Border]   │
│  Request Type, Jurisdiction, Crimes                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Status Options & Colors

### Awaiting Review (Yellow/Amber)
```
┌────────────────────────────┐
│ Country: Awaiting Review   │  ← Brown text (#8a6d3b)
└────────────────────────────┘     Light yellow bg (#fff4ce)
```
**When to use:** Contact request submitted, waiting for response

---

### Escalation (Red)
```
┌────────────────────────────┐
│ LE: Escalation ⚠️          │  ← Red text (#d13438)
└────────────────────────────┘     Light red bg (#fde7e9)
```
**When to use:** Urgent, requires immediate attention

---

### Approved (Green)
```
┌────────────────────────────┐
│ Attorney: Approved ✓       │  ← Green text (#107c10)
└────────────────────────────┘     Light green bg (#dff6dd)
```
**When to use:** Contact approved, cleared to proceed

---

### Rejected (Dark Red)
```
┌────────────────────────────┐
│ Operational: Rejected ✗    │  ← Dark red text (#a4262c)
└────────────────────────────┘     Light red bg (#fde7e9)
```
**When to use:** Contact denied or cannot be fulfilled

---

## 🎯 Common Workflows

### Workflow 1: Standard Approval Flow
```
1. Set status to "Awaiting Review"
   ↓
2. Contact stakeholder
   ↓
3. Receive response
   ↓
4. Update to "Approved" or "Rejected"
```

### Workflow 2: Urgent Escalation
```
1. Set status to "Awaiting Review"
   ↓
2. No response after 24 hours
   ↓
3. Change to "Escalation"
   ↓
4. Manager addresses
   ↓
5. Update to final status
```

### Workflow 3: Multi-Contact Coordination
```
Day 1: Set all contacts to "Awaiting Review"
├── Country Contact: Awaiting Review
├── LE Contact: Awaiting Review  
├── Attorney Contact: Awaiting Review
└── Operational Contact: Awaiting Review

Day 2: Country responds first
├── Country Contact: Approved ✓
├── LE Contact: Awaiting Review
├── Attorney Contact: Awaiting Review  
└── Operational Contact: Awaiting Review

Day 3: Legal requires escalation
├── Country Contact: Approved ✓
├── LE Contact: Awaiting Review
├── Attorney Contact: Escalation ⚠️
└── Operational Contact: Awaiting Review

Day 4: All resolved
├── Country Contact: Approved ✓
├── LE Contact: Approved ✓
├── Attorney Contact: Approved ✓
└── Operational Contact: Approved ✓
```

---

## 💡 Pro Tips

### Tip 1: Use Status Summary for Quick Scanning
The "Active Contact Flows" section at the bottom shows all contacts with statuses at a glance. Use this to:
- Quickly identify outstanding contacts
- Spot escalations (red badges)
- See overall case readiness

### Tip 2: Empty vs. Awaiting Review
- **Empty (no status):** Contact not required for this case
- **Awaiting Review:** Contact is required and waiting

### Tip 3: Color Coding Logic
- **Green (Approved):** Good to go ✓
- **Yellow (Awaiting Review):** In progress, monitor
- **Red (Escalation/Rejected):** Action needed ⚠️

### Tip 4: Status Combinations
Common patterns:
- **All Approved:** Case ready to proceed
- **Mixed Yellow/Green:** Case progressing normally
- **Any Red:** Requires immediate attention
- **All Empty:** No additional contacts needed

---

## 📋 Field Descriptions

### Country Contact
**What it tracks:** Country-specific requirements (data protection authorities, local regulations)  
**Example scenarios:**
- GDPR country representative approval
- Local law enforcement coordination
- International jurisdiction clearance

### LE Contact (Law Enforcement)
**What it tracks:** Direct communication with requesting agency  
**Example scenarios:**
- Clarifying request scope
- Confirming legal authorization
- Verifying agent credentials

### Attorney Contact
**What it tracks:** Legal review and approval  
**Example scenarios:**
- Legal sufficiency review
- Privacy compliance check
- Risk assessment clearance

### Operational Contact
**What it tracks:** Internal operational approvals  
**Example scenarios:**
- Technical feasibility review
- Resource allocation approval
- Process exception authorization

---

## 🎨 Visual States

### State 1: No Contacts Set
```
┌─────────────────────────────────────────┐
│  💬 Contact Information                 │
│                                          │
│  Country Contact      LE Contact         │
│  [Select status ▼]   [Select status ▼]  │
│                                          │
│  Attorney Contact     Operational        │
│  [Select status ▼]   [Select status ▼]  │
│                                          │
│  (No summary section)                    │
└─────────────────────────────────────────┘
```

### State 2: Single Contact Active
```
┌─────────────────────────────────────────┐
│  💬 Contact Information                 │
│                                          │
│  Country Contact      LE Contact         │
│  [Awaiting Review]   [Select status ▼]  │
│                                          │
│  Attorney Contact     Operational        │
│  [Select status ▼]   [Select status ▼]  │
│                                          │
│  ─────────────────────────────────────  │
│  Active Contact Flows                    │
│  [Country: Awaiting Review]              │
└─────────────────────────────────────────┘
```

### State 3: Multiple Contacts Active
```
┌─────────────────────────────────────────┐
│  💬 Contact Information                 │
│                                          │
│  Country Contact      LE Contact         │
│  [Approved]          [Awaiting Review]   │
│                                          │
│  Attorney Contact     Operational        │
│  [Escalation]        [Rejected]          │
│                                          │
│  ─────────────────────────────────────  │
│  Active Contact Flows                    │
│  [Country: Approved]                     │
│  [LE: Awaiting Review]                   │
│  [Attorney: Escalation]                  │
│  [Operational: Rejected]                 │
└─────────────────────────────────────────┘
```

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Tab to Country Contact | `Tab` (in sequence) |
| Open dropdown | `Space` or `Enter` |
| Navigate options | `↑` `↓` arrow keys |
| Select option | `Enter` |
| Close dropdown | `Esc` |
| Next field | `Tab` |

---

## 🔍 Status Decision Tree

```
Need to track a contact?
│
├─ Is response received?
│  │
│  ├─ NO → Set to "Awaiting Review"
│  │
│  └─ YES → Is it approved?
│     │
│     ├─ YES → Set to "Approved"
│     │
│     └─ NO → Set to "Rejected"
│
├─ Is it urgent/overdue?
│  │
│  └─ YES → Set to "Escalation"
│
└─ Not needed for this case?
   │
   └─ Leave empty (no status)
```

---

## 📝 Quick Copy-Paste Status Descriptions

Use these when documenting case notes:

**Country Contact:**
- ✓ "Country contact approved - cleared to proceed"
- ⏳ "Awaiting country representative review"
- ⚠️ "Country contact escalated to senior management"
- ✗ "Country contact rejected - cannot fulfill request"

**LE Contact:**
- ✓ "LE agency confirmed request details"
- ⏳ "Awaiting clarification from LE agency"
- ⚠️ "LE contact escalated - no response in 48h"
- ✗ "LE agency withdrew request"

**Attorney Contact:**
- ✓ "Legal review approved"
- ⏳ "Awaiting legal sufficiency review"
- ⚠️ "Legal issue escalated to senior counsel"
- ✗ "Legal rejected due to insufficient authorization"

**Operational Contact:**
- ✓ "Operational approval granted"
- ⏳ "Awaiting resource allocation approval"
- ⚠️ "Operational escalation - capacity concerns"
- ✗ "Operational rejected - technical constraints"

---

## 🎯 Success Metrics

Track these to measure effectiveness:

### Response Time
- Time from "Awaiting Review" → "Approved/Rejected"
- Target: < 48 hours for standard, < 24 hours for escalation

### Escalation Rate
- % of contacts that require escalation
- Target: < 10% of all contacts

### Approval Rate
- % of contacts approved vs. rejected
- Benchmark: Track by contact type

### Completion Rate
- % of cases with all required contacts resolved
- Target: 100% before collection stage

---

## ✅ Daily Checklist

### Morning Review
- [ ] Check all cases with "Awaiting Review" status
- [ ] Identify any that need escalation (> 24h)
- [ ] Review all "Escalation" cases first

### Throughout Day
- [ ] Update statuses as responses received
- [ ] Add notes for any rejections (why rejected)
- [ ] Monitor Active Contact Flows summary

### End of Day
- [ ] Escalate any overdue awaiting reviews
- [ ] Report blocked cases (with rejections)
- [ ] Clear completed approved contacts

---

## 🚨 Red Flags to Watch For

| Pattern | Concern | Action |
|---------|---------|--------|
| Multiple escalations | Systemic issue | Manager review |
| High rejection rate | Process problem | Root cause analysis |
| Long awaiting times | Capacity issue | Resource review |
| Same contact always escalating | Specific bottleneck | Investigate that channel |

---

## 📞 Contact When...

### Escalate to Manager When:
- Contact in "Escalation" > 24 hours
- Multiple contacts rejected
- Pattern of delays on specific contact type

### Contact Legal When:
- Attorney Contact shows "Rejected"
- Country Contact raises legal concerns
- Unusual request circumstances

### Contact Operations When:
- Operational Contact shows "Rejected"
- Technical feasibility questions
- Resource constraints

---

This quick reference guide helps case specialists use the Contact Information section effectively for tracking "needs more information" contact flows!
