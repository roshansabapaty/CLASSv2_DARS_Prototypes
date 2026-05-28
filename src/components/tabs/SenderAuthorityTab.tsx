import React, { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { PrimaryCard, SecondaryCard } from "../CardTier";
import { CollapsibleSection } from "../CollapsibleSection";
import {
  IssuingAuthorityDetails,
  ValidatingAuthorityDetails,
  CompetentAuthorityDetails,
  EnforcingAuthorityDetails,
} from "../authority-details/AuthorityDetailsBlocks";
import {
  Tooltip as ShadcnTooltip,
  TooltipContent as ShadcnTooltipContent,
  TooltipProvider as ShadcnTooltipProvider,
  TooltipTrigger as ShadcnTooltipTrigger,
} from "../ui/tooltip";
import { resolveEEvidenceEnforcingAuthority } from "../../config/eevidenceEnforcingAuthority";
import {
  EEVIDENCE_APPROVER_TYPE_DESCRIPTIONS,
  type EEvidenceApproverType,
} from "../../types/caseTypes";
import {
  Building,
  User,
  Search,
  MapPin,
  Plus,
  X,
  AlertCircle,
  Send,
  Shield,
  ChevronUp,
  ChevronDown,
  Calendar as CalendarIcon,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../ui/utils";
import { toast } from "sonner@2.0.3";
import type { FormData } from "../../types/caseTypes";
import { formatPhoneNumber, MOCK_AGENCIES, MOCK_CONTACTS } from "../../utils/caseHelpers";

interface SectionsManager {
  isOpen: (sectionId: string) => boolean;
  toggle: (sectionId: string) => void;
}

export interface SenderAuthorityTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  sections: SectionsManager;
  handleInputChange: (field: string, value: any) => void;
  handleAgentChange: (agentId: string, field: string, value: any) => void;
  handleAddAgent: () => void;
  handleRemoveAgent: (agentId: string, agentName: string) => void;
  handleSelectAgency: (agency: any) => void;
  handleSelectContact: (contact: any) => void;
  agencySearchOpen: boolean;
  setAgencySearchOpen: (open: boolean) => void;
  contactSearchOpen: boolean;
  setContactSearchOpen: (open: boolean) => void;
}

export function SenderAuthorityTab({
  formData,
  setFormData,
  sections,
  handleInputChange,
  handleAgentChange,
  handleAddAgent,
  handleRemoveAgent,
  handleSelectAgency,
  handleSelectContact,
  agencySearchOpen,
  setAgencySearchOpen,
  contactSearchOpen,
  setContactSearchOpen,
}: SenderAuthorityTabProps) {
  // UX-Polish 1E: removed the legacy `showApprovalDetails` nested toggle.
  // The Approval Details block now always renders when its parent
  // "Authorization Details" CollapsibleSection is expanded — a single
  // disclosure instead of double-disclosure friction.

  return (
    <>
      {/* eEvidence cases ship with TWO authority agencies — the
          Issuing Authority (IA) that authorized the order and the
          Enforcing Authority (EA) in the executing Member State that
          transmitted it. Both arrive read-only via the Form 1 API
          submission, so we surface them as paired read-only cards
          ABOVE the standard single-agency block. Non-eEvidence cases
          (Search Warrant, Court Order, COPO, etc.) skip this section
          entirely — they only have a single requesting agency. */}
      {formData.requestType === "eEvidence" && (
        <EEvidenceAuthorityCards formData={formData} />
      )}

      {/* Agency Details and Contacts - Full Width Card */}
      <PrimaryCard accent="green">
        <CollapsibleSection
          sectionId="agency-details"
          isOpen={sections.isOpen("agency-details")}
          onToggle={() => sections.toggle("agency-details")}
          className="p-0"
          headerClassName="p-4 bg-gradient-to-r from-[#f3faf4] to-white border-b-2 border-[#107c10] rounded-none"
          headerBorder={false}
          header={
            <>
              <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
                <Building className="w-5 h-5 text-[#107c10]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-[#323130] font-bold text-base" id="agency-contacts-heading">
                  {formData.requestType === "eEvidence"
                    ? "Requesting Agency"
                    : "Agency Details and Contacts"}
                </h3>
                <p className="text-xs text-[#605e5c] mt-0.5">
                  {formData.requestType === "eEvidence"
                    ? "The agency that submitted this request to Microsoft. Distinct from the Issuing / Enforcing Authorities above."
                    : "Law enforcement agency information and contact details"}
                </p>
              </div>
            </>
          }
          collapsedSummary={
            formData.agency ? (
              <Badge variant="outline" className="text-xs">{formData.agency}</Badge>
            ) : null
          }
        >
          {/* Required Field Legend */}
          <div className="px-4 py-2 bg-[#faf9f8] border-b border-[#edebe9]">
            <div className="flex items-center gap-2 text-xs text-[#605e5c]">
              <span className="text-[#d13438] font-bold" aria-hidden="true">*</span>
              <span>Indicates required field</span>
            </div>
          </div>

          {/* Agency Information Section */}
          <div role="region" aria-labelledby="agency-contacts-heading">
            {/* Agency Details */}
            <fieldset className="border-0 m-0 p-5 bg-white border-b border-[#edebe9]">
              <legend className="sr-only">Agency Information</legend>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#edebe9]">
                 <Building className="w-4 h-4 text-[#107c10]" aria-hidden="true" />
                 <h4 className="text-sm font-bold text-[#323130]" id="agency-details-heading">Agency Details</h4>
              </div>

              <div className="space-y-4">
                {/* Row 1: Agency Name and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Agency Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="agency" className="text-xs font-bold text-[#323130]">
                      Agency Name <span className="text-[#d13438]" aria-label="required">*</span>
                    </Label>
                    <div className="relative">
                    <Input
                      id="agency"
                      value={formData.agency}
                      onChange={(e) => handleInputChange("agency", e.target.value)}
                      placeholder="Enter agency name"
                      className="h-9 text-sm pr-9 border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      aria-required="true"
                      aria-describedby="agency-help"
                    />
                    <span id="agency-help" className="sr-only">
                      Search for existing agencies or enter a new one
                    </span>
                    <Popover open={agencySearchOpen} onOpenChange={setAgencySearchOpen}>
                        <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="absolute right-0 top-0 h-9 w-9 text-[#605e5c] hover:bg-[#f3f2f1]"
                              aria-label="Search existing agencies"
                              type="button"
                            >
                                <Search className="w-4 h-4" aria-hidden="true" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="end">
                            <Command>
                                <CommandInput placeholder="Search agencies..." />
                                <CommandList>
                                    <CommandEmpty>No agency found.</CommandEmpty>
                                    <CommandGroup>
                                        {MOCK_AGENCIES.map((agency) => (
                                            <CommandItem key={agency.id} value={agency.name} onSelect={() => handleSelectAgency(agency)}>
                                                {agency.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                  </div>
                  </div>

                  {/* Agency Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="agencyPhone" className="text-xs font-bold text-[#323130]">
                      Phone <span className="text-[#d13438]" aria-label="required">*</span>
                    </Label>
                    <Input
                      id="agencyPhone"
                      type="tel"
                      value={formData.agencyPhone}
                      onChange={(e) => handleInputChange("agencyPhone", formatPhoneNumber(e.target.value))}
                      placeholder="+1 (555) 000-0000"
                      className="h-9 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      aria-required="true"
                      aria-describedby="agency-phone-help"
                    />
                    <span id="agency-phone-help" className="sr-only">
                      Enter phone number with country code
                    </span>
                  </div>
                </div>

                {/* Address Section */}
                <fieldset className="space-y-3 border-0 p-0 m-0 pt-2">
                    <legend className="text-xs font-bold text-[#323130] mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#605e5c]" aria-hidden="true" />
                      Address <span className="text-[#d13438]" aria-label="required">*</span>
                    </legend>
                    
                    {/* Row 2: Street Address (full width) */}
                    <Input
                        id="agency-address-street"
                        value={formData.agencyAddress.number}
                        onChange={(e) => handleInputChange("agencyAddress", { ...formData.agencyAddress, number: e.target.value })}
                        placeholder="Street Address"
                        className="h-9 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        aria-required="true"
                        aria-label="Street address"
                    />
                    
                    {/* Row 3: City and State */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            id="agency-address-city"
                            value={formData.agencyAddress.city}
                            onChange={(e) => handleInputChange("agencyAddress", { ...formData.agencyAddress, city: e.target.value })}
                            placeholder="City"
                            className="h-9 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            aria-required="true"
                            aria-label="City"
                        />
                        <Input
                            id="agency-address-state"
                            value={formData.agencyAddress.stateProvince}
                            onChange={(e) => handleInputChange("agencyAddress", { ...formData.agencyAddress, stateProvince: e.target.value })}
                            placeholder="State"
                            className="h-9 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            aria-required="true"
                            aria-label="State or province"
                        />
                    </div>
                    
                    {/* Row 4: Zip Code */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            id="agency-address-zip"
                            value={formData.agencyAddress.postalCode}
                            onChange={(e) => handleInputChange("agencyAddress", { ...formData.agencyAddress, postalCode: e.target.value })}
                            placeholder="Zip Code"
                            className="h-9 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            aria-required="true"
                            aria-label="Postal code or zip code"
                        />
                    </div>
                </fieldset>
              </div>
            </fieldset>

            {/* Law Enforcement Contacts Section - Full Width Below */}
            <fieldset className="border-0 m-0 p-5 bg-[#faf9f8]">
              <legend className="sr-only">Law Enforcement Contacts</legend>
               <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#edebe9]">
                  <div className="flex items-center gap-2">
                     <User className="w-4 h-4 text-[#0078d4]" aria-hidden="true" />
                     <h4 className="text-sm font-bold text-[#323130]" id="contacts-heading">Law Enforcement Contacts</h4>
                     <Badge variant="outline" className="text-xs font-semibold" aria-label={`${formData.agents.length} contacts`}>
                       {formData.agents.length}
                     </Badge>
                  </div>
                  <div className="flex gap-1.5">
                      <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
                          <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-1.5 text-xs"
                                aria-label="Search existing contacts"
                                type="button"
                              >
                                  <Search className="w-3.5 h-3.5" aria-hidden="true" />
                                  Search
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="end">
                              <Command>
                                  <CommandInput placeholder="Search contacts by name, agency, or role..." />
                                  <CommandList>
                                     <CommandEmpty>No contact found.</CommandEmpty>
                                     <CommandGroup heading="Recent Contacts">
                                       {MOCK_CONTACTS.map((contact) => (
                                          <CommandItem 
                                            key={contact.id} 
                                            value={`${contact.name} ${contact.agency} ${contact.role}`} 
                                            onSelect={() => handleSelectContact(contact)}
                                            className="flex flex-col items-start gap-1 py-3"
                                          >
                                             <div className="flex items-center justify-between w-full">
                                               <span className="font-semibold text-sm">{contact.name}</span>
                                               <Badge variant="outline" className="text-xs">
                                                 {contact.role}
                                               </Badge>
                                             </div>
                                             <div className="text-xs text-[#605e5c]">{contact.title}</div>
                                             <div className="text-xs text-[#605e5c]">{contact.agency}</div>
                                          </CommandItem>
                                       ))}
                                     </CommandGroup>
                                  </CommandList>
                              </Command>
                          </PopoverContent>
                      </Popover>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleAddAgent} 
                        className="h-8 gap-1.5 text-xs bg-[#0078d4] hover:bg-[#106ebe]"
                        type="button"
                        aria-label="Add new contact"
                      >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          Add New
                      </Button>
                  </div>
               </div>

               {/* Contacts List */}
               <div className="space-y-3" role="list" aria-label="Law enforcement contacts">
                  {formData.agents.map((agent, index) => (
                      <Card 
                        key={agent.id} 
                        className={cn(
                          "border-2 transition-all shadow-sm",
                          agent.escalatedToLE 
                            ? "border-[#d13438] bg-[#fde7e9]" 
                            : "border-[#d1d1d1] bg-white hover:border-[#0078d4] hover:shadow-md"
                        )}
                        role="listitem"
                        aria-label={`Contact ${index + 1}: ${agent.name || 'Unnamed'}`}
                      >
                        <div className="p-4 space-y-4">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-sm",
                                agent.escalatedToLE ? "bg-[#d13438]" : "bg-[#0078d4]"
                              )}>
                                {agent.name ? agent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-5 h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h5 className="font-bold text-sm text-[#323130]">
                                    {agent.name || "Unnamed Contact"}
                                  </h5>
                                  {agent.source && (
                                    <Badge variant="outline" className="text-xs">
                                      {agent.source === "agency" ? "Database" : "Manual"}
                                    </Badge>
                                  )}
                                  {agent.escalatedToLE && (
                                    <Badge className="text-xs bg-[#d13438] hover:bg-[#a4262c] text-white font-semibold">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Blocked by Issuing/Enforcing Authority
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-[#605e5c]">
                                  {agent.title || "No title specified"}
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              type="button"
                              onClick={() => handleRemoveAgent(agent.id, agent.name)} 
                              className="h-7 w-7 text-[#605e5c] hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                              aria-label={`Remove contact ${agent.name || 'unnamed contact'}`}
                            >
                              <X className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </div>

                          {/* Contact Details Grid */}
                          <fieldset className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-[#faf9f8] rounded-lg border border-[#edebe9]">
                            <legend className="sr-only">Contact details for {agent.name || 'unnamed contact'}</legend>
                            
                            {/* Row 1: Name, Title, Role */}
                            {/* Name */}
                            <div className="space-y-1">
                              <Label htmlFor={`agent-name-${agent.id}`} className="text-xs font-bold text-[#323130]">
                                Full Name <span className="text-[#d13438]" aria-label="required">*</span>
                              </Label>
                              <Input 
                                id={`agent-name-${agent.id}`}
                                value={agent.name} 
                                onChange={(e) => handleAgentChange(agent.id, "name", e.target.value)}
                                className="h-8 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g., John Smith"
                                aria-required="true"
                              />
                            </div>

                            {/* Title */}
                            <div className="space-y-1">
                              <Label htmlFor={`agent-title-${agent.id}`} className="text-xs font-bold text-[#323130]">
                                Title / Rank
                              </Label>
                              <Input 
                                id={`agent-title-${agent.id}`}
                                value={agent.title} 
                                onChange={(e) => handleAgentChange(agent.id, "title", e.target.value)}
                                className="h-8 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g., Special Agent, Detective"
                              />
                            </div>

                            {/* Role */}
                            <div className="space-y-1">
                              <Label htmlFor={`agent-role-${agent.id}`} className="text-xs font-bold text-[#323130]">
                                Role <span className="text-[#d13438]" aria-label="required">*</span>
                              </Label>
                              <Select
                                value={agent.role}
                                onValueChange={(value) => handleAgentChange(agent.id, "role", value)}
                              >
                                <SelectTrigger id={`agent-role-${agent.id}`} className="h-8 text-sm" aria-required="true">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Submitter">Submitter</SelectItem>
                                  <SelectItem value="Affiant">Affiant</SelectItem>
                                  <SelectItem value="Case Officer">Case Officer</SelectItem>
                                  <SelectItem value="Recipient">Recipient</SelectItem>
                                  <SelectItem value="Attorney">Attorney</SelectItem>
                                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                                  <SelectItem value="Technical Contact">Technical Contact</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Row 2: Email, Phone, Languages */}
                            {/* Email */}
                            <div className="space-y-1">
                              <Label htmlFor={`agent-email-${agent.id}`} className="text-xs font-bold text-[#323130]">
                                Email Address <span className="text-[#d13438]" aria-label="required">*</span>
                              </Label>
                              <Input 
                                id={`agent-email-${agent.id}`}
                                value={agent.email} 
                                onChange={(e) => handleAgentChange(agent.id, "email", e.target.value)}
                                className="h-8 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g., agent@agency.gov"
                                type="email"
                                aria-required="true"
                              />
                            </div>

                            {/* Phone */}
                            <div className="space-y-1">
                              <Label htmlFor={`agent-phone-${agent.id}`} className="text-xs font-bold text-[#323130]">
                                Phone Number
                              </Label>
                              <Input 
                                id={`agent-phone-${agent.id}`}
                                type="tel"
                                value={agent.phone} 
                                onChange={(e) => handleAgentChange(agent.id, "phone", formatPhoneNumber(e.target.value))}
                                className="h-8 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="+1 (555) 000-0000"
                              />
                            </div>

                            {/* Languages */}
                            <div className="space-y-1">
                              <Label htmlFor={`agent-languages-${agent.id}`} className="text-xs font-bold text-[#323130]">
                                Languages
                              </Label>
                              <Input 
                                id={`agent-languages-${agent.id}`}
                                value={agent.languages || ""} 
                                onChange={(e) => handleAgentChange(agent.id, "languages", e.target.value)}
                                className="h-8 text-sm border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g., en - English, es - Spanish"
                                aria-describedby={`agent-languages-help-${agent.id}`}
                              />
                              <span id={`agent-languages-help-${agent.id}`} className="sr-only">
                                Enter languages spoken by contact using ISO 639-1 codes
                              </span>
                            </div>
                          </fieldset>

                          {/* Escalation Section */}
                          {agent.escalatedToLE && (
                            <div 
                              className="p-3 bg-[#fde7e9] border-l-4 border-[#d13438] rounded space-y-2"
                              role="region"
                              aria-label="Escalation information"
                            >
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-[#d13438]" aria-hidden="true" />
                                <span className="text-sm font-bold text-[#d13438]">
                                  Escalated to Law Enforcement
                                </span>
                                {agent.escalationDate && (
                                  <span className="text-xs text-[#605e5c] ml-auto">
                                    {new Date(agent.escalationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              {agent.escalationNotes && (
                                <div className="bg-white border border-[#d13438]/20 rounded p-2.5" role="note">
                                  <p className="text-xs text-[#605e5c] font-bold mb-1">Escalation Notes:</p>
                                  <p className="text-xs text-[#323130] whitespace-pre-wrap leading-relaxed">{agent.escalationNotes}</p>
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                aria-label={`Clear escalation for ${agent.name || 'contact'}`}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    agents: prev.agents.map((a) =>
                                      a.id === agent.id
                                        ? { ...a, escalatedToLE: false, escalationNotes: "", escalationDate: "" }
                                        : a
                                    )
                                  }));
                                  toast.success("LE escalation removed");
                                }}
                              >
                                <X className="w-3 h-3 mr-1" aria-hidden="true" />
                                Clear Escalation
                              </Button>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-3 border-t border-[#edebe9]">
                            <div className="flex items-center gap-2">
                              {!agent.escalatedToLE && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 gap-1.5 text-xs text-[#d13438] border-[#d13438] hover:bg-[#fde7e9] font-semibold"
                                      aria-label={`Escalate case to ${agent.name || 'law enforcement contact'}`}
                                    >
                                      <Send className="w-3 h-3" aria-hidden="true" />
                                      Escalate to LE
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-[#d13438]" aria-hidden="true" />
                                        Escalate Case to Law Enforcement Contact
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                          You are about to escalate this case to <strong>{agent.name || 'this contact'}</strong>. 
                                          This will mark the case as blocked pending LE response.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="space-y-2">
                                      <Label htmlFor={`escalation-notes-${agent.id}`} className="text-sm font-semibold text-[#323130]">
                                        Escalation Notes <span className="text-[#d13438]" aria-label="required">*</span>
                                      </Label>
                                      <Textarea
                                        id={`escalation-notes-${agent.id}`}
                                        placeholder="Document why this case is being escalated, what information is needed, and expected timeline..."
                                        className="min-h-[100px] text-sm"
                                        value={agent.escalationNotes || ""}
                                        aria-required="true"
                                        aria-describedby={`escalation-notes-help-${agent.id}`}
                                        onChange={(e) => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            agents: prev.agents.map((a) =>
                                              a.id === agent.id
                                                ? { ...a, escalationNotes: e.target.value }
                                                : a
                                            )
                                          }));
                                        }}
                                      />
                                      <p id={`escalation-notes-help-${agent.id}`} className="text-xs text-[#605e5c] flex items-start gap-1">
                                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                        These notes will be saved with the case record and visible to all team members.
                                      </p>
                                    </div>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-[#d13438] hover:bg-[#a4262c]"
                                        onClick={() => {
                                          if (!agent.escalationNotes || agent.escalationNotes.trim() === "") {
                                            toast.error("Escalation notes are required");
                                            return;
                                          }
                                          setFormData((prev) => ({
                                            ...prev,
                                            agents: prev.agents.map((a) =>
                                              a.id === agent.id
                                                ? { 
                                                    ...a, 
                                                    escalatedToLE: true,
                                                    escalationDate: new Date().toISOString()
                                                  }
                                                : a
                                            )
                                          }));
                                          toast.success("Case escalated to LE contact", {
                                            description: `${agent.name} will be notified`
                                          });
                                        }}
                                      >
                                        <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                                        Escalate to LE
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                            <div className="text-xs text-[#605e5c] font-medium">
                              {index + 1} of {formData.agents.length}
                            </div>
                          </div>
                        </div>
                      </Card>
                  ))}
                  {formData.agents.length === 0 && (
                      <div 
                        className="text-center py-12 border-2 border-dashed border-[#c8c6c4] rounded-lg bg-white"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="w-12 h-12 bg-[#f3f2f1] rounded-full flex items-center justify-center mx-auto mb-3">
                          <User className="w-6 h-6 text-[#a19f9d]" aria-hidden="true" />
                        </div>
                        <p className="text-sm text-[#323130] font-bold mb-1">No contacts added</p>
                        <p className="text-xs text-[#605e5c] mb-4">Add law enforcement contacts to proceed with this case</p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setContactSearchOpen(true)}
                            className="h-8 gap-1.5 text-xs"
                            aria-label="Search existing contacts"
                          >
                            <Search className="w-3.5 h-3.5" aria-hidden="true" />
                            Search Contacts
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={handleAddAgent}
                            className="h-8 gap-1.5 text-xs bg-[#0078d4] hover:bg-[#106ebe]"
                            aria-label="Add new contact"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            Add New Contact
                          </Button>
                        </div>
                      </div>
                  )}
               </div>

               {/* Summary Stats */}
               {formData.agents.length > 0 && (
                 <div 
                   className="flex items-center gap-4 text-xs pt-3 border-t border-[#edebe9] bg-white p-3 rounded-lg"
                   role="status"
                   aria-live="polite"
                 >
                   <div className="flex items-center gap-1.5 font-semibold text-[#323130]">
                     <User className="w-3.5 h-3.5 text-[#0078d4]" aria-hidden="true" />
                     <span>{formData.agents.length} {formData.agents.length === 1 ? 'contact' : 'contacts'}</span>
                   </div>
                   {formData.agents.some(a => a.escalatedToLE) && (
                     <>
                       <div className="h-4 w-px bg-[#e1dfdd]" aria-hidden="true"></div>
                       <div className="flex items-center gap-1.5 text-[#d13438] font-bold">
                         <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                         <span>
                           {formData.agents.filter(a => a.escalatedToLE).length} escalated
                         </span>
                       </div>
                     </>
                   )}
                 </div>
               )}
            </fieldset>
          </div>
        </CollapsibleSection>
      </PrimaryCard>

      {/* Authorization Details Section - Fluent Design */}
      <SecondaryCard>
        <CollapsibleSection
          sectionId="authorization-details"
          isOpen={sections.isOpen("authorization-details")}
          onToggle={() => sections.toggle("authorization-details")}
          header={
            <>
            <div className="w-10 h-10 bg-[#107c10] rounded flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[#323130] text-xl">Authorization Details</h2>
              <p className="text-sm text-[#605e5c] mt-0.5">Legal authorization period and approval status (read-only)</p>
            </div>
            </>
          }
          collapsedSummary={
            formData.authorizationStartDate && formData.authorizationEndDate ? (
              <Badge variant="outline" className="text-xs">
                {format(formData.authorizationStartDate, "MMM d")} - {format(formData.authorizationEndDate, "MMM d, yyyy")}
              </Badge>
            ) : null
          }
        >

          {/* Summary View - Always visible */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
          <div className="lg:col-span-2">
            <Label className="text-[#605e5c] text-xs">Authorization Desired Status</Label>
            <p className="text-[#323130] font-semibold">
              {formData.authorizationDesiredStatus || "Not set"}
            </p>
            <p className="text-[#605e5c] text-xs flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              Current approval status of the authorization
            </p>
          </div>
          <div>
            <Label className="text-[#605e5c] text-xs">Authorization Start Date</Label>
            <p className="text-[#323130] font-semibold">
              {formData.authorizationStartDate ? format(formData.authorizationStartDate, "MMM d, yyyy") : "Not set"}
            </p>
            <p className="text-[#605e5c] text-xs flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              When the authorization becomes effective
            </p>
          </div>
          <div>
            <Label className="text-[#605e5c] text-xs">Authorization Expiration Date</Label>
            <p className="text-[#323130] font-semibold">
              {formData.authorizationExpirationDate ? format(formData.authorizationExpirationDate, "MMM d, yyyy") : "Not set"}
            </p>
            <p className="text-[#605e5c] text-xs flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              When the authorization expires
            </p>
          </div>
          </div>

          {/* Approval Details Subsection — flattened per UX-Polish 1E.
              Previously gated behind a nested "Show more / Show less"
              toggle inside the already-collapsible Authorization
              Details section (double-disclosure). Now always rendered
              when the parent section is expanded. */}
          <div className="pt-4 border-t border-[#edebe9]">
          <div className="mb-6">
            <h3 className="text-[#323130] font-semibold text-lg">Approval Details</h3>
            <p className="text-sm text-[#605e5c] mt-1">Information about the authorization approval (from origin sender)</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            {/* Approval Type */}
            <div className="space-y-2">
              <Label htmlFor="approvalType" className="text-[#323130] font-semibold">
                Approval Type
              </Label>
              <div className="w-full h-10 px-3 py-2 border border-[#edebe9] bg-[#f3f2f1] rounded-md flex items-center text-[#323130]">
                {formData.approvalType || "Not set"}
              </div>
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Type of approval being requested or granted
              </p>
            </div>

            {/* Approval Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="approvalReferenceNumber" className="text-[#323130] font-semibold">
                Approval Reference #
              </Label>
              <div className="w-full h-10 px-3 py-2 border border-[#edebe9] bg-[#f3f2f1] rounded-md flex items-center text-[#323130] font-mono">
                {formData.approvalReferenceNumber || "Not set"}
              </div>
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Unique reference number for this approval
              </p>
            </div>

            {/* Approver Name */}
            <div className="space-y-2">
              <Label htmlFor="approverName" className="text-[#323130] font-semibold">
                Approver Name
              </Label>
              <div className="w-full h-10 px-3 py-2 border border-[#edebe9] bg-[#f3f2f1] rounded-md flex items-center text-[#323130]">
                {formData.approverName || "Not set"}
              </div>
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Name of the person who approved this authorization
              </p>
            </div>

            {/* Approver Role */}
            <div className="space-y-2">
              <Label htmlFor="approverRole" className="text-[#323130] font-semibold">
                Approver Role
              </Label>
              <div className="w-full h-10 px-3 py-2 border border-[#edebe9] bg-[#f3f2f1] rounded-md flex items-center text-[#323130]">
                {formData.approverRole || "Not set"}
              </div>
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Organizational role of the approver
              </p>
            </div>

            {/* Approval Timestamp */}
            <div className="space-y-2">
              <Label htmlFor="approvalTimestamp" className="text-[#323130] font-semibold">
                Approval Timestamp
              </Label>
              <div className="w-full h-10 px-3 py-2 border border-[#edebe9] bg-[#f3f2f1] rounded-md flex items-center text-[#323130]">
                <CalendarIcon className="mr-2 h-4 w-4 text-[#605e5c]" />
                {formData.approvalTimestamp ? format(formData.approvalTimestamp, "MMM d, yyyy h:mm a") : "Not set"}
              </div>
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Date and time when approval was granted
              </p>
            </div>

            {/* Approval Is Emergency Flag */}
            <div className="space-y-2">
              <Label htmlFor="approvalIsEmergency" className="text-[#323130] font-semibold">
                Emergency Approval
              </Label>
              <div className="flex items-center gap-3 h-10">
                <Badge 
                  variant="outline" 
                  className={formData.approvalIsEmergency 
                    ? "bg-red-50 text-red-700 border-red-300" 
                    : "bg-gray-50 text-gray-700 border-gray-300"
                  }
                >
                  {formData.approvalIsEmergency ? "Emergency Approval" : "Standard Approval"}
                </Badge>
              </div>
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Indicates if this was an emergency approval
              </p>
            </div>

            {/* Approver Alternate Name */}
            <div className="space-y-2">
              <Label htmlFor="approverAlternateName" className="text-[#323130] font-semibold">
                Approver Alternate Name
              </Label>
              <Input
                id="approverAlternateName"
                value={formData.approverAlternateName || ""}
                readOnly
                className="h-10 border-[#c8c6c4] bg-[#f3f2f1] text-[#605e5c] cursor-not-allowed"
                aria-label="Approver alternate name"
              />
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Alternative name or signature for the approver
              </p>
            </div>

            {/* Approver Email Address */}
            <div className="space-y-2">
              <Label htmlFor="approverEmail" className="text-[#323130] font-semibold">
                Approver Email Address
              </Label>
              <Input
                id="approverEmail"
                value={formData.approverEmail || ""}
                readOnly
                className="h-10 border-[#c8c6c4] bg-[#f3f2f1] text-[#605e5c] cursor-not-allowed"
                aria-label="Approver email address"
              />
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Contact email for the approver
              </p>
            </div>

            {/* Approver Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="approverPhoneNumber" className="text-[#323130] font-semibold">
                Approver Phone Number
              </Label>
              <Input
                id="approverPhoneNumber"
                value={formData.approverPhoneNumber || ""}
                readOnly
                className="h-10 border-[#c8c6c4] bg-[#f3f2f1] text-[#605e5c] cursor-not-allowed"
                aria-label="Approver phone number"
              />
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Contact phone number for the approver
              </p>
            </div>

            {/* Approval Description - Full Width */}
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="approvalDescription" className="text-[#323130] font-semibold">
                Approval Description
              </Label>
              <div className="w-full min-h-[100px] p-3 border border-[#edebe9] bg-[#f3f2f1] rounded-md text-[#323130] whitespace-pre-wrap">
                {formData.approvalDescription || "No description provided"}
              </div>
              <p className="text-[#605e5c] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Additional details about the approval decision
              </p>
            </div>
          </div>
          </div>

          {/* eEvidence — Issuing / Validating / Competent / Enforcing
              Authority blocks. Each gates on its own presence in formData;
              the whole bundle is hidden when requestType is not "eEvidence".
              The EA always renders for eEvidence cases (falls back to the
              Microsoft-side default when no per-case override is present). */}
          {formData.requestType === "eEvidence" && (
            <>
              <IssuingAuthorityDetails ia={formData.eevidenceIssuingAuthority} />
              {formData.eevidenceValidatingAuthority && (
                <ValidatingAuthorityDetails va={formData.eevidenceValidatingAuthority} />
              )}
              {formData.eevidenceCompetentAuthority && (
                <CompetentAuthorityDetails ca={formData.eevidenceCompetentAuthority} />
              )}
              <EnforcingAuthorityDetails
                ea={resolveEEvidenceEnforcingAuthority(
                  formData.eevidenceEnforcingAuthority,
                )}
              />
            </>
          )}
          </CollapsibleSection>
      </SecondaryCard>
    </>
  );
}

// ── eEvidence Issuing / Enforcing Authority cards ───────────────────────
// Two read-only cards rendered above the standard single-agency block
// for eEvidence cases. The IA + EA blobs arrive via the Form 1
// programmatic API submission and live on
// `formData.eevidenceIssuingAuthority` / `formData.eevidenceEnforcingAuthority`.
// We surface them with prominent role badges ("IA" / "EA") so the RS
// can tell at a glance which authority is which.

interface EEvidenceAuthorityCardsProps {
  formData: any;
}

function EEvidenceAuthorityCards({ formData }: EEvidenceAuthorityCardsProps) {
  const ia = formData.eevidenceIssuingAuthority;
  const va = formData.eevidenceValidatingAuthority;
  const ca = formData.eevidenceCompetentAuthority;
  // EA always present for eEvidence cases — falls back to the
  // Microsoft-side default when no per-case override is on the envelope.
  const ea = resolveEEvidenceEnforcingAuthority(formData.eevidenceEnforcingAuthority);

  // `CaseCountry` is an object ({ countryCode, countryName, region }),
  // not a string. The IA / VA / CA blocks may carry either an object
  // (current seed shape) or a plain string (some older mocks). Normalize
  // so the child component always gets a renderable label or undefined.
  const formatCountry = (c: unknown): string | undefined => {
    if (!c) return undefined;
    if (typeof c === "string") return c;
    if (typeof c === "object" && c !== null) {
      const obj = c as { countryName?: string; countryCode?: string };
      return obj.countryName ?? obj.countryCode ?? undefined;
    }
    return undefined;
  };

  // Common row builder for IA / VA / CA — they share the same field
  // shape. Filters nulls so the resulting card only shows populated rows.
  const approverRows = (
    block:
      | NonNullable<typeof ia>
      | NonNullable<typeof va>
      | NonNullable<typeof ca>,
  ) => [
    (block as any).idNumber
      ? { label: "ID number", value: (block as any).idNumber as string }
      : null,
    (block as any).issuingAuthorityRole
      ? {
          label: "Type",
          value: (block as any).issuingAuthorityRole as string,
        }
      : (block as any).authorityRole
        ? {
            label: "Type",
            value: (block as any).authorityRole as string,
          }
        : null,
    block.approvalRole
      ? { label: "Approver Role", value: String(block.approvalRole) }
      : null,
    block.approvalReferenceNumbers && block.approvalReferenceNumbers.length > 0
      ? {
          label: "Reference number(s)",
          value: block.approvalReferenceNumbers.join(", "),
        }
      : null,
    block.approver?.name
      ? { label: "Approver", value: block.approver.name }
      : null,
    block.approver?.email
      ? { label: "Approver email", value: block.approver.email }
      : null,
    (block as any).centralAuthorityContact?.name
      ? {
          label: "Central Authority",
          value: (block as any).centralAuthorityContact.name as string,
        }
      : null,
  ];

  return (
    <PrimaryCard accent="blue">
      <div className="p-4 bg-gradient-to-r from-[#eff6fc] to-white border-b-2 border-[#0078d4]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
            <Building className="w-5 h-5 text-[#0078d4]" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-[#323130] font-bold text-base">
              Authorities
            </h3>
            <p className="text-xs text-[#605e5c] mt-0.5">
              eEvidence orders can carry up to four read-only Approver
              blocks — the Issuing Authority (IA) that created the order,
              an optional Validating Authority (VA), an optional Competent
              Authority (CA), and the Enforcing Authority (EA) on
              Microsoft's side. Hover the info icon on each card to see
              what role each one plays.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-white">
        {/* Issuing Authority card */}
        {ia ? (
          <AuthorityCard
            roleBadge="IA"
            roleBadgeColor="bg-[#0078d4] text-white"
            roleLabel="Issuing Authority"
            approverType="IssuingAuthority"
            name={ia.name}
            country={formatCountry(ia.country)}
            rows={approverRows(ia)}
          />
        ) : (
          <AuthorityCardPlaceholder
            roleBadge="IA"
            roleLabel="Issuing Authority"
            message="No Issuing Authority block on this case."
          />
        )}

        {/* Validating Authority card — gated on presence of the block. */}
        {va && (
          <AuthorityCard
            roleBadge="VA"
            roleBadgeColor="bg-[#107c10] text-white"
            roleLabel="Validating Authority"
            approverType="ValidatingAuthority"
            name={va.name ?? "—"}
            country={formatCountry(va.country)}
            rows={approverRows(va)}
          />
        )}

        {/* Competent Authority card — gated on presence of the block. */}
        {ca && (
          <AuthorityCard
            roleBadge="CA"
            roleBadgeColor="bg-[#ca5010] text-white"
            roleLabel="Competent Authority"
            approverType="CompetentAuthority"
            name={ca.name}
            country={formatCountry(ca.country)}
            rows={approverRows(ca)}
          />
        )}

        {/* Enforcing Authority card — always renders for eEvidence cases.
            Has its own shape (no approver / approval-role enum) and is
            the Microsoft-side receiving authority, so no approverType
            tooltip — it's not one of the three per-case approver kinds. */}
        <AuthorityCard
          roleBadge="EA"
          roleBadgeColor="bg-[#5c2d91] text-white"
          roleLabel="Enforcing Authority"
          roleDescription="Microsoft-side receiving authority (same default across every eEvidence case)."
          name={ea.name}
          country={undefined}
          rows={[
            ea.contactName ? { label: "Contact", value: ea.contactName } : null,
            ea.address ? { label: "Address", value: ea.address } : null,
            ea.tel ? { label: "Phone", value: ea.tel } : null,
            ea.email ? { label: "Email", value: ea.email } : null,
            ea.fax ? { label: "Fax", value: ea.fax } : null,
          ]}
        />
      </div>
    </PrimaryCard>
  );
}

interface AuthorityCardProps {
  roleBadge: string;
  roleBadgeColor: string;
  roleLabel: string;
  /** When set, the card surfaces a hoverable Info icon next to the role
   *  label whose tooltip text comes from
   *  `EEVIDENCE_APPROVER_TYPE_DESCRIPTIONS`. Used for IA / VA / CA. */
  approverType?: EEvidenceApproverType;
  /** Fallback inline description for cards that don't have an
   *  approverType (e.g. the EA card). Rendered as small caption text. */
  roleDescription?: string;
  name: string;
  country?: string;
  rows: Array<{ label: string; value: string } | null>;
}

function AuthorityCard({
  roleBadge,
  roleBadgeColor,
  roleLabel,
  approverType,
  roleDescription,
  name,
  country,
  rows,
}: AuthorityCardProps) {
  return (
    <div className="border border-[#e1dfdd] rounded-md bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Badge
            className={`text-xs font-bold ${roleBadgeColor} border-0`}
            aria-label={`Role: ${roleLabel}`}
          >
            {roleBadge}
          </Badge>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="text-sm font-bold text-[#323130] truncate">{roleLabel}</h4>
              {approverType && (
                <ShadcnTooltipProvider delayDuration={150}>
                  <ShadcnTooltip>
                    <ShadcnTooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`What does the ${roleLabel} do?`}
                        className="inline-flex items-center justify-center text-[#605e5c] hover:text-[#0078d4] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0078d4] rounded"
                      >
                        <Info className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </ShadcnTooltipTrigger>
                    <ShadcnTooltipContent className="max-w-xs">
                      {EEVIDENCE_APPROVER_TYPE_DESCRIPTIONS[approverType]}
                    </ShadcnTooltipContent>
                  </ShadcnTooltip>
                </ShadcnTooltipProvider>
              )}
            </div>
            {roleDescription && (
              <p className="text-[11px] text-[#605e5c] leading-tight">
                {roleDescription}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[#edebe9] space-y-2">
        <div>
          <Label className="text-[11px] uppercase tracking-wide text-[#605e5c]">
            Name
          </Label>
          <p className="text-sm font-semibold text-[#323130]">{name}</p>
        </div>
        {country && (
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-[#605e5c]">
              Country
            </Label>
            <p className="text-sm text-[#323130]">{country}</p>
          </div>
        )}
        {rows
          .filter((row): row is { label: string; value: string } => !!row)
          .map((row) => (
            <div key={row.label}>
              <Label className="text-[11px] uppercase tracking-wide text-[#605e5c]">
                {row.label}
              </Label>
              <p className="text-sm text-[#323130] break-words">{row.value}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

interface AuthorityCardPlaceholderProps {
  roleBadge: string;
  roleLabel: string;
  message: string;
}

function AuthorityCardPlaceholder({
  roleBadge,
  roleLabel,
  message,
}: AuthorityCardPlaceholderProps) {
  return (
    <div className="border border-dashed border-[#c8c6c4] rounded-md bg-[#faf9f8] p-4">
      <div className="flex items-start gap-2">
        <Badge
          variant="outline"
          className="text-xs font-bold text-[#605e5c] border-[#c8c6c4]"
        >
          {roleBadge}
        </Badge>
        <div>
          <h4 className="text-sm font-semibold text-[#605e5c]">{roleLabel}</h4>
          <p className="text-xs text-[#a19f9d] mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}
