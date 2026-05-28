# Date Format Update - Change to "MMM dd, yyyy"

## Objective
Update all date displays throughout the application to use three-letter month abbreviations with zero-padded days.

**Target Format:** `MMM dd, yyyy`
**Example:** `Jan 20, 2026`, `Feb 05, 2026`, `Dec 31, 2026`

---

## Files to Update

### **DataEntryForm.tsx** (21+ instances)

#### Pattern 1: "MMM d, yyyy" → "MMM dd, yyyy" (21 instances)
Locations:
- Line 5667: Due date display
- Line 5942: Create date display
- Line 7370: Authorization start date
- Line 7380: Authorization expiration date
- Line 7496: Approval timestamp (also has time)
- Line 9054: NDO start date
- Line 9055: NDO expiration date
- Line 9244: Current NDO start date
- Line 9277: Current NDO expiration date
- Line 9387: Date of LE notification
- Line 9429: LE response due date
- Line 9498: Date of LE response
- Line 9551: Date of user notification
- Line 9593: User response due date
- Line 9661: Date of user response
- Line 9858: NDO start date (edit mode)
- Line 9882: NDO expiration date (edit mode)
- Line 9912: NDO created on
- Line 9983: NDO start date (display)
- Line 9989: NDO expiration date (display)
- Line 9999: NDO created on (display)

#### Pattern 2: "MM/dd/yyyy" → "MMM dd, yyyy" (2 instances)
Locations:
- Line 8259: Service start date
- Line 8288: Service end date

#### Pattern 3: Already correct "MMM dd, yyyy" (3 instances)
Locations:
- Line 4382: Category date range (keep as-is)
- Line 8521: Service creation date (keep as-is)
- Line 8827: Service creation date (keep as-is)

#### Pattern 4: Time format "MMM d, yyyy h:mm a" → "MMM dd, yyyy h:mm a" (1 instance)
Location:
- Line 7496: Approval timestamp

---

## Other Files to Check

### **CaseQueue.tsx**
- Case create dates
- Due dates
- Last used dates

### **CollectionTracker.tsx**
- Collection status update timestamps
- Last refreshed timestamps

### **IdentifiersSummaryView.tsx**
- Any date displays in the summary view

### **FulfillmentTaskView.tsx**
- Task date displays

### **NDOSummaryView.tsx**
- NDO date displays

---

## Implementation Strategy

### Phase 1: DataEntryForm.tsx
1. Replace all "MMM d, yyyy" with "MMM dd, yyyy"
2. Replace all "MM/dd/yyyy" with "MMM dd, yyyy"
3. Update time format to "MMM dd, yyyy h:mm a"

### Phase 2: Other Components
1. Search each file for date format patterns
2. Apply same replacements
3. Test each component

---

## Expected Results

### Before:
- "Jan 5, 2026" (single digit day)
- "12/31/2025" (numeric format)
- "Feb 1, 2026 3:30 PM" (time with single digit)

### After:
- "Jan 05, 2026" (zero-padded day)
- "Dec 31, 2025" (three-letter month)
- "Feb 01, 2026 3:30 PM" (zero-padded with time)

---

## Benefits

1. **Consistency** - All dates use the same format
2. **Clarity** - Three-letter months are clearer than numbers
3. **International** - Less ambiguous than MM/DD vs DD/MM
4. **Professional** - Standard format used in enterprise software
5. **Accessibility** - Screen readers pronounce month names better

---

## Testing Checklist

After updates, verify:
- [ ] Case create dates display correctly
- [ ] Due dates display correctly  
- [ ] Authorization dates display correctly
- [ ] NDO dates display correctly
- [ ] Notification dates display correctly
- [ ] Service dates display correctly
- [ ] Timestamps with time display correctly
- [ ] Date pickers still work
- [ ] All dates are zero-padded (01-09, not 1-9)

---

## Files Ready for Update

Total replacements needed in DataEntryForm.tsx:
- 21 instances of "MMM d, yyyy" → "MMM dd, yyyy"
- 2 instances of "MM/dd/yyyy" → "MMM dd, yyyy"
- 3 instances already correct

**Status:** Ready to proceed with find/replace operations
