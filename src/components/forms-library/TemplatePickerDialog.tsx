/**
 * TemplatePickerDialog — modal for choosing a form template to author.
 * Uses a TabList for category filtering (Production Letters · Rejection
 * Responses · Notices · All) and renders the filtered list as cards.
 *
 * Filtering combines:
 *  - active category tab
 *  - case jurisdiction (template.jurisdiction[] vs case region)
 *  - case requestType (template.requestTypes[] vs formData.requestType)
 */

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Tab,
  TabList,
  makeStyles,
  tokens,
  type TabValue,
} from "@fluentui/react-components";
import { FilePlus2 } from "lucide-react";
import type { FormCategory, FormTemplate } from "../../types/formTemplate";
import type { FormData as CaseFormData } from "../../types/caseTypes";
import { FORM_TEMPLATES } from "../../config/formTemplates";
import { getActiveAttorneyEscalation } from "../../utils/caseEscalation";

const useStyles = makeStyles({
  surface: { width: "min(95vw, 760px)", maxWidth: "760px" },
  body: { display: "flex", flexDirection: "column", rowGap: tokens.spacingVerticalM },
  list: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    maxHeight: "55vh",
    overflowY: "auto",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
  },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    columnGap: tokens.spacingHorizontalM,
  },
  cardTitleBlock: { display: "flex", flexDirection: "column", rowGap: "2px" },
  cardTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  anchor: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  description: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  tags: {
    display: "flex",
    columnGap: tokens.spacingHorizontalXS,
    marginTop: tokens.spacingVerticalXS,
    flexWrap: "wrap",
    rowGap: tokens.spacingVerticalXS,
  },
  empty: {
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
});

const CATEGORY_LABEL: Record<FormCategory, string> = {
  ProductionLetter: "Production Letters",
  RejectionResponse: "Rejection Responses",
  Notice: "Notices",
  Other: "Other",
};

type TabKey = "All" | FormCategory;

const TAB_ORDER: TabKey[] = [
  "All",
  "ProductionLetter",
  "RejectionResponse",
  "Notice",
];

const TAB_LABEL: Record<TabKey, string> = {
  All: "All",
  ProductionLetter: "Production Letters",
  RejectionResponse: "Rejection Responses",
  Notice: "Notices",
  Other: "Other",
};

function templateAppliesToCase(template: FormTemplate, caseData: CaseFormData): boolean {
  // Jurisdiction filter
  if (template.jurisdiction && template.jurisdiction.length > 0) {
    const region = caseData.legalContext?.country?.region;
    if (!region || !template.jurisdiction.includes(region)) return false;
  }
  // Request-type filter
  if (template.requestTypes && template.requestTypes.length > 0) {
    if (!caseData.requestType || !template.requestTypes.includes(caseData.requestType)) {
      return false;
    }
  }
  return true;
}

export interface TemplatePickerDialogProps {
  open: boolean;
  formData: CaseFormData;
  onSelect: (template: FormTemplate) => void;
  onClose: () => void;
}

export function TemplatePickerDialog({
  open,
  formData,
  onSelect,
  onClose,
}: TemplatePickerDialogProps) {
  const styles = useStyles();
  const [tab, setTab] = useState<TabValue>("All");

  // When the attorney has requested more information, surface the RFI
  // template at the top of the picker with a "Recommended" chip so the
  // Specialist doesn't have to hunt for the right next-step letter.
  const recommendRfi =
    getActiveAttorneyEscalation(formData)?.status === "InformationRequested";

  const visibleTemplates = useMemo(() => {
    const list = FORM_TEMPLATES.filter((t) => templateAppliesToCase(t, formData));
    if (!recommendRfi) return list;
    // Sort the recommended template to the top; keep the rest in original
    // order so the picker stays predictable.
    return [...list].sort((a, b) => {
      const aRec = a.id === "REQUEST_ADDITIONAL_INFORMATION" ? 0 : 1;
      const bRec = b.id === "REQUEST_ADDITIONAL_INFORMATION" ? 0 : 1;
      return aRec - bRec;
    });
  }, [formData, recommendRfi]);

  const filtered = useMemo(() => {
    if (tab === "All") return visibleTemplates;
    return visibleTemplates.filter((t) => t.category === tab);
  }, [tab, visibleTemplates]);

  return (
    <Dialog open={open} onOpenChange={(_e, data) => !data.open && onClose()}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Choose a template</DialogTitle>
          <DialogContent className={styles.body}>
            <TabList
              selectedValue={tab}
              onTabSelect={(_e, data) => setTab(data.value)}
            >
              {TAB_ORDER.map((key) => (
                <Tab key={key} value={key}>
                  {TAB_LABEL[key]}
                </Tab>
              ))}
            </TabList>

            {filtered.length === 0 ? (
              <div className={styles.empty}>
                No templates available for this case under the selected category.
              </div>
            ) : (
              <div className={styles.list}>
                {filtered.map((template) => (
                  <div key={template.id} className={styles.card}>
                    <div className={styles.cardHead}>
                      <div className={styles.cardTitleBlock}>
                        <h3 className={styles.cardTitle}>{template.name}</h3>
                        {template.regulatoryAnchor && (
                          <div className={styles.anchor}>{template.regulatoryAnchor}</div>
                        )}
                      </div>
                      <Button
                        appearance="primary"
                        icon={<FilePlus2 size={16} />}
                        onClick={() => onSelect(template)}
                      >
                        Open
                      </Button>
                    </div>
                    <div className={styles.description}>{template.description}</div>
                    <div className={styles.tags}>
                      <Badge appearance="outline" color="informative">
                        {CATEGORY_LABEL[template.category]}
                      </Badge>
                      {(template.jurisdiction ?? []).map((j) => (
                        <Badge key={j} appearance="tint" color="brand">
                          {j}
                        </Badge>
                      ))}
                      {recommendRfi && template.id === "REQUEST_ADDITIONAL_INFORMATION" && (
                        <Badge appearance="filled" color="success">
                          Recommended — Attorney requested more info
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
