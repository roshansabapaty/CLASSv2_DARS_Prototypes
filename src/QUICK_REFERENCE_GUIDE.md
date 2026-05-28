# Quick Reference Guide
## Validated Form Components - Before & After Examples

---

## 🎯 Quick Start

**Want to see it in action?** Look at `/components/DataEntryFormExample.tsx` for a complete working example.

---

## 📚 Component Reference

### 1. ValidatedInput

**When to use:** Any text input that needs validation (name, email, reference numbers, etc.)

**Props:**
```tsx
<ValidatedInput
  label="Agency"                          // Field label
  value={formData.agency}                 // Current value
  onChange={(e) => handleChange(e)}       // Change handler
  onBlurValidation={() => validate()}     // Validation on blur
  error={getFieldError('agency')}         // Error message (if any)
  placeholder="e.g., FBI"                 // Placeholder text
  required                                // Show * indicator
  showSuccess                             // Show ✓ when valid
  hint="Helper text here"                 // Gray hint text below
/>
```

**Before:**
```tsx
<div className="space-y-2">
  <Label htmlFor="agency">Agency *</Label>
  <Input
    id="agency"
    value={formData.agency}
    onChange={(e) => handleInputChange("agency", e.target.value)}
  />
</div>
```

**After:**
```tsx
<ValidatedInput
  label="Agency"
  value={formData.agency}
  onChange={(e) => handleInputChange("agency", e.target.value)}
  onBlurValidation={() => handleBlur("agency")}
  error={getFieldError('agency')}
  required
  showSuccess
/>
```

---

### 2. ValidatedSelect

**When to use:** Dropdown selections with limited options

**Props:**
```tsx
<ValidatedSelect
  label="Case Priority"
  value={formData.priority}
  onValueChange={(val) => handleChange(val)}
  options={['Emergency', 'Urgent', 'Routine']}  // String array OR
  options={[                                      // Object array
    { value: 'emergency', label: 'Emergency' },
    { value: 'urgent', label: 'Urgent' }
  ]}
  onBlurValidation={() => validate()}
  error={getFieldError('priority')}
  placeholder="Select priority..."
  required
  showSuccess
/>
```

**Before:**
```tsx
<Select value={formData.priority} onValueChange={handleChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="emergency">Emergency</SelectItem>
    <SelectItem value="urgent">Urgent</SelectItem>
  </SelectContent>
</Select>
```

**After:**
```tsx
<ValidatedSelect
  label="Case Priority"
  value={formData.priority}
  onValueChange={handleChange}
  options={['Emergency', 'Urgent', 'Routine']}
  error={getFieldError('priority')}
  required
/>
```

---

### 3. CountryCombobox

**When to use:** Selecting from a long list (countries, states, etc.) where search is helpful

**Props:**
```tsx
<CountryCombobox
  label="Country"
  value={formData.country}
  onChange={(val) => handleChange(val)}
  countries={COUNTRIES_ARRAY}
  onBlurValidation={() => validate()}
  error={getFieldError('country')}
  placeholder="Select country..."
  required
  hint="Type to search"
/>
```

**Before:**
```tsx
<Select value={formData.country} onValueChange={handleChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select country..." />
  </SelectTrigger>
  <SelectContent>
    {COUNTRIES.map((country) => (
      <SelectItem key={country} value={country}>
        {country}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**After:**
```tsx
<CountryCombobox
  label="Country"
  value={formData.country}
  onChange={handleChange}
  countries={COUNTRIES}
  error={getFieldError('country')}
  required
  hint="Type to search for a country"
/>
```

---

### 4. DateRangePicker

**When to use:** Selecting a date range (start/end dates) with validation

**Props:**
```tsx
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onStartDateChange={setStartDate}
  onEndDateChange={setEndDate}
  startLabel="Collection Start"        // Custom labels
  endLabel="Collection End"
  error={getFieldError('dateRange')}
  maxDaysWarning={365}                  // Warn if > 365 days
  required
  hint="Select the data collection period"
/>
```

**Before:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label>Start Date</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {startDate ? format(startDate, "PPP") : "Pick date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar selected={startDate} onSelect={setStartDate} />
      </PopoverContent>
    </Popover>
  </div>
  {/* Repeat for end date */}
</div>
```

**After:**
```tsx
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onStartDateChange={setStartDate}
  onEndDateChange={setEndDate}
  maxDaysWarning={365}
  required
/>
```

---

### 5. ValidatedTextarea

**When to use:** Multi-line text input with character limits

**Props:**
```tsx
<ValidatedTextarea
  label="Case Notes"
  value={formData.notes}
  onChange={(e) => handleChange(e.target.value)}
  onBlurValidation={() => validate()}
  error={getFieldError('notes')}
  placeholder="Add details..."
  hint="Optional notes about this case"
  rows={4}
  maxLength={2000}
  showCharacterCount          // Shows "123 / 2000"
  showSuccess
/>
```

**Before:**
```tsx
<div className="space-y-2">
  <Label htmlFor="notes">Case Notes</Label>
  <Textarea
    id="notes"
    value={formData.notes}
    onChange={(e) => handleChange(e.target.value)}
    rows={4}
  />
</div>
```

**After:**
```tsx
<ValidatedTextarea
  label="Case Notes"
  value={formData.notes}
  onChange={(e) => handleChange(e.target.value)}
  error={getFieldError('notes')}
  rows={4}
  maxLength={2000}
  showCharacterCount
/>
```

---

## 🔧 Validation Hook

### Setup

**1. Import:**
```tsx
import { useFormValidation, validators } from '../hooks/useFormValidation';
```

**2. Define rules:**
```tsx
const validationRules = {
  // Simple required field
  agency: validators.required('Agency'),
  
  // Email validation
  email: validators.email,
  
  // Conditional validation
  otherReason: (value: string, formData: FormData) => {
    if (formData.reason === 'Other' && !value?.trim()) {
      return 'Please specify the reason';
    }
    return undefined;
  },
  
  // Custom validation
  caseNumber: (value: string) => {
    if (!/^CASE-\d{4}-\d+$/.test(value)) {
      return 'Invalid case number format';
    }
    return undefined;
  }
};
```

**3. Initialize hook:**
```tsx
const {
  errors,              // All current errors
  getFieldError,       // Get error for specific field
  touchField,          // Mark field as touched
  validateField,       // Validate one field
  validateForm,        // Validate entire form
  hasErrors            // Boolean: are there any errors?
} = useFormValidation<FormData>(validationRules);
```

**4. Use in handlers:**
```tsx
// On blur
const handleBlur = (field: keyof FormData) => {
  touchField(field);
  validateField(field, formData[field], formData);
};

// On submit
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm(formData)) {
    toast.error('Please fix all errors');
    return;
  }
  
  // Submit data...
};
```

---

## 📖 Common Validation Rules

### Built-in Validators

```tsx
import { validators } from '../hooks/useFormValidation';

// Required field
validators.required('Field Name')

// Email
validators.email

// Min length
validators.minLength(5, 'Password')

// Max length
validators.maxLength(100, 'Description')

// Pattern matching
validators.pattern(/^\d{3}-\d{4}$/, 'Format: 123-4567')

// Date validations
validators.futureDate('Expiration Date')
validators.pastDate('Birth Date')
validators.dateRange(startDate, endDate, 'Date Range')
```

### Custom Validators

```tsx
// Simple custom
fieldName: (value: string) => {
  if (!value) return 'This field is required';
  if (value.length < 3) return 'Too short';
  return undefined;  // No error
}

// With access to full form data
otherField: (value: string, formData: FormData) => {
  if (formData.someFlag && !value) {
    return 'Required when flag is set';
  }
  return undefined;
}
```

---

## 🎨 Visual States

### Error State
- **Border:** Red (#d13438)
- **Icon:** Red ❌ (AlertCircle)
- **Message:** Red text below field
- **Example:** "Agency is required"

### Success State (when showSuccess={true})
- **Border:** Green (#107c10)
- **Icon:** Green ✓ (CheckCircle2)
- **No message** (success is implicit)

### Default State
- **Border:** Gray
- **No icon**
- **Hint text:** Gray text below (if provided)

---

## 💡 Best Practices

### ✅ DO

```tsx
// Validate on blur, not on every keystroke
<ValidatedInput
  onBlurValidation={() => handleBlur('agency')}
  // NOT onChange validation (too aggressive)
/>

// Use showSuccess for required fields
<ValidatedInput required showSuccess />

// Provide helpful hints
<ValidatedInput hint="Enter your agency's full legal name" />

// Use conditional validation
stateProvince: (value, formData) => {
  if (formData.country === 'United States' && !value) {
    return 'State is required for US addresses';
  }
}
```

### ❌ DON'T

```tsx
// Don't validate on every keystroke (too aggressive)
<ValidatedInput onChange={() => validate()} />

// Don't use vague error messages
error="Invalid input"  // ❌
error="Agency name must be at least 3 characters"  // ✅

// Don't forget to show errors only after blur
<ValidatedInput error={errors.agency} />  // ❌ Shows too early
<ValidatedInput error={getFieldError('agency')} />  // ✅ Only after blur
```

---

## 🐛 Troubleshooting

### Error not showing?
**Check:** Did you call `touchField()` in `onBlurValidation`?
```tsx
onBlurValidation={() => {
  touchField('agency');  // ← This is required!
  validateField('agency', value);
}}
```

### Error showing too early?
**Check:** Use `getFieldError()`, not `errors.field` directly
```tsx
error={getFieldError('agency')}  // ✅ Only shows after blur
// NOT: error={errors.agency}     // ❌ Shows immediately
```

### Form submitting with errors?
**Check:** Call `validateForm()` in submit handler
```tsx
const handleSubmit = (e) => {
  e.preventDefault();
  
  if (!validateForm(formData)) {  // ← This is required!
    return;
  }
  
  // Submit...
};
```

### Conditional validation not working?
**Check:** Pass full `formData` to `validateField`
```tsx
validateField('stateProvince', value, formData)  // ✅
// NOT: validateField('stateProvince', value)    // ❌
```

---

## 📝 Migration Checklist

For each field you convert:

- [ ] Import the validated component
- [ ] Add field to validation rules
- [ ] Replace JSX with validated component
- [ ] Add `onBlurValidation` handler
- [ ] Pass `error={getFieldError('field')}`
- [ ] Add `required` prop if needed
- [ ] Add `showSuccess` prop if desired
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Verify error messages make sense

---

## 🚀 Quick Win: Convert Your First Field

**Time: 5 minutes**

1. Pick the Agency field (it's required and simple)
2. Add to top of DataEntryForm.tsx:
   ```tsx
   import { ValidatedInput } from './ui/validated-input';
   import { useFormValidation, validators } from '../hooks/useFormValidation';
   ```
3. After your state declarations:
   ```tsx
   const { getFieldError, touchField, validateField } = useFormValidation({
     agency: validators.required('Agency')
   });
   
   const handleBlur = (field: string) => {
     touchField(field);
     validateField(field, formData[field]);
   };
   ```
4. Replace the Agency field JSX:
   ```tsx
   <ValidatedInput
     label="Agency"
     value={formData.agency}
     onChange={(e) => handleInputChange("agency", e.target.value)}
     onBlurValidation={() => handleBlur("agency")}
     error={getFieldError('agency')}
     required
     showSuccess
   />
   ```
5. Test:
   - Leave field empty and blur → See error
   - Type "FBI" → See green checkmark
   - Try to submit → Blocked if empty

**Congratulations!** You just improved the UX of your first field. Now do the rest! 🎉

---

## 📚 Additional Resources

- **Full Example:** `/components/DataEntryFormExample.tsx`
- **Implementation Guide:** `/IMPLEMENTATION_GUIDE_VALIDATED_COMPONENTS.md`
- **Code Review:** `/CODE_REVIEW_UX_IMPROVEMENTS.md`
- **Summary:** `/UX_IMPROVEMENTS_SUMMARY.md`
