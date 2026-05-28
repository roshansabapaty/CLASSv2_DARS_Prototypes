/**
 * DataEntryFormExample.tsx
 * 
 * This is an EXAMPLE showing how to integrate the new validated components
 * into your existing DataEntryForm component. This is NOT a replacement for
 * DataEntryForm.tsx - use it as a reference guide.
 * 
 * Key changes demonstrated:
 * 1. Import and use the useFormValidation hook
 * 2. Define validation rules for each field
 * 3. Replace standard inputs with validated components
 * 4. Update form submission to use validation
 */

import React, { useState } from 'react';
import { ValidatedInput } from './ui/validated-input';
import { ValidatedSelect } from './ui/validated-select';
import { ValidatedTextarea } from './ui/validated-textarea';
import { CountryCombobox } from './ui/country-combobox';
import { DateRangePicker } from './ui/date-range-picker';
import { useFormValidation, validators } from '../hooks/useFormValidation';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner@2.0.3';
import { Send, Loader2 } from 'lucide-react';

// Example form data interface
interface ExampleFormData {
  agency: string;
  agencyCaseNumber: string;
  requestOrigin: string;
  requestOriginOther: string;
  country: string;
  stateProvince: string;
  jurisdiction: string;
  casePriority: string;
  caseType: string;
  notes: string;
}

// Example: Constants that would exist in your DataEntryForm
const REQUEST_ORIGIN_OPTIONS = ['LE Portal', 'LEAPI', 'Email forward', 'Paper', 'Other'];
const CASE_PRIORITY_OPTIONS = ['Emergency', 'Urgent', 'Priority', 'Routine', 'Standard'];
const CASE_TYPE_OPTIONS = ['Criminal', 'Civil', 'Administrative'];
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'India', 'Brazil'];

export function DataEntryFormExample() {
  // Form state
  const [formData, setFormData] = useState<ExampleFormData>({
    agency: '',
    agencyCaseNumber: '',
    requestOrigin: '',
    requestOriginOther: '',
    country: '',
    stateProvince: '',
    jurisdiction: '',
    casePriority: '',
    caseType: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // 🎯 NEW: Define validation rules for each field
  const validationRules = {
    agency: validators.required('Agency'),
    
    agencyCaseNumber: validators.required('LE Reference Number'),
    
    requestOrigin: validators.required('Request Origin'),
    
    // Conditional validation: Only required if "Other" is selected
    requestOriginOther: (value: string, data: ExampleFormData) => {
      if (data.requestOrigin === 'Other' && !value?.trim()) {
        return 'Please describe the request origin';
      }
      return undefined;
    },
    
    country: validators.required('Country'),
    
    // Conditional validation: Required for certain countries
    stateProvince: (value: string, data: ExampleFormData) => {
      const countriesRequiringState = ['United States', 'Canada', 'Australia'];
      if (countriesRequiringState.includes(data.country) && !value?.trim()) {
        return `State/Province is required for ${data.country}`;
      }
      return undefined;
    },
    
    jurisdiction: validators.required('Jurisdiction'),
    casePriority: validators.required('Case Priority'),
    caseType: validators.required('Case Type'),
    
    // Optional field with max length
    notes: (value: string) => {
      if (value && value.length > 2000) {
        return 'Notes must not exceed 2000 characters';
      }
      return undefined;
    }
  };

  // 🎯 NEW: Initialize the validation hook
  const {
    errors,
    getFieldError,
    touchField,
    validateField,
    validateForm,
    hasErrors
  } = useFormValidation<ExampleFormData>(validationRules);

  // Handle input changes
  const handleInputChange = (field: keyof ExampleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // If field has been touched, validate on change
    if (errors[field]) {
      validateField(field, value, formData);
    }
  };

  // Handle blur validation
  const handleBlur = (field: keyof ExampleFormData) => {
    touchField(field);
    validateField(field, formData[field], formData);
  };

  // 🎯 UPDATED: Form submission with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate entire form
    const isValid = validateForm(formData);
    
    if (!isValid) {
      // Find first error field and scroll to it
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      
      toast.error('Please fix all validation errors before submitting');
      return;
    }
    
    // Proceed with submission
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Case submitted successfully!');
      
      // Reset form or navigate
    } catch (error) {
      toast.error('Failed to submit case. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      
      {/* Card 1: Case Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6 text-[#323130]">Case Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 🎯 EXAMPLE: ValidatedInput for required text field */}
          <ValidatedInput
            label="Agency"
            value={formData.agency}
            onChange={(e) => handleInputChange('agency', e.target.value)}
            onBlurValidation={() => handleBlur('agency')}
            error={getFieldError('agency')}
            placeholder="e.g., FBI, State Police"
            required
            showSuccess
            hint="Enter the name of the requesting law enforcement agency"
          />

          {/* 🎯 EXAMPLE: ValidatedInput with pattern validation */}
          <ValidatedInput
            label="LE Reference Number"
            value={formData.agencyCaseNumber}
            onChange={(e) => handleInputChange('agencyCaseNumber', e.target.value)}
            onBlurValidation={() => handleBlur('agencyCaseNumber')}
            error={getFieldError('agencyCaseNumber')}
            placeholder="e.g., 2024-12345"
            required
            showSuccess
          />

          {/* 🎯 EXAMPLE: ValidatedSelect */}
          <ValidatedSelect
            label="Request Origin"
            value={formData.requestOrigin}
            onValueChange={(value) => handleInputChange('requestOrigin', value)}
            options={REQUEST_ORIGIN_OPTIONS}
            onBlurValidation={() => handleBlur('requestOrigin')}
            error={getFieldError('requestOrigin')}
            placeholder="Select how request was received..."
            required
            showSuccess
            hint="How did this request come to you?"
          />

          {/* 🎯 EXAMPLE: Conditional field with smooth animation */}
          {formData.requestOrigin === 'Other' && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <ValidatedInput
                label="Describe Request Origin"
                value={formData.requestOriginOther}
                onChange={(e) => handleInputChange('requestOriginOther', e.target.value)}
                onBlurValidation={() => handleBlur('requestOriginOther')}
                error={getFieldError('requestOriginOther')}
                placeholder="e.g., Phone call, Fax, In-person visit"
                required
                showSuccess
                autoFocus
              />
            </div>
          )}
        </div>
      </Card>

      {/* Card 2: Location & Jurisdiction */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6 text-[#323130]">Location & Jurisdiction</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 🎯 EXAMPLE: CountryCombobox for searchable country select */}
          <CountryCombobox
            label="Country"
            value={formData.country}
            onChange={(value) => {
              handleInputChange('country', value);
              // Clear state/province when country changes
              if (!['United States', 'Canada', 'Australia'].includes(value)) {
                handleInputChange('stateProvince', '');
              }
            }}
            countries={COUNTRIES}
            onBlurValidation={() => handleBlur('country')}
            error={getFieldError('country')}
            required
            hint="Type to search for a country"
          />

          {/* 🎯 EXAMPLE: Conditionally required field based on country */}
          <ValidatedInput
            label="State/Province"
            value={formData.stateProvince}
            onChange={(e) => handleInputChange('stateProvince', e.target.value)}
            onBlurValidation={() => handleBlur('stateProvince')}
            error={getFieldError('stateProvince')}
            placeholder={
              ['United States', 'Canada', 'Australia'].includes(formData.country)
                ? 'Required for this country'
                : 'Optional'
            }
            required={['United States', 'Canada', 'Australia'].includes(formData.country)}
            showSuccess
            disabled={!formData.country}
            hint={
              !formData.country
                ? 'Select a country first'
                : ['United States', 'Canada', 'Australia'].includes(formData.country)
                ? 'Required for this country'
                : 'Optional'
            }
          />

          <ValidatedInput
            label="Jurisdiction"
            value={formData.jurisdiction}
            onChange={(e) => handleInputChange('jurisdiction', e.target.value)}
            onBlurValidation={() => handleBlur('jurisdiction')}
            error={getFieldError('jurisdiction')}
            placeholder="e.g., International, National, State and Local"
            required
            showSuccess
          />
        </div>
      </Card>

      {/* Card 3: Case Details */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6 text-[#323130]">Case Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 🎯 EXAMPLE: ValidatedSelect for priority */}
          <ValidatedSelect
            label="Case Priority"
            value={formData.casePriority}
            onValueChange={(value) => handleInputChange('casePriority', value)}
            options={CASE_PRIORITY_OPTIONS}
            onBlurValidation={() => handleBlur('casePriority')}
            error={getFieldError('casePriority')}
            placeholder="Select priority level..."
            required
            showSuccess
          />

          <ValidatedSelect
            label="Case Type"
            value={formData.caseType}
            onValueChange={(value) => handleInputChange('caseType', value)}
            options={CASE_TYPE_OPTIONS}
            onBlurValidation={() => handleBlur('caseType')}
            error={getFieldError('caseType')}
            placeholder="Select case type..."
            required
            showSuccess
          />
        </div>

        {/* 🎯 EXAMPLE: DateRangePicker with validation */}
        <div className="mt-6">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            startLabel="Collection Start Date"
            endLabel="Collection End Date"
            maxDaysWarning={365}
            hint="Select the date range for data collection"
          />
        </div>

        {/* 🎯 EXAMPLE: ValidatedTextarea with character count */}
        <div className="mt-6">
          <ValidatedTextarea
            label="Case Notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            onBlurValidation={() => handleBlur('notes')}
            error={getFieldError('notes')}
            placeholder="Add any relevant details about this case..."
            hint="Optional: Provide additional context for this case"
            rows={4}
            maxLength={2000}
            showCharacterCount
            showSuccess
          />
        </div>
      </Card>

      {/* Submit Button with loading state */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // Reset form
            setFormData({
              agency: '',
              agencyCaseNumber: '',
              requestOrigin: '',
              requestOriginOther: '',
              country: '',
              stateProvince: '',
              jurisdiction: '',
              casePriority: '',
              caseType: '',
              notes: ''
            });
          }}
        >
          Reset
        </Button>
        
        <Button
          type="submit"
          disabled={isSubmitting || hasErrors}
          className="gap-2 min-w-[160px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Case
            </>
          )}
        </Button>
      </div>

      {/* Validation Summary (optional - helps users see what needs fixing) */}
      {hasErrors && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800 mb-2">
            Please fix the following errors:
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
