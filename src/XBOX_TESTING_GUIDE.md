# Xbox Live Manual Collection - Testing Guide

## ✅ Xbox Integration Status

Xbox Live is **fully integrated** and ready to test! All required code is in place.

---

## How to Test Xbox Manual Collection

### **Step 1: Start in Triage Stage**

1. Fill out Case Identification (or use existing data)
2. Scroll to **Step 2: Account Identifiers**
3. Click **"+ Add Identifier"** if you haven't added one yet
4. Enter identifier details:
   - **Value:** `gamer@outlook.com` (or any identifier)
   - **Type:** `Email Address`

---

### **Step 2: Add Xbox Live Service**

#### Option A: From "Add Services" Dropdown
1. Find your identifier card
2. Click the **"Add Services (X available)"** button
3. In the search/dropdown, find **"Xbox Live"**
   - Description: "Gaming activity, messages, and profile data"
4. Click on **"Xbox Live"** to add it
5. A success toast will appear: "Xbox Live added successfully"

#### Option B: Enable from Service List (if already showing)
1. If Xbox Live appears in the service list already
2. Check the checkbox next to **"Xbox Live"**
3. The service will expand showing categories

---

### **Step 3: Select Xbox Data Categories**

Once Xbox Live is enabled, you'll see 5 unified categories:

1. ☑️ **Basic Subscriber** - Account registration and profile information
2. ☑️ **Content** - User-generated content and communications  
3. ☑️ **Authentication Logs** - Sign-in and authentication records
4. ☑️ **Payment Transaction Records** - Purchase and transaction history
5. ☑️ **Non-Content** - Additional metadata and account details

**Select one or more categories** by checking the boxes.

---

### **Step 4: Submit to Fulfillment**

1. Click **"Submit to Fulfillment"** at the bottom of the page
2. The workflow advances to **Fulfillment Stage**
3. Review your selections in the summary view
4. Click **"Submit to Collection"**

---

### **Step 5: View Manual Collection Form**

1. The workflow advances to **Collection Stage**
2. You'll see **TWO separate sections:**

```
┌─ 🔧 Manual Collection Services (X) ──────────┐
│ Services requiring manual data collection    │
│                                               │
│ ┌─ Xbox Live - Basic Subscriber ────────────┐│
│ │ gamer@outlook.com • JOB-202601-XXXXX      ││
│ │                                            ││
│ │ Collection Status: [Not Started ▼]        ││
│ │ Publish Status: [Not Started ▼]           ││
│ │ Delivery Status: [Not Started ▼]          ││
│ │                                            ││
│ │ Data Storage Location: *                  ││
│ │ [Enter path or URL]         [Copy]        ││
│ │                                            ││
│ │ Collection Notes:                          ││
│ │ [Add notes about collection...]            ││
│ │                                            ││
│ │ [Reset] [💾 Save Status Update]           ││
│ └────────────────────────────────────────────┘│
└───────────────────────────────────────────────┘

┌─ ⚡ Automated Collection Services (Y) ────────┐
│ (Other services like Outlook, Teams, etc.)    │
└───────────────────────────────────────────────┘
```

---

### **Step 6: Test Manual Status Updates**

#### Update Collection Status:
1. Click the **Collection Status** dropdown
2. Select one of:
   - Not Started
   - **Requested from Xbox Team** ← Use this when you've submitted request
   - **In Progress** ← Use this when Xbox team is working on it
   - **Complete** ← Data has been received
   - Failed
   - No Data Available

#### Add Data Location (Required when Complete):
1. Once status is **"Complete"**, you MUST enter data location
2. Click in the **Data Storage Location** field
3. Enter one of:
   - Network path: `\\server\xbox\LNS-2025-123\`
   - Cloud URL: `https://storage.cloud.com/case-123/xbox/`
4. Click the **Copy** button to copy to clipboard

#### Add Collection Notes:
1. Click in the **Collection Notes** textarea
2. Add details like:
   ```
   Requested from Xbox Compliance Team on 1/20/2026
   Contact: John Smith (xbox-compliance@microsoft.com)
   Expected delivery: 1/27/2026
   Data received via secure upload portal
   ```

#### Update Publish & Delivery Status:
1. As workflow progresses, update **Publish Status**:
   - Not Started → Ready to Publish → Publishing → Published
2. Update **Delivery Status**:
   - Not Started → Ready for Delivery → In Transit → Delivered

#### Save Changes:
1. Click **"💾 Save Status Update"** button
2. Success toast appears
3. Timestamp updates: "Last updated by Nicole Garcia"
4. Changes are persisted

---

### **Step 7: Test Change Tracking**

1. Make a change (e.g., change Collection Status)
2. **Don't save yet**
3. Notice the indicator changes to: ⚠️ **"Unsaved changes"**
4. Try clicking **"Reset"** → Changes revert
5. Make changes again
6. Click **"Save Status Update"** → Indicator changes to ✅ **"All changes saved"**

---

### **Step 8: Test Validation**

1. Set **Collection Status** to **"Complete"**
2. Leave **Data Location** empty
3. Try to click **"Save Status Update"**
4. **Button is disabled** ✅
5. Error message appears: ⚠️ "Data location is required when collection is complete"
6. Enter a data location
7. Button becomes enabled ✅
8. Save works successfully

---

## Expected Behaviors

### ✅ Visual Distinction
- **Manual services:** Amber/orange color scheme
- **Automated services:** Blue color scheme
- **Section icons:** 🔧 Wrench (manual) vs ⚡ Zap (automated)

### ✅ Independent Updates
- Each Xbox job (category) has its own form
- Updates don't affect other jobs
- Multiple Xbox jobs can exist for different identifiers

### ✅ Statistics Integration
- Summary statistics count **both** manual and automated jobs
- Total Jobs = Manual + Automated
- Status counts aggregate across all service types

### ✅ Form Validation
- Data location required when status = "Complete"
- Save button disabled when validation fails
- Clear error messaging

### ✅ Audit Trail
- Every save records "Last updated by Nicole Garcia"
- Timestamp shows exact update time
- Change tracking shows unsaved vs saved state

---

## Testing Different Scenarios

### Scenario 1: Single Xbox Category
1. Add identifier
2. Enable Xbox Live
3. Select **only** "Basic Subscriber"
4. Submit to Collection
5. **Result:** 1 manual collection form appears

### Scenario 2: Multiple Xbox Categories
1. Add identifier  
2. Enable Xbox Live
3. Select **all 5 categories**
4. Submit to Collection
5. **Result:** 5 separate manual collection forms appear (one per category)

### Scenario 3: Multiple Identifiers with Xbox
1. Add **2 identifiers**
2. Enable Xbox Live on **both**
3. Select categories on both
4. Submit to Collection
5. **Result:** Manual forms for all identifier+category combinations

### Scenario 4: Mixed Services
1. Add identifier
2. Enable **Xbox Live** + **Outlook** + **Teams**
3. Select categories for all
4. Submit to Collection
5. **Result:**
   - Xbox appears in "🔧 Manual Collection Services"
   - Outlook & Teams appear in "⚡ Automated Collection Services"

### Scenario 5: Xbox Only
1. Add identifier
2. Enable **only Xbox Live**
3. Select categories
4. Submit to Collection
5. **Result:**
   - "🔧 Manual Collection Services" section shows
   - "⚡ Automated Collection Services" section **doesn't show** (no automated jobs)

---

## Troubleshooting

### Xbox doesn't appear in "Add Services" dropdown
- ✅ **This should not happen** - Xbox is in `MICROSOFT_SERVICES_CONFIG`
- Check browser console for errors
- Try refreshing the page

### Xbox categories don't show when enabled
- Check that `expandedServices` state is working
- Click the service name to expand it manually

### Manual collection form doesn't appear
- Verify you clicked "Submit to Collection" from Fulfillment stage
- Check that Xbox categories are actually **enabled** (checked)
- Check browser console for errors

### Save button doesn't work
- Check if data location is filled when status = "Complete"
- Verify changes were actually made (unsaved indicator should show)
- Check browser console for errors

---

## Success Criteria

✅ Xbox Live appears in service dropdown  
✅ Xbox can be enabled/disabled  
✅ Xbox categories can be selected  
✅ Xbox jobs appear in Manual Collection section  
✅ Forms use amber/orange color scheme  
✅ Status dropdowns work properly  
✅ Data location field validates correctly  
✅ Copy to clipboard works  
✅ Save persists changes  
✅ Change tracking works  
✅ Timestamp/attribution updates  
✅ Multiple Xbox jobs work independently  
✅ Statistics count manual + automated jobs  

---

## Ready to Test!

Everything is in place. Just follow the steps above and Xbox Live manual collection should work perfectly! 🎮✅
