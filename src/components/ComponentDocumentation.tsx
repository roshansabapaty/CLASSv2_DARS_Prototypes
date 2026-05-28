import React, { useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { formatDateToMMM } from "../utils/fulfillmentWizardHelpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { 
  ChevronDown, 
  Check, 
  FileText, 
  User, 
  Building, 
  Globe,
  Calendar,
  AlertCircle,
  Info,
  Copy,
  Download,
  Printer,
  ArrowLeft,
  X,
  Search,
  ChevronsUpDown
} from "lucide-react";
import { cn } from "./ui/utils";
import { toast } from "sonner@2.0.3";

// Sample data for documentation
const PRIORITY_OPTIONS = [
  { value: "Critical", label: "Critical", color: "bg-red-600" },
  { value: "High", label: "High", color: "bg-orange-500" },
  { value: "Medium", label: "Medium", color: "bg-blue-500" },
  { value: "Low", label: "Low", color: "bg-gray-400" },
];

const CASE_TYPE_OPTIONS = [
  "Law Enforcement - Criminal Investigation",
  "Law Enforcement - Civil Investigation",
  "Civil Litigation - Discovery",
  "Regulatory Compliance",
  "Internal Investigation",
  "Emergency Disclosure",
];

const IDENTIFIER_TYPES = [
  { value: "email", label: "Email Address", format: "user@domain.com" },
  { value: "phone", label: "Phone Number", format: "+1 (555) 123-4567" },
  { value: "gamertag", label: "Xbox Gamertag", format: "PlayerName" },
  { value: "ip", label: "IP Address", format: "192.168.1.1" },
  { value: "mac", label: "MAC Address", format: "00:1B:44:11:3A:B7" },
  { value: "userid", label: "User ID", format: "ABC123" },
];

const DOCUMENT_OPTIONS = [
  { id: "warrant-1", name: "Search Warrant", type: "Warrant", pages: 3 },
  { id: "subpoena-1", name: "Grand Jury Subpoena", type: "Subpoena", pages: 2 },
  { id: "ndo-1", name: "Non-Disclosure Order", type: "NDO", pages: 1 },
  { id: "affidavit-1", name: "Supporting Affidavit", type: "Affidavit", pages: 5 },
];

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Australia",
  "Japan",
  "India",
];

const RESPONSE_SPECIALISTS = [
  "Amanda Williams",
  "Brian Chen",
  "Carlos Rodriguez",
  "Diana Martinez",
  "Emily Johnson",
];

const REQUEST_TYPES = [
  "Civil Demand",
  "Consent Release",
  "Duplicate",
  "Emergency Letter",
  "Court Order",
  "IREQ",
  "International Order",
  "Lawful Intercept",
  "PRTT",
  "NSL",
  "Not Valid",
  "Other",
  "Preservation",
];

const REQUEST_SUB_TYPES = [
  "Cease",
  "Civil",
  "Content",
  "Defense Counsel",
  "Disclosure",
  "Enterprise",
  "Evidence Hold",
  "FACTA",
  "Intercept",
  "Internal",
];

const NATURE_OF_CRIMES = [
  "Terrorism",
  "Child Exploitation",
  "Child Sexual Abuse Material (CSAM)",
  "Human Trafficking",
  "Fraud",
  "Identity Theft",
  "Cybercrime",
  "Drug Trafficking",
  "Money Laundering",
  "Homicide",
  "Kidnapping",
  "Extortion",
  "Theft",
  "Sexual Assault",
  "Stalking/Harassment",
];

const EU27_DSA_HARMS = [
  "Illegal Content",
  "Child Sexual Abuse Material",
  "Illegal Hate Speech",
  "Illegal Incitement to Violence and Terrorism",
  "Non-Consensual Sharing of Intimate Images",
  "Unlawful Discriminatory Content",
  "Protection of Minors",
  "Protection of Privacy and Personal Data",
  "Intellectual Property Infringements",
  "Platform Integrity and Authenticity",
];

const MOCK_AGENCIES = [
  {
    id: "agency-001",
    name: "FBI - Federal Bureau of Investigation",
    phone: "+1 (202) 324-3000",
    city: "Washington, DC",
    lastUsed: "2026-01-10",
  },
  {
    id: "agency-002",
    name: "DEA - Drug Enforcement Administration",
    phone: "+1 (202) 307-1000",
    city: "Arlington, VA",
    lastUsed: "2026-01-05",
  },
  {
    id: "agency-003",
    name: "USSS - United States Secret Service",
    phone: "+1 (202) 406-5708",
    city: "Washington, DC",
    lastUsed: "2025-12-28",
  },
];

const MOCK_CONTACTS = [
  {
    id: "contact-001",
    name: "Sarah Mitchell",
    title: "Supervisory Special Agent",
    email: "sarah.mitchell@fbi.gov",
    phone: "+1 (202) 324-5500",
    agency: "FBI - Federal Bureau of Investigation",
    lastUsed: "2026-01-10",
  },
  {
    id: "contact-002",
    name: "James Rodriguez",
    title: "Special Agent",
    email: "james.rodriguez@dea.gov",
    phone: "+1 (202) 307-4567",
    agency: "DEA - Drug Enforcement Administration",
    lastUsed: "2026-01-05",
  },
  {
    id: "contact-003",
    name: "Emily Chen",
    title: "Detective",
    email: "emily.chen@pd.chicago.gov",
    phone: "+1 (312) 746-6000",
    agency: "Chicago Police Department",
    lastUsed: "2025-12-28",
  },
];

interface ComponentExampleProps {
  title: string;
  description: string;
  children: React.ReactNode;
  code?: string;
  specs?: {
    colors?: string[];
    spacing?: string[];
    typography?: string[];
    interactions?: string[];
  };
}

function ComponentExample({ title, description, children, code, specs }: ComponentExampleProps) {
  const [showCode, setShowCode] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard");
    }
  };

  return (
    <div className="mb-12">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <Card className="p-6 bg-white border-2 border-gray-200">
        {/* Live Example */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Live Example
            </Badge>
          </div>
          <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            {children}
          </div>
        </div>

        {/* Tabs for Code and Specifications */}
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code" disabled={!code}>Code</TabsTrigger>
            <TabsTrigger value="specs" disabled={!specs}>Specifications</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <p className="text-sm text-gray-600">
              Interact with the component above to see different states and behaviors.
            </p>
          </TabsContent>

          {code && (
            <TabsContent value="code" className="mt-4">
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 z-10"
                  onClick={copyCode}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
                  <code>{code}</code>
                </pre>
              </div>
            </TabsContent>
          )}

          {specs && (
            <TabsContent value="specs" className="mt-4 space-y-4">
              {specs.colors && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Colors</h4>
                  <div className="space-y-1">
                    {specs.colors.map((color, idx) => (
                      <div key={idx} className="text-xs text-gray-600 font-mono">
                        {color}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {specs.spacing && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Spacing</h4>
                  <div className="space-y-1">
                    {specs.spacing.map((spacing, idx) => (
                      <div key={idx} className="text-xs text-gray-600 font-mono">
                        {spacing}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {specs.typography && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Typography</h4>
                  <div className="space-y-1">
                    {specs.typography.map((typo, idx) => (
                      <div key={idx} className="text-xs text-gray-600 font-mono">
                        {typo}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {specs.interactions && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Interactions</h4>
                  <div className="space-y-1">
                    {specs.interactions.map((interaction, idx) => (
                      <div key={idx} className="text-xs text-gray-600">
                        • {interaction}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </Card>
    </div>
  );
}

interface ComponentDocumentationProps {
  onClose?: () => void;
}

export function ComponentDocumentation({ onClose }: ComponentDocumentationProps) {
  // State for interactive examples
  const [priorityValue, setPriorityValue] = useState("");
  const [caseTypeValue, setCaseTypeValue] = useState("");
  const [identifierTypeOpen, setIdentifierTypeOpen] = useState(false);
  const [identifierTypeValue, setIdentifierTypeValue] = useState("");
  const [documentValue, setDocumentValue] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryValue, setCountryValue] = useState("");
  const [specialistValue, setSpecialistValue] = useState("");
  const [showOpenDocuments, setShowOpenDocuments] = useState(true);
  const [relatedCasesValue, setRelatedCasesValue] = useState("");
  const [requestTypeOpen, setRequestTypeOpen] = useState(false);
  const [requestTypeValue, setRequestTypeValue] = useState("");
  const [requestSubTypeOpen, setRequestSubTypeOpen] = useState(false);
  const [requestSubTypeValue, setRequestSubTypeValue] = useState("");
  const [natureOfCrimesOpen, setNatureOfCrimesOpen] = useState(false);
  const [natureOfCrimesValue, setNatureOfCrimesValue] = useState<string[]>([]);
  const [eu27DsaHarmsOpen, setEu27DsaHarmsOpen] = useState(false);
  const [eu27DsaHarmsValue, setEu27DsaHarmsValue] = useState<string[]>([]);
  const [agencySearchOpen, setAgencySearchOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [contactSearchOpen, setContactSearchOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string>("");

  const exportToPDF = () => {
    toast.info("PDF export functionality would be implemented here");
  };

  const printDocs = () => {
    window.print();
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0078d4] to-[#106ebe] text-white py-8 px-6 shadow-lg print:hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/10 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <div>
                <h1 className="text-3xl font-bold mb-2">Component Documentation</h1>
                <p className="text-blue-100">
                  Data Access Request Suite - Design System Reference
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={printDocs}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Overview Section */}
        <div className="mb-12 print:mb-6">
          <Card className="p-6 bg-white border-l-4 border-l-blue-500">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold mb-2">About This Documentation</h2>
                <p className="text-sm text-gray-600 mb-3">
                  This page provides comprehensive documentation for all dropdown and selection
                  components used throughout the Data Access Request Suite. Each component includes
                  live interactive examples, code snippets, and design specifications.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">7</div>
                    <div className="text-xs text-gray-600">Component Types</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">100%</div>
                    <div className="text-xs text-gray-600">WCAG 2.1 AA Compliant</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-1">Fluent</div>
                    <div className="text-xs text-gray-600">Design System</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 print:break-after-page">
          <h2 className="text-2xl font-bold mb-4">Table of Contents</h2>
          <Card className="p-6 bg-white">
            <ol className="space-y-2 text-sm">
              <li><a href="#priority-select" className="text-blue-600 hover:underline">1. Priority Selection Dropdown</a></li>
              <li><a href="#related-cases-input" className="text-blue-600 hover:underline">2. Related DARS Cases Input Field</a></li>
              <li><a href="#request-type-combobox" className="text-blue-600 hover:underline">3. Request Type Searchable Combobox</a></li>
              <li><a href="#request-subtype-combobox" className="text-blue-600 hover:underline">4. Request Sub-Type Searchable Combobox</a></li>
              <li><a href="#nature-of-crimes" className="text-blue-600 hover:underline">5. Nature of Crimes Multi-Select</a></li>
              <li><a href="#eu27-dsa-harms" className="text-blue-600 hover:underline">6. EU27 DSA Harms Multi-Select</a></li>
              <li><a href="#agency-search" className="text-blue-600 hover:underline">7. Select from Existing Agency</a></li>
              <li><a href="#contact-search" className="text-blue-600 hover:underline">8. Select from Existing Contacts</a></li>
              <li><a href="#design-tokens" className="text-blue-600 hover:underline">9. Design Tokens & Color System</a></li>
            </ol>
          </Card>
        </div>

        {/* Component Examples */}
        
        {/* 1. Priority Selection */}
        <div id="priority-select">
          <ComponentExample
            title="1. Priority Selection Dropdown"
            description="A color-coded priority selector with visual indicators for case urgency levels. Used in the Case Details section of the Triage stage."
            code={`<Select value={priorityValue} onValueChange={setPriorityValue}>
  <SelectTrigger className="w-full h-9">
    <SelectValue placeholder="Select priority level" />
  </SelectTrigger>
  <SelectContent>
    {PRIORITY_OPTIONS.map((option) => (
      <SelectItem key={option.value} value={option.value}>
        <div className="flex items-center gap-2">
          <div className={\`w-3 h-3 rounded-full \${option.color}\`} />
          <span>{option.label}</span>
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>`}
            specs={{
              colors: [
                "Critical: bg-red-600 (#DC2626)",
                "High: bg-orange-500 (#F97316)",
                "Medium: bg-blue-500 (#3B82F6)",
                "Low: bg-gray-400 (#9CA3AF)",
                "Border: border-gray-300 (#D1D5DB)",
              ],
              spacing: [
                "Height: h-9 (36px)",
                "Gap between indicator and text: gap-2 (8px)",
                "Indicator size: w-3 h-3 (12px)",
              ],
              typography: [
                "Font size: text-sm (14px)",
                "Font weight: font-normal (400)",
              ],
              interactions: [
                "Click to open dropdown menu",
                "Keyboard navigation: Arrow keys to navigate, Enter to select",
                "Color indicator updates on selection",
                "Auto-closes after selection",
              ],
            }}
          >
            <div className="max-w-md">
              <Label htmlFor="priority-demo" className="mb-2 block text-sm font-medium">
                Case Priority
              </Label>
              <Select value={priorityValue} onValueChange={setPriorityValue}>
                <SelectTrigger id="priority-demo" className="w-full h-9">
                  <SelectValue placeholder="Select priority level" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${option.color}`} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {priorityValue && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: <span className="font-semibold">{priorityValue}</span>
                </div>
              )}
            </div>
          </ComponentExample>
        </div>

        <Separator className="my-12" />

        {/* 2. Related DARS Cases Input Field */}
        <div id="related-cases-input">
          <ComponentExample
            title="2. Related DARS Cases Input Field"
            description="Input field for entering related Data Access Request Suite (DARS) case numbers. Allows multiple entries separated by commas."
            code={`<Input
  id="related-cases-demo"
  placeholder="Enter related DARS case numbers (comma-separated)"
  value={relatedCasesValue}
  onChange={(e) => setRelatedCasesValue(e.target.value)}
/>`}
            specs={{
              colors: [
                "Border: border-gray-300 (#D1D5DB)",
                "Focus: focus:border-blue-500",
                "Placeholder: text-gray-500",
              ],
              spacing: [
                "Height: h-9 (36px)",
                "Padding: px-3 py-2",
              ],
              typography: [
                "Font size: text-sm (14px)",
                "Line height: leading-normal",
              ],
              interactions: [
                "Type to enter case numbers",
                "Comma-separated values for multiple cases",
                "Focus state changes border color",
                "Clears on blur if empty",
              ],
            }}
          >
            <div className="max-w-md">
              <Label htmlFor="related-cases-demo" className="mb-2 block text-sm font-medium">
                Related DARS Cases
              </Label>
              <Input
                id="related-cases-demo"
                placeholder="Enter related DARS case numbers (comma-separated)"
                value={relatedCasesValue}
                onChange={(e) => setRelatedCasesValue(e.target.value)}
              />
              {relatedCasesValue && (
                <div className="mt-2 text-xs text-gray-600">
                  Entered: <span className="font-semibold">{relatedCasesValue}</span>
                </div>
              )}
            </div>
          </ComponentExample>
        </div>

        <Separator className="my-12" />

        {/* 3. Request Type Searchable Combobox */}
        <div id="request-type-combobox">
          <ComponentExample
            title="3. Request Type Searchable Combobox"
            description="Searchable dropdown using Command + Popover pattern. Includes format hints for each identifier type. Used when adding new identifiers to a case."
            code={`<Popover open={requestTypeOpen} onOpenChange={setRequestTypeOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {requestTypeValue
        ? REQUEST_TYPES.find((t) => t === requestTypeValue)?.label
        : "Select request type"}
      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] p-0">
    <Command>
      <CommandInput placeholder="Search request types..." />
      <CommandList>
        <CommandEmpty>No request type found.</CommandEmpty>
        <CommandGroup>
          {REQUEST_TYPES.map((type) => (
            <CommandItem
              key={type}
              value={type}
              onSelect={(currentValue) => {
                setRequestTypeValue(currentValue);
                setRequestTypeOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", requestTypeValue === type ? "opacity-100" : "opacity-0")} />
              <div className="flex-1">
                <div className="font-medium">{type}</div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>`}
            specs={{
              colors: [
                "Border: border-gray-200",
                "Hover: hover:bg-gray-100",
                "Selected check: text-blue-600",
                "Format hint: text-gray-500",
              ],
              spacing: [
                "Popover width: w-[400px]",
                "Item padding: px-2 py-1.5",
                "Gap between check and text: gap-2",
              ],
              typography: [
                "Label: font-medium text-sm",
                "Format hint: text-xs",
              ],
              interactions: [
                "Type to filter options in real-time",
                "Arrow keys to navigate filtered results",
                "Enter to select highlighted option",
                "Format hint appears for each type",
                "Auto-closes on selection",
              ],
            }}
          >
            <div className="max-w-md">
              <Label htmlFor="request-type-demo" className="mb-2 block text-sm font-medium">
                Request Type
              </Label>
              <Popover open={requestTypeOpen} onOpenChange={setRequestTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="request-type-demo"
                    variant="outline"
                    role="combobox"
                    aria-expanded={requestTypeOpen}
                    className="w-full justify-between h-9"
                  >
                    {requestTypeValue
                      ? REQUEST_TYPES.find((t) => t === requestTypeValue)?.label
                      : "Select request type"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search request types..." />
                    <CommandList>
                      <CommandEmpty>No request type found.</CommandEmpty>
                      <CommandGroup>
                        {REQUEST_TYPES.map((type) => (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={(currentValue) => {
                              setRequestTypeValue(currentValue === requestTypeValue ? "" : currentValue);
                              setRequestTypeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                requestTypeValue === type ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{type}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {requestTypeValue && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: <span className="font-semibold">
                    {REQUEST_TYPES.find(t => t === requestTypeValue)?.label}
                  </span>
                </div>
              )}
            </div>
          </ComponentExample>
        </div>

        <Separator className="my-12" />

        {/* 4. Request Sub-Type Searchable Combobox */}
        <div id="request-subtype-combobox">
          <ComponentExample
            title="4. Request Sub-Type Searchable Combobox"
            description="Searchable dropdown using Command + Popover pattern. Includes format hints for each identifier type. Used when adding new identifiers to a case."
            code={`<Popover open={requestSubTypeOpen} onOpenChange={setRequestSubTypeOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {requestSubTypeValue
        ? REQUEST_SUB_TYPES.find((t) => t === requestSubTypeValue)?.label
        : "Select request sub-type"}
      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] p-0">
    <Command>
      <CommandInput placeholder="Search request sub-types..." />
      <CommandList>
        <CommandEmpty>No request sub-type found.</CommandEmpty>
        <CommandGroup>
          {REQUEST_SUB_TYPES.map((type) => (
            <CommandItem
              key={type}
              value={type}
              onSelect={(currentValue) => {
                setRequestSubTypeValue(currentValue);
                setRequestSubTypeOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", requestSubTypeValue === type ? "opacity-100" : "opacity-0")} />
              <div className="flex-1">
                <div className="font-medium">{type}</div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>`}
            specs={{
              colors: [
                "Border: border-gray-200",
                "Hover: hover:bg-gray-100",
                "Selected check: text-blue-600",
                "Format hint: text-gray-500",
              ],
              spacing: [
                "Popover width: w-[400px]",
                "Item padding: px-2 py-1.5",
                "Gap between check and text: gap-2",
              ],
              typography: [
                "Label: font-medium text-sm",
                "Format hint: text-xs",
              ],
              interactions: [
                "Type to filter options in real-time",
                "Arrow keys to navigate filtered results",
                "Enter to select highlighted option",
                "Format hint appears for each type",
                "Auto-closes on selection",
              ],
            }}
          >
            <div className="max-w-md">
              <Label htmlFor="request-subtype-demo" className="mb-2 block text-sm font-medium">
                Request Sub-Type
              </Label>
              <Popover open={requestSubTypeOpen} onOpenChange={setRequestSubTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="request-subtype-demo"
                    variant="outline"
                    role="combobox"
                    aria-expanded={requestSubTypeOpen}
                    className="w-full justify-between h-9"
                  >
                    {requestSubTypeValue
                      ? REQUEST_SUB_TYPES.find((t) => t === requestSubTypeValue)?.label
                      : "Select request sub-type"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search request sub-types..." />
                    <CommandList>
                      <CommandEmpty>No request sub-type found.</CommandEmpty>
                      <CommandGroup>
                        {REQUEST_SUB_TYPES.map((type) => (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={(currentValue) => {
                              setRequestSubTypeValue(currentValue === requestSubTypeValue ? "" : currentValue);
                              setRequestSubTypeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                requestSubTypeValue === type ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{type}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {requestSubTypeValue && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: <span className="font-semibold">
                    {REQUEST_SUB_TYPES.find(t => t === requestSubTypeValue)?.label}
                  </span>
                </div>
              )}
            </div>
          </ComponentExample>
        </div>

        <Separator className="my-12" />

        {/* 5. Nature of Crimes Multi-Select */}
        <div id="nature-of-crimes">
          <ComponentExample
            title="5. Nature of Crimes Multi-Select"
            description="Multi-select dropdown for choosing the nature of crimes involved in the case. Allows multiple selections."
            code={`<Popover open={natureOfCrimesOpen} onOpenChange={setNatureOfCrimesOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {natureOfCrimesValue.length > 0
        ? natureOfCrimesValue.map((crime) => NATURE_OF_CRIMES.find((c) => c === crime)?.label).join(", ")
        : "Select nature of crimes"}
      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] p-0">
    <Command>
      <CommandInput placeholder="Search nature of crimes..." />
      <CommandList>
        <CommandEmpty>No nature of crime found.</CommandEmpty>
        <CommandGroup>
          {NATURE_OF_CRIMES.map((crime) => (
            <CommandItem
              key={crime}
              value={crime}
              onSelect={(currentValue) => {
                setNatureOfCrimesValue((prev) =>
                  prev.includes(currentValue)
                    ? prev.filter((c) => c !== currentValue)
                    : [...prev, currentValue]
                );
                setNatureOfCrimesOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", natureOfCrimesValue.includes(crime) ? "opacity-100" : "opacity-0")} />
              <div className="flex-1">
                <div className="font-medium">{crime}</div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>`}
            specs={{
              colors: [
                "Border: border-gray-200",
                "Hover: hover:bg-gray-100",
                "Selected check: text-blue-600",
                "Format hint: text-gray-500",
              ],
              spacing: [
                "Popover width: w-[400px]",
                "Item padding: px-2 py-1.5",
                "Gap between check and text: gap-2",
              ],
              typography: [
                "Label: font-medium text-sm",
                "Format hint: text-xs",
              ],
              interactions: [
                "Type to filter options in real-time",
                "Arrow keys to navigate filtered results",
                "Enter to select highlighted option",
                "Format hint appears for each type",
                "Auto-closes on selection",
              ],
            }}
          >
            <div className="max-w-md">
              <Label htmlFor="nature-of-crimes-demo" className="mb-2 block text-sm font-medium">
                Nature of Crimes
              </Label>
              <Popover open={natureOfCrimesOpen} onOpenChange={setNatureOfCrimesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="nature-of-crimes-demo"
                    variant="outline"
                    role="combobox"
                    aria-expanded={natureOfCrimesOpen}
                    className="w-full justify-between h-9"
                  >
                    {natureOfCrimesValue.length > 0
                      ? natureOfCrimesValue.map((crime) => NATURE_OF_CRIMES.find((c) => c === crime)?.label).join(", ")
                      : "Select nature of crimes"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search nature of crimes..." />
                    <CommandList>
                      <CommandEmpty>No nature of crime found.</CommandEmpty>
                      <CommandGroup>
                        {NATURE_OF_CRIMES.map((crime) => (
                          <CommandItem
                            key={crime}
                            value={crime}
                            onSelect={(currentValue) => {
                              setNatureOfCrimesValue((prev) =>
                                prev.includes(currentValue)
                                  ? prev.filter((c) => c !== currentValue)
                                  : [...prev, currentValue]
                              );
                              setNatureOfCrimesOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                natureOfCrimesValue.includes(crime) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{crime}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {natureOfCrimesValue.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: <span className="font-semibold">
                    {natureOfCrimesValue.map((crime) => NATURE_OF_CRIMES.find((c) => c === crime)?.label).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </ComponentExample>
        </div>

        <Separator className="my-12" />

        {/* 6. EU27 DSA Harms Multi-Select */}
        <div id="eu27-dsa-harms">
          <ComponentExample
            title="6. EU27 DSA Harms Multi-Select"
            description="Multi-select dropdown for choosing the nature of crimes involved in the case. Allows multiple selections."
            code={`<Popover open={eu27DsaHarmsOpen} onOpenChange={setEu27DsaHarmsOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {eu27DsaHarmsValue.length > 0
        ? eu27DsaHarmsValue.map((harms) => EU27_DSA_HARMS.find((c) => c === harms)?.label).join(", ")
        : "Select EU27 DSA harms"}
      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] p-0">
    <Command>
      <CommandInput placeholder="Search EU27 DSA harms..." />
      <CommandList>
        <CommandEmpty>No EU27 DSA harm found.</CommandEmpty>
        <CommandGroup>
          {EU27_DSA_HARMS.map((harms) => (
            <CommandItem
              key={harms}
              value={harms}
              onSelect={(currentValue) => {
                setEu27DsaHarmsValue((prev) =>
                  prev.includes(currentValue)
                    ? prev.filter((c) => c !== currentValue)
                    : [...prev, currentValue]
                );
                setEu27DsaHarmsOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", eu27DsaHarmsValue.includes(harms) ? "opacity-100" : "opacity-0")} />
              <div className="flex-1">
                <div className="font-medium">{harms}</div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>`}
            specs={{
              colors: [
                "Border: border-gray-200",
                "Hover: hover:bg-gray-100",
                "Selected check: text-blue-600",
                "Format hint: text-gray-500",
              ],
              spacing: [
                "Popover width: w-[400px]",
                "Item padding: px-2 py-1.5",
                "Gap between check and text: gap-2",
              ],
              typography: [
                "Label: font-medium text-sm",
                "Format hint: text-xs",
              ],
              interactions: [
                "Type to filter options in real-time",
                "Arrow keys to navigate filtered results",
                "Enter to select highlighted option",
                "Format hint appears for each type",
                "Auto-closes on selection",
              ],
            }}
          >
            <div className="max-w-md">
              <Label htmlFor="eu27-dsa-harms-demo" className="mb-2 block text-sm font-medium">
                EU27 DSA Harms
              </Label>
              <Popover open={eu27DsaHarmsOpen} onOpenChange={setEu27DsaHarmsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="eu27-dsa-harms-demo"
                    variant="outline"
                    role="combobox"
                    aria-expanded={eu27DsaHarmsOpen}
                    className="w-full justify-between h-9"
                  >
                    {eu27DsaHarmsValue.length > 0
                      ? eu27DsaHarmsValue.map((harms) => EU27_DSA_HARMS.find((c) => c === harms)?.label).join(", ")
                      : "Select EU27 DSA harms"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search EU27 DSA harms..." />
                    <CommandList>
                      <CommandEmpty>No EU27 DSA harm found.</CommandEmpty>
                      <CommandGroup>
                        {EU27_DSA_HARMS.map((harms) => (
                          <CommandItem
                            key={harms}
                            value={harms}
                            onSelect={(currentValue) => {
                              setEu27DsaHarmsValue((prev) =>
                                prev.includes(currentValue)
                                  ? prev.filter((c) => c !== currentValue)
                                  : [...prev, currentValue]
                              );
                              setEu27DsaHarmsOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                eu27DsaHarmsValue.includes(harms) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{harms}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {eu27DsaHarmsValue.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: <span className="font-semibold">
                    {eu27DsaHarmsValue.map((harms) => EU27_DSA_HARMS.find((c) => c === harms)?.label).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </ComponentExample>
        </div>

        <Separator className="my-12" />

        {/* 7. Select from Existing Agency */}
        <div id="agency-search">
          <ComponentExample
            title="7. Select from Existing Agency"
            description="Searchable agency selector using Command pattern. Allows quick filtering through large lists. Used in contact information and jurisdiction fields."
            code={`<Popover open={agencySearchOpen} onOpenChange={setAgencySearchOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {selectedAgency || "Select agency"}
      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[300px] p-0">
    <Command>
      <CommandInput placeholder="Search agencies..." />
      <CommandList>
        <CommandEmpty>No agency found.</CommandEmpty>
        <CommandGroup>
          {MOCK_AGENCIES.map((agency) => (
            <CommandItem
              key={agency.id}
              value={agency.id}
              onSelect={(value) => {
                setSelectedAgency(value);
                setAgencySearchOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", selectedAgency === agency.id ? "opacity-100" : "opacity-0")} />
              <Building className="mr-2 h-4 w-4 text-gray-400" />
              {agency.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>`}
            specs={{
              colors: [
                "Building icon: text-gray-400",
                "Selected check: opacity-100",
                "Unselected check: opacity-0",
              ],
              spacing: [
                "Popover width: w-[300px]",
                "Icon margins: mr-2 (8px)",
              ],
              typography: [
                "Font size: text-sm",
                "Font weight: font-normal",
              ],
              interactions: [
                "Real-time search filtering",
                "Keyboard navigation",
                "Building icon for visual identification",
                "Check mark indicates selected agency",
              ],
            }}
          >
            <div className="max-w-md">
              <Label htmlFor="agency-demo" className="mb-2 block text-sm font-medium">
                Agency
              </Label>
              <Popover open={agencySearchOpen} onOpenChange={setAgencySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="agency-demo"
                    variant="outline"
                    role="combobox"
                    aria-expanded={agencySearchOpen}
                    className="w-full justify-between h-9"
                  >
                    {selectedAgency || "Select agency"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search agencies..." />
                    <CommandList>
                      <CommandEmpty>No agency found.</CommandEmpty>
                      <CommandGroup>
                        {MOCK_AGENCIES.map((agency) => (
                          <CommandItem
                            key={agency.id}
                            value={agency.id}
                            onSelect={(value) => {
                              setSelectedAgency(value === selectedAgency ? "" : value);
                              setAgencySearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedAgency === agency.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Building className="mr-2 h-4 w-4 text-gray-400" />
                            {agency.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedAgency && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: <span className="font-semibold">{MOCK_AGENCIES.find(a => a.id === selectedAgency)?.name}</span>
                </div>
              )}
            </div>
          </ComponentExample>
        </div>

        <Separator className="my-12" />

        {/* 8. Select from Existing Contacts */}
        <div id="contact-search">
          <ComponentExample
            title="8. Select from Existing Contacts"
            description="Searchable contact selector using Command pattern. Allows quick filtering through large lists. Used in contact information and jurisdiction fields."
            code={`<Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {selectedContact || "Select contact"}
      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[300px] p-0">
    <Command>
      <CommandInput placeholder="Search contacts..." />
      <CommandList>
        <CommandEmpty>No contact found.</CommandEmpty>
        <CommandGroup>
          {MOCK_CONTACTS.map((contact) => (
            <CommandItem
              key={contact.id}
              value={contact.id}
              onSelect={(value) => {
                setSelectedContact(value);
                setContactSearchOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", selectedContact === contact.id ? "opacity-100" : "opacity-0")} />
              <User className="mr-2 h-4 w-4 text-gray-400" />
              {contact.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>`}
            specs={{
              colors: [
                "User icon: text-gray-400",
                "Selected check: opacity-100",
                "Unselected check: opacity-0",
              ],
              spacing: [
                "Popover width: w-[300px]",
                "Icon margins: mr-2 (8px)",
              ],
              typography: [
                "Font size: text-sm",
                "Font weight: font-normal",
              ],
              interactions: [
                "Real-time search filtering",
                "Keyboard navigation",
                "User icon for visual identification",
                "Check mark indicates selected contact",
              ],
            }}
          >
            <div className="max-w-md">
              <Label htmlFor="contact-demo" className="mb-2 block text-sm font-medium">
                Contact
              </Label>
              <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="contact-demo"
                    variant="outline"
                    role="combobox"
                    aria-expanded={contactSearchOpen}
                    className="w-full justify-between h-9"
                  >
                    {selectedContact || "Select contact"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search contacts..." />
                    <CommandList>
                      <CommandEmpty>No contact found.</CommandEmpty>
                      <CommandGroup>
                        {MOCK_CONTACTS.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={contact.id}
                            onSelect={(value) => {
                              setSelectedContact(value === selectedContact ? "" : value);
                              setContactSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedContact === contact.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <User className="mr-2 h-4 w-4 text-gray-400" />
                            {contact.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedContact && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected: <span className="font-semibold">{MOCK_CONTACTS.find(c => c.id === selectedContact)?.name}</span>
                </div>
              )}
            </div>
          </ComponentExample>
        </div>

        <Separator className="my-12" />

        {/* Design Tokens */}
        <div id="design-tokens" className="print:break-before-page">
          <h2 className="text-2xl font-bold mb-6">9. Design Tokens & Color System</h2>
          
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Color Palette</h3>
            
            <div className="space-y-6">
              {/* Primary Colors */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-gray-700">Primary (Microsoft Blue)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <div className="h-20 rounded-lg bg-[#0078d4] border border-gray-200"></div>
                    <div className="text-xs font-mono">#0078d4</div>
                    <div className="text-xs text-gray-600">Primary</div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-lg bg-[#106ebe] border border-gray-200"></div>
                    <div className="text-xs font-mono">#106ebe</div>
                    <div className="text-xs text-gray-600">Hover</div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-lg bg-[#5B9BD5] border border-gray-200"></div>
                    <div className="text-xs font-mono">#5B9BD5</div>
                    <div className="text-xs text-gray-600">Light</div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-lg bg-blue-50 border border-gray-200"></div>
                    <div className="text-xs font-mono">blue-50</div>
                    <div className="text-xs text-gray-600">Background</div>
                  </div>
                </div>
              </div>

              {/* Priority Colors */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-gray-700">Priority Indicators</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <div className="h-20 rounded-lg bg-red-600 border border-gray-200"></div>
                    <div className="text-xs font-mono">red-600</div>
                    <div className="text-xs text-gray-600">Critical</div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-lg bg-orange-500 border border-gray-200"></div>
                    <div className="text-xs font-mono">orange-500</div>
                    <div className="text-xs text-gray-600">High</div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-lg bg-blue-500 border border-gray-200"></div>
                    <div className="text-xs font-mono">blue-500</div>
                    <div className="text-xs text-gray-600">Medium</div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-20 rounded-lg bg-gray-400 border border-gray-200"></div>
                    <div className="text-xs font-mono">gray-400</div>
                    <div className="text-xs text-gray-600">Low</div>
                  </div>
                </div>
              </div>

              {/* Neutral Colors */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-gray-700">Neutral Palette</h4>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div key={shade} className="space-y-2">
                      <div className={`h-16 rounded-lg bg-gray-${shade} border border-gray-200`}></div>
                      <div className="text-xs font-mono">gray-${shade}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Spacing Scale</h3>
            <div className="space-y-3">
              {[
                { name: "xs", value: "0.5 (2px)" },
                { name: "sm", value: "1 (4px)" },
                { name: "md", value: "2 (8px)" },
                { name: "lg", value: "3 (12px)" },
                { name: "xl", value: "4 (16px)" },
                { name: "2xl", value: "6 (24px)" },
                { name: "3xl", value: "8 (32px)" },
              ].map((space) => (
                <div key={space.name} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-mono text-gray-600">{space.value}</div>
                  <div className={`h-6 bg-blue-200 rounded`} style={{ width: `${parseFloat(space.value) * 16}px` }}></div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Typography Scale</h3>
            <div className="space-y-4">
              <div className="flex items-baseline gap-4 pb-3 border-b">
                <div className="w-32 text-sm text-gray-600">Extra Small</div>
                <div className="text-xs">12px / text-xs</div>
                <div className="flex-1 text-xs text-gray-400">Used for metadata and hints</div>
              </div>
              <div className="flex items-baseline gap-4 pb-3 border-b">
                <div className="w-32 text-sm text-gray-600">Small</div>
                <div className="text-sm">14px / text-sm</div>
                <div className="flex-1 text-xs text-gray-400">Used for body text and labels</div>
              </div>
              <div className="flex items-baseline gap-4 pb-3 border-b">
                <div className="w-32 text-sm text-gray-600">Base</div>
                <div className="text-base">16px / text-base</div>
                <div className="flex-1 text-xs text-gray-400">Default text size</div>
              </div>
              <div className="flex items-baseline gap-4 pb-3 border-b">
                <div className="w-32 text-sm text-gray-600">Large</div>
                <div className="text-lg">18px / text-lg</div>
                <div className="flex-1 text-xs text-gray-400">Section headings</div>
              </div>
              <div className="flex items-baseline gap-4 pb-3 border-b">
                <div className="w-32 text-sm text-gray-600">Extra Large</div>
                <div className="text-xl">20px / text-xl</div>
                <div className="flex-1 text-xs text-gray-400">Card titles</div>
              </div>
              <div className="flex items-baseline gap-4">
                <div className="w-32 text-sm text-gray-600">2X Large</div>
                <div className="text-2xl">24px / text-2xl</div>
                <div className="flex-1 text-xs text-gray-400">Page headings</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 print:hidden">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Data Access Request Suite © 2026
            </div>
            <div>
              Last updated: {formatDateToMMM(new Date())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}