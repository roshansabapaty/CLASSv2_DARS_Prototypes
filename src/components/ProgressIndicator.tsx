import React from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "./ui/utils";

export interface FieldValidation {
  name: string;
  label: string;
  isValid: boolean;
  isRequired: boolean;
  section: string;
}

interface ProgressIndicatorProps {
  fields: FieldValidation[];
  className?: string;
}

export function ProgressIndicator({ fields, className }: ProgressIndicatorProps) {
  const requiredFields = fields.filter(f => f.isRequired);
  const completedRequired = requiredFields.filter(f => f.isValid).length;
  const totalRequired = requiredFields.length;
  const percentComplete = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  
  const optionalFields = fields.filter(f => !f.isRequired);
  const completedOptional = optionalFields.filter(f => f.isValid).length;
  
  // Group fields by section
  const sections = Array.from(new Set(fields.map(f => f.section)));
  const sectionProgress = sections.map(section => {
    const sectionFields = fields.filter(f => f.section === section && f.isRequired);
    const completed = sectionFields.filter(f => f.isValid).length;
    return {
      name: section,
      completed,
      total: sectionFields.length,
      percent: sectionFields.length > 0 ? Math.round((completed / sectionFields.length) * 100) : 0,
    };
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overall Progress */}
      <div className="bg-white border border-[#e1dfdd] rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[#323130]">Form Completion</h3>
            <p className="text-xs text-[#605e5c] mt-0.5">
              {completedRequired} of {totalRequired} required fields completed
            </p>
          </div>
          <div className="text-right">
            <div className={cn(
              "text-2xl font-bold",
              percentComplete === 100 ? "text-[#107c10]" : "text-[#0078d4]"
            )}>
              {percentComplete}%
            </div>
            {completedOptional > 0 && (
              <p className="text-xs text-[#605e5c]">
                +{completedOptional} optional
              </p>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-[#f3f2f1] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out rounded-full",
              percentComplete === 100 ? "bg-[#107c10]" : "bg-[#0078d4]"
            )}
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Section Progress */}
      <div className="bg-white border border-[#e1dfdd] rounded-lg p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-[#323130] mb-3">Section Progress</h4>
        <div className="space-y-3">
          {sectionProgress.map(section => (
            <div key={section.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#605e5c]">{section.name}</span>
                <span className="text-xs font-medium text-[#323130]">
                  {section.completed}/{section.total}
                </span>
              </div>
              <div className="relative w-full h-1.5 bg-[#f3f2f1] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    section.percent === 100 ? "bg-[#107c10]" : "bg-[#0078d4]"
                  )}
                  style={{ width: `${section.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incomplete Required Fields */}
      {percentComplete < 100 && (
        <div className="bg-[#fff4ce] border border-[#f9a825] rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#f9a825] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-[#323130] mb-2">
                Incomplete Required Fields
              </h4>
              <ul className="space-y-1">
                {requiredFields
                  .filter(f => !f.isValid)
                  .slice(0, 5)
                  .map(field => (
                    <li key={field.name} className="text-xs text-[#605e5c] flex items-center gap-2">
                      <Circle className="w-3 h-3 text-[#605e5c]" />
                      {field.label} ({field.section})
                    </li>
                  ))}
                {requiredFields.filter(f => !f.isValid).length > 5 && (
                  <li className="text-xs text-[#605e5c] italic">
                    ...and {requiredFields.filter(f => !f.isValid).length - 5} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Completion Badge */}
      {percentComplete === 100 && (
        <div className="bg-[#dff6dd] border border-[#107c10] rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#107c10]" />
            <div>
              <p className="text-sm font-semibold text-[#107c10]">All required fields complete!</p>
              <p className="text-xs text-[#605e5c] mt-0.5">You can now submit this form</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}