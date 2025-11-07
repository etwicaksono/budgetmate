import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  InputGroup,
  ButtonGroup,
} from 'react-bootstrap';
import { FaPlus, FaArrowRight } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { ChangeEvent, ComponentType } from 'react';
import type { IconType, IconBaseProps } from 'react-icons';
import { ChildCategorySelect } from './ChildCategorySelect';
import { SingleCategoryDropdown } from './SingleCategoryDropdown';
import { InputClearButton } from '../../components/InputClearButton';
import {
  categoryService,
  type ApiCategoryResponse,
} from '../../services/categoryService';
import {
  accountService,
  type ApiAccountResponse,
} from '../../services/accountService';
import type { CategoryIconName } from './useCategoryData';
import { formatNumberDisplayFromValue, coerceAndFormatNumber } from '../../utils/numericInput';

type TransactionType = 'Expense' | 'Income' | 'Transfer' | string;
type IconComponent = ComponentType<IconBaseProps>;
type ChildIconComponent = ComponentType<{ size?: number; className?: string }>;
type IconMapping = Record<string, IconType | IconComponent | null | undefined>;
type CategoryTree = Record<string, string[]>;
type ColorMapping = Record<string, string>;
type FormControlElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface TypeOption {
  value: TransactionType;
  label: string;
  activeVariant: 'danger' | 'success' | 'primary';
}

export interface QuickTransactionOption {
  id: string | number;
  description: string;
  category?: string;
  category_id?: string | number | null;
  amount?: string | number;
  account?: string;
  type?: TransactionType;
  currency?: string;
}

export interface TransactionFormValues {
  templateId?: string | number;
  type: TransactionType;
  description: string;
  amount: string | number;
  currency: string;
  date: string;
  dateTime: string;
  category: string;
  categoryId?: string;
  account: string; // Now stores account ID instead of name
  accountName?: string; // Optional: for display purposes
  toAccount?: string; // Now stores account ID instead of name
  toAccountName?: string; // Optional: for display purposes
  toAmount?: string | number;
  toCurrency?: string;
  labels: string;
  createTemplate?: boolean;
  notes: string;
  payer: string;
  paymentType: string;
  paymentStatus: string;
  [additional: string]: unknown;
}

interface SyntheticTransactionEventTarget {
  name: string;
  value: string | number | boolean | null | undefined;
  checked?: boolean;
}

interface SyntheticTransactionEvent {
  target: SyntheticTransactionEventTarget;
}

export type TransactionChangeEvent =
  | ChangeEvent<FormControlElement>
  | SyntheticTransactionEvent;

export type TransactionChangeHandler = (event: TransactionChangeEvent) => void;

export type TransactionModalSaveContext = {
  categoryId?: string;
  categoryLabel?: string;
};

export interface TransactionModalProps {
  show: boolean;
  onHide: () => void;
  transaction: TransactionFormValues | null;
  onChange?: TransactionChangeHandler;
  onSave?: (
    createAnother: boolean,
    context?: TransactionModalSaveContext
  ) => void | Promise<void>;
  quickTransactions?: QuickTransactionOption[];
  onTemplateSelect?: (templateId: string | null) => void;
  onAddTemplate?: () => void;
  availableCategories?: string[];
  availableAccounts?: string[];
  categoryTree?: CategoryTree;
  parentCategoryColors?: ColorMapping;
  categoryIcons?: IconMapping;
  accountTree?: CategoryTree;
  accountColors?: ColorMapping;
  accountIcons?: IconMapping;
  validationErrors?: Record<string, string>;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'Expense', label: 'Expense', activeVariant: 'danger' },
  { value: 'Income', label: 'Income', activeVariant: 'success' },
  { value: 'Transfer', label: 'Transfer', activeVariant: 'primary' },
];

const PAYMENT_TYPE_OPTIONS = [
  'Cash',
  'Credit Card',
  'Bank Transfer',
  'Digital Wallet',
];
const PAYMENT_STATUS_OPTIONS = ['Cleared', 'Pending', 'Scheduled'];

const renderIcon = (
  Icon: IconType | IconComponent | null | undefined,
  props: IconBaseProps = {}
): React.ReactNode => {
  if (!Icon) {
    return null;
  }
  const Component = Icon as IconComponent;
  return <Component {...props} />;
};

const DEFAULT_CATEGORY_COLOR = '#6c757d';
const DEFAULT_CATEGORY_ICON: CategoryIconName = 'FaGift';

const resolveIconComponent = (
  iconName: string | null | undefined
): IconType | IconComponent | undefined => {
  if (!iconName) {
    return undefined;
  }

  const iconsLibrary = FaIcons as unknown as Record<string, IconType>;
  if (iconName in iconsLibrary) {
    return iconsLibrary[iconName];
  }

  if (DEFAULT_CATEGORY_ICON in iconsLibrary) {
    return iconsLibrary[DEFAULT_CATEGORY_ICON];
  }

  return undefined;
};

const isCategoryWithIdAndName = (
  category: ApiCategoryResponse | null | undefined
): category is ApiCategoryResponse & { id: string; name: string } => {
  if (!category) {
    return false;
  }

  const { id, name } = category;
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    typeof name === 'string' &&
    name.length > 0
  );
};

const isParentCategory = (category: ApiCategoryResponse): boolean => {
  if (typeof category.is_parent === 'boolean') {
    return category.is_parent;
  }
  return category.parent_id === null || category.parent_id === undefined;
};

const normalizeApiCategory = (
  item: ApiCategoryResponse
): ApiCategoryResponse | null => {
  if (!isCategoryWithIdAndName(item)) {
    return null;
  }

  return {
    ...item,
    id: item.id,
    name: item.name,
    parent_id: item.parent_id ?? null,
    icon: item.icon ?? DEFAULT_CATEGORY_ICON,
    color: item.color ?? DEFAULT_CATEGORY_COLOR,
    is_parent: isParentCategory(item),
  };
};

const buildCategoryTreeFromCategories = (
  categories: ApiCategoryResponse[]
): CategoryTree => {
  const tree: CategoryTree = {};
  const validCategories = categories.filter(isCategoryWithIdAndName);
  const parentNameById = new Map<string, string>();

  validCategories.forEach((category) => {
    parentNameById.set(category.id, category.name);
    if (isParentCategory(category) || category.parent_id == null) {
      if (!tree[category.name]) {
        tree[category.name] = [];
      }
    }
  });

  validCategories.forEach((category) => {
    if (category.parent_id != null) {
      const parentName = parentNameById.get(category.parent_id);
      if (parentName) {
        if (!tree[parentName]) {
          tree[parentName] = [];
        }
        tree[parentName].push(category.name);
      } else if (!tree[category.name]) {
        tree[category.name] = [];
      }
    } else if (!isParentCategory(category) && !tree[category.name]) {
      tree[category.name] = [];
    }
  });

  return tree;
};

const buildCategoryColorMapFromCategories = (
  categories: ApiCategoryResponse[]
): ColorMapping =>
  categories
    .filter(isCategoryWithIdAndName)
    .filter(isParentCategory)
    .reduce<ColorMapping>((accumulator, category) => {
      accumulator[category.name] = category.color ?? DEFAULT_CATEGORY_COLOR;
      return accumulator;
    }, {});

const buildCategoryIconMapFromCategories = (
  categories: ApiCategoryResponse[]
): IconMapping =>
  categories
    .filter(isCategoryWithIdAndName)
    .reduce<IconMapping>((accumulator, category) => {
      const iconComponent = resolveIconComponent(category.icon);
      if (iconComponent) {
        accumulator[category.name] = iconComponent;
      }
      return accumulator;
    }, {});

const buildAccountColorsMapFromResponse = (
  accounts: ApiAccountResponse[]
): ColorMapping =>
  accounts.reduce<ColorMapping>((accumulator, account) => {
    if (account.name) {
      accumulator[account.name] = account.color ?? DEFAULT_CATEGORY_COLOR;
    }
    return accumulator;
  }, {});

const buildAccountIconMapFromResponse = (
  accounts: ApiAccountResponse[]
): IconMapping =>
  accounts.reduce<IconMapping>((accumulator, account) => {
    if (account.name && account.icon) {
      const iconComponent = resolveIconComponent(account.icon);
      if (iconComponent) {
        accumulator[account.name] = iconComponent;
      }
    }
    return accumulator;
  }, {});

export function TransactionModal({
  show,
  onHide,
  transaction,
  onChange,
  onSave,
  quickTransactions = [],
  onTemplateSelect,
  onAddTemplate,
  availableCategories = [],
  availableAccounts = [],
  categoryTree,
  parentCategoryColors,
  categoryIcons,
  accountTree,
  accountColors,
  accountIcons,
  validationErrors = {},
}: TransactionModalProps): JSX.Element | null {
  const [apiCategories, setApiCategories] = useState<ApiCategoryResponse[]>([]);
  const [categoryFetchState, setCategoryFetchState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const [apiAccounts, setApiAccounts] = useState<ApiAccountResponse[]>([]);
  const [accountFetchState, setAccountFetchState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const templateOptions = useMemo(
    () => quickTransactions ?? [],
    [quickTransactions]
  );

  const handleTypeChange = useCallback(
    (type: TransactionType) => {
      onChange?.({ target: { name: 'type', value: type } });
    },
    [onChange]
  );

  const handleDateTimeChange = useCallback(
    (value: string) => {
      if (!onChange) {
        return;
      }
      onChange({ target: { name: 'dateTime', value } });
      onChange({
        target: { name: 'date', value: value ? value.slice(0, 10) : '' },
      });
    },
    [onChange]
  );

  // Ref and handlers for controlling the datetime-local picker
  const dateTimeInputRef = useRef<HTMLInputElement | null>(null);

  const openDateTimePicker = useCallback(() => {
    const input = dateTimeInputRef.current;
    if (!input) return;

    // Focus first for browsers that show picker on focus
    input.focus();

    // Temporarily make input mutable to allow opening the picker, then restore
    const prevReadOnly = input.readOnly;
    input.readOnly = false;

    try {
      // Use the native showPicker when available (Chromium-based browsers)
      const anyInput = input as unknown as { showPicker?: () => void };
      if (typeof anyInput.showPicker === 'function') {
        anyInput.showPicker();
      } else {
        input.click();
      }
    } catch {
      try {
        input.click();
      } catch {
        // ignore
      }
    } finally {
      // Restore readOnly shortly after to prevent manual typing
      setTimeout(() => {
        input.readOnly = prevReadOnly;
      }, 0);
    }
  }, []);

  // Local display state for Amount fields with thousand/decimal separators
  const [amountDisplay, setAmountDisplay] = useState<string>('');
  const [toAmountDisplay, setToAmountDisplay] = useState<string>('');
  const [isEditingAmount, setIsEditingAmount] = useState<boolean>(false);
  const [isEditingToAmount, setIsEditingToAmount] = useState<boolean>(false);

  // Local state for Payer to ensure the field is immediately editable
  const [payerInput, setPayerInput] = useState<string>('');
  useEffect(() => {
    setPayerInput(typeof transaction?.payer === 'string' ? transaction.payer : '');
  }, [transaction?.payer]);

  // Local state for Labels to ensure the field is immediately editable
  const [labelsInput, setLabelsInput] = useState<string>('');

  useEffect(() => {
    setLabelsInput(typeof transaction?.labels === 'string' ? transaction.labels : '');
  }, [transaction?.labels]);



  // Helper to remove leading zeros (e.g., "0012345" -> "12345")
  const removeLeadingZeros = useCallback((value: string): string => {
    // Handle empty or invalid input
    if (!value) return value;
    
    // If the value starts with digits, remove leading zeros
    // But preserve "0" if it's the only digit before decimal point
    const parts = value.split('.');
    const integerPart = parts[0] || '';
    const decimalPart = parts[1];
    
    // Remove leading zeros from integer part
    let cleanedInteger = integerPart.replace(/^0+/, '');
    
    // If all zeros were removed, keep one zero
    if (cleanedInteger === '' && integerPart.length > 0) {
      cleanedInteger = '0';
    }
    
    // Reconstruct the number
    return decimalPart !== undefined ? `${cleanedInteger}.${decimalPart}` : cleanedInteger;
  }, []);

  // Unified handler to update display and push normalized raw to parent
  const handleNumericInput = useCallback(
    (fieldName: 'amount' | 'toAmount') =>
      (next: string) => {
        // Remove leading zeros before processing
        const cleanedInput = removeLeadingZeros(next);
        const { display, normalized, deferCommit } = coerceAndFormatNumber(cleanedInput);
        if (fieldName === 'amount') {
          setAmountDisplay(display);
          setIsEditingAmount(true);
        } else {
          setToAmountDisplay(display);
          setIsEditingToAmount(true);
        }
        if (!deferCommit) {
          onChange?.({
            target: {
              name: fieldName,
              value: normalized,
            },
          });
        }
      },
    [onChange, removeLeadingZeros]
  );

  // Initialize displays from incoming transaction values and keep in sync (avoid overriding while editing)
  useEffect(() => {
    if (!isEditingAmount) {
      setAmountDisplay(
        formatNumberDisplayFromValue(transaction?.amount as unknown as string | number)
      );
    }
  }, [transaction?.amount, isEditingAmount]);

  useEffect(() => {
    if (!isEditingToAmount) {
      setToAmountDisplay(
        formatNumberDisplayFromValue(transaction?.toAmount as unknown as string | number)
      );
    }
  }, [transaction?.toAmount, isEditingToAmount]);

  const handleTemplateChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextValue = event.target.value;
      onTemplateSelect?.(nextValue ? nextValue : null);
    },
    [onTemplateSelect]
  );

  const handleCheckboxChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = event.target;
      if (!name) {
        return;
      }
      onChange?.({ target: { name, value: checked, checked } });
    },
    [onChange]
  );

  const categoryIdByName = useMemo<Record<string, string>>(() => {
    const mapping: Record<string, string> = {};
    apiCategories.forEach((category) => {
      if (category.name && category.id) {
        mapping[category.name] = String(category.id);
      }
    });
    return mapping;
  }, [apiCategories]);
  const handleSave = useCallback(
    (createAnother: boolean) => {
      if (onSave) {
        const categoryLabel = transaction?.category ?? '';
        const computedCategoryId =
          transaction?.categoryId && String(transaction.categoryId).length > 0
            ? String(transaction.categoryId)
            : categoryLabel
              ? categoryIdByName[categoryLabel] ?? undefined
              : undefined;

        const saveContext: TransactionModalSaveContext = {
          categoryId: computedCategoryId,
          categoryLabel: categoryLabel || undefined,
        };

        try {
          const result = onSave(createAnother, saveContext);
          // If it's a promise, catch any errors
          if (result instanceof Promise) {
            result.catch((error: unknown) => {
              // eslint-disable-next-line no-console
              console.error('onSave promise rejected:', error);
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error calling onSave:', error);
        }
      } else {
        // eslint-disable-next-line no-console
        console.error('onSave is not defined!');
      }
    },
    [onSave, transaction, categoryIdByName]
  );

  const providedCategoryOptions = useMemo(
    () =>
      (availableCategories ?? []).filter(
        (categoryOption) => categoryOption && categoryOption !== 'All'
      ),
    [availableCategories]
  );

  const apiCategoryOptions = useMemo(() => {
    if (apiCategories.length === 0) {
      return [] as string[];
    }
    const uniqueNames = new Set<string>();
    apiCategories.forEach((category) => {
      if (category.name && category.name !== 'All') {
        uniqueNames.add(category.name);
      }
    });
    return Array.from(uniqueNames);
  }, [apiCategories]);

  const resolvedCategoryOptions = useMemo(() => {
    const merged = new Set<string>();
    providedCategoryOptions.forEach((item) => merged.add(item));
    apiCategoryOptions.forEach((item) => merged.add(item));
    return Array.from(merged);
  }, [providedCategoryOptions, apiCategoryOptions]);

  const apiCategoryTree = useMemo<CategoryTree>(() => {
    if (apiCategories.length === 0) {
      return {};
    }
    return buildCategoryTreeFromCategories(apiCategories);
  }, [apiCategories]);

  const apiCategoryColorsMap = useMemo<ColorMapping>(() => {
    if (apiCategories.length === 0) {
      return {};
    }
    return buildCategoryColorMapFromCategories(apiCategories);
  }, [apiCategories]);

  const apiCategoryIcons = useMemo<IconMapping>(() => {
    if (apiCategories.length === 0) {
      return {};
    }
    return buildCategoryIconMapFromCategories(apiCategories);
  }, [apiCategories]);

  const apiAccountOptions = useMemo(() => {
    if (apiAccounts.length === 0) {
      return [] as string[];
    }
    const uniqueNames = new Set<string>();
    apiAccounts.forEach((account) => {
      if (account.name && account.name !== 'All') {
        uniqueNames.add(account.name);
      }
    });
    return Array.from(uniqueNames);
  }, [apiAccounts]);

  const apiAccountColorsMap = useMemo<ColorMapping>(() => {
    if (apiAccounts.length === 0) {
      return {};
    }
    return buildAccountColorsMapFromResponse(apiAccounts);
  }, [apiAccounts]);

  const apiAccountIcons = useMemo<IconMapping>(() => {
    if (apiAccounts.length === 0) {
      return {};
    }
    return buildAccountIconMapFromResponse(apiAccounts);
  }, [apiAccounts]);

  const ensureCategoriesLoaded = useCallback(async () => {
    if (categoryFetchState !== 'idle') {
      return;
    }

    try {
      setCategoryFetchState('loading');
      const response = await categoryService.fetchCategories();
      const mapped = response
        .map(normalizeApiCategory)
        .filter((item): item is ApiCategoryResponse => item !== null);

      setApiCategories(mapped);

      setCategoryFetchState('success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('TransactionModal: failed to fetch categories', error);
      setCategoryFetchState('error');
    }
  }, [categoryFetchState]);

  const ensureAccountsLoaded = useCallback(async () => {
    if (accountFetchState !== 'idle') {
      return;
    }

    try {
      setAccountFetchState('loading');
      const response = await accountService.fetchAccounts();
      setApiAccounts(response);
      setAccountFetchState('success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('TransactionModal: failed to fetch accounts', error);
      setAccountFetchState('error');
    }
  }, [accountFetchState]);

  useEffect(() => {
    if (show) {
      void ensureCategoriesLoaded();
      void ensureAccountsLoaded();
    } else {
      // Reset to 'idle' when modal closes so it fetches fresh data next time
      setCategoryFetchState('idle');
      setAccountFetchState('idle');
    }
  }, [show, ensureCategoriesLoaded, ensureAccountsLoaded]);

  const resolvedAccountTree = useMemo<CategoryTree>(() => {
    // Use only API data for accounts
    return Object.fromEntries(
      apiAccountOptions.map((accountOption) => [accountOption, [] as string[]])
    );
  }, [apiAccountOptions]);

  const resolvedAccountColors = useMemo<ColorMapping>(() => {
    // Use only API data for account colors
    return apiAccountColorsMap;
  }, [apiAccountColorsMap]);

  const resolvedAccountIcons = useMemo<IconMapping>(() => {
    // Use only API data for account icons
    return apiAccountIcons;
  }, [apiAccountIcons]);

  const resolvedCategoryTree = useMemo<CategoryTree>(() => {
    const mergedTree: CategoryTree = {};

    Object.entries(apiCategoryTree ?? {}).forEach(([parent, children]) => {
      mergedTree[parent] = [...(children ?? [])];
    });

    if (categoryTree && Object.keys(categoryTree).length > 0) {
      Object.entries(categoryTree).forEach(([parent, children]) => {
        const existingChildren = mergedTree[parent] ?? [];
        const normalizedChildren = (children ?? []).filter(
          (child): child is string => Boolean(child)
        );
        if (normalizedChildren.length === 0 && !mergedTree[parent]) {
          mergedTree[parent] = existingChildren;
          return;
        }

        const combined = new Set<string>([...existingChildren, ...normalizedChildren]);
        mergedTree[parent] = Array.from(combined);
      });
    }

    if (Object.keys(mergedTree).length > 0) {
      return mergedTree;
    }

    return Object.fromEntries(
      resolvedCategoryOptions.map((categoryOption) => [categoryOption, [] as string[]])
    );
  }, [categoryTree, apiCategoryTree, resolvedCategoryOptions]);

  const resolvedCategoryColorsMap = useMemo<ColorMapping>(() => {
    const merged: ColorMapping = {};
  
    if (Object.keys(apiCategoryColorsMap).length > 0) {
      Object.assign(merged, apiCategoryColorsMap);
    }
  
    if (parentCategoryColors && Object.keys(parentCategoryColors).length > 0) {
      Object.assign(merged, parentCategoryColors);
    }
  
    return merged;
  }, [parentCategoryColors, apiCategoryColorsMap]);

  const resolvedCategoryIcons = useMemo<IconMapping>(() => {
    const merged: IconMapping = {};

    if (Object.keys(apiCategoryIcons).length > 0) {
      Object.assign(merged, apiCategoryIcons);
    }

    if (categoryIcons && Object.keys(categoryIcons).length > 0) {
      Object.entries(categoryIcons).forEach(([key, value]) => {
        merged[key] = value;
      });
    }

    return merged;
  }, [categoryIcons, apiCategoryIcons]);

  const accountIconsForDropdown = useMemo<
    Record<string, IconType | IconComponent | undefined>
  >(
    () =>
      Object.fromEntries(
        Object.entries(resolvedAccountIcons).map(([key, icon]) => [
          key,
          icon ?? undefined,
        ])
      ),
    [resolvedAccountIcons]
  );

  const categoryIconsForSelect = useMemo<
    Record<string, IconType | ChildIconComponent | undefined>
  >(
    () =>
      Object.fromEntries(
        Object.entries(resolvedCategoryIcons).map(([key, icon]) => [
          key,
          (icon ?? undefined) as IconType | ChildIconComponent | undefined,
        ])
      ),
    [resolvedCategoryIcons]
  );

  // Build account name to ID mapping from apiAccounts
  const accountNameToIdMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    apiAccounts.forEach((account) => {
      if (account.name && account.id) {
        map[account.name] = account.id;
      }
    });
    return map;
  }, [apiAccounts]);

  const createSingleSelectSetter = useCallback(
    (fieldName: 'account' | 'toAccount' | 'category') =>
      (nextSelection?: string[]) => {
        const normalized = Array.isArray(nextSelection) ? nextSelection : [];
        const sanitized = normalized.filter(
          (item): item is string => !!item && item !== 'All'
        );
        const nextValue = sanitized[sanitized.length - 1] ?? '';

        if (fieldName === 'category') {
          const nextCategoryId = nextValue ? categoryIdByName[nextValue] ?? '' : '';
          if (transaction && onChange) {
            onChange({
              target: {
                name: 'categoryId',
                value: nextCategoryId,
              },
            });
          }
        }

        if (!transaction || !onChange) {
          return;
        }

        // For account fields, convert name to ID
        if (fieldName === 'account' || fieldName === 'toAccount') {
          const accountId = nextValue ? accountNameToIdMap[nextValue] ?? '' : '';
          const accountNameField = fieldName === 'account' ? 'accountName' : 'toAccountName';
          
          // Set the account ID
          onChange({
            target: {
              name: fieldName,
              value: accountId,
            },
          });
          
          // Also set the account name for display
          onChange({
            target: {
              name: accountNameField,
              value: nextValue,
            },
          });
          return;
        }

        // Trigger onChange which will clear validation errors
        onChange({
          target: {
            name: fieldName,
            value: nextValue,
          },
        });
      },
    [transaction, onChange, categoryIdByName, accountNameToIdMap]
  );

  const handleAccountSelect = useMemo(
    () => {
      const setter = createSingleSelectSetter('account');
      return (selection: string[]) => setter(selection);
    },
    [createSingleSelectSetter]
  );

  const handleToAccountSelect = useMemo(
    () => {
      const setter = createSingleSelectSetter('toAccount');
      return (selection: string[]) => setter(selection);
    },
    [createSingleSelectSetter]
  );

  const handleCategorySelect = useMemo(
    () => createSingleSelectSetter('category'),
    [createSingleSelectSetter]
  );

  const currentTemplateValue = transaction?.templateId
    ? String(transaction.templateId)
    : '';

  if (!transaction) {
    return null;
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Add record</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row>
            <Col lg={6} className="mb-4">
              <Form.Group className="mb-3" controlId="templateSelect">
                <Form.Label className="small text-uppercase text-muted fw-semibold">
                  Select template
                </Form.Label>
                <InputGroup>
                  <Form.Select
                    value={currentTemplateValue}
                    onChange={handleTemplateChange}
                  >
                    <option value="">Select template</option>
                    {templateOptions.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.description}
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    type="button"
                    variant="outline-success"
                    onClick={() => onAddTemplate?.()}
                    title="Create new template"
                  >
                    {renderIcon(FaPlus, { size: 16 })}
                  </Button>
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <div className="d-flex">
                  <ButtonGroup className="w-100">
                    {TYPE_OPTIONS.map((option) => {
                      const isActive = transaction.type === option.value;
                      return (
                        <Button
                          key={option.value}
                          variant={
                            isActive ? option.activeVariant : 'outline-secondary'
                          }
                          onClick={() => handleTypeChange(option.value)}
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </ButtonGroup>
                </div>
              </Form.Group>

              {transaction.type === 'Transfer' ? (
                <>
                  <Form.Group className="mb-3" controlId="transferAccounts">
                    <Row className="g-2 align-items-center justify-content-between">
                      <Col xs={12} md={5}>
                        <Form.Label>From account</Form.Label>
                        <SingleCategoryDropdown
                          selectedCategories={
                            transaction.accountName ? [transaction.accountName] : []
                          }
                          setSelectedCategories={handleAccountSelect}
                          categoryTree={resolvedAccountTree}
                          parentCategoryColors={resolvedAccountColors}
                          categoryIcons={accountIconsForDropdown}
                          allCategories={apiAccountOptions}
                          entityLabelSingular="account"
                          entityLabelPlural="accounts"
                          searchPlaceholder="Search account..."
                          clearSelectedLabel="Clear selection"
                          showClearButton={false}
                        />
                      </Col>
                      <Col
                        xs={12}
                        md="auto"
                        className="d-none d-md-flex justify-content-center align-items-center align-self-center"
                      >
                        <div className="bg-light border rounded-circle p-2">
                          {renderIcon(FaArrowRight, { className: 'text-muted' })}
                        </div>
                      </Col>
                      <Col xs={12} md={5}>
                        <Form.Label>To account</Form.Label>
                        <SingleCategoryDropdown
                          selectedCategories={
                            transaction.toAccountName ? [transaction.toAccountName] : []
                          }
                          setSelectedCategories={handleToAccountSelect}
                          categoryTree={resolvedAccountTree}
                          parentCategoryColors={resolvedAccountColors}
                          categoryIcons={accountIconsForDropdown}
                          allCategories={apiAccountOptions}
                          entityLabelSingular="account"
                          entityLabelPlural="accounts"
                          searchPlaceholder="Search destination account..."
                          clearSelectedLabel="Clear selection"
                          showClearButton={false}
                        />
                      </Col>
                    </Row>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="transferAmount">
                    <Row className="g-2 align-items-center justify-content-between">
                      <Col xs={12} md={5}>
                        <Form.Label>Amount</Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="text"
                            name="amount"
                            value={amountDisplay}
                            onChange={(event) => handleNumericInput('amount')(event.target.value)}
                            onBlur={() => {
                              const { normalized } = coerceAndFormatNumber(amountDisplay);
                              onChange?.({ target: { name: 'amount', value: normalized } });
                              setIsEditingAmount(false);
                            }}
                            placeholder="Enter amount"
                            autoComplete="off"
                            inputMode="decimal"
                          />
                        </InputGroup>
                      </Col>
                      <Col
                        xs={12}
                        md="auto"
                        className="d-none d-md-flex justify-content-center align-items-center align-self-center"
                      >
                        <div className="bg-light border rounded-circle p-2">
                          {renderIcon(FaArrowRight, { className: 'text-muted' })}
                        </div>
                      </Col>
                      <Col xs={12} md={5}>
                        <Form.Label>Amount received</Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="text"
                            name="toAmount"
                            value={toAmountDisplay}
                            onChange={(event) => handleNumericInput('toAmount')(event.target.value)}
                            onBlur={() => {
                              const { normalized } = coerceAndFormatNumber(toAmountDisplay);
                              onChange?.({ target: { name: 'toAmount', value: normalized } });
                              setIsEditingToAmount(false);
                            }}
                            placeholder="Enter amount"
                            autoComplete="off"
                            inputMode="decimal"
                          />
                        </InputGroup>
                      </Col>
                    </Row>
                  </Form.Group>
                </>
              ) : (
                <>
                  <Form.Group className="mb-3" controlId="amount">
                    <Form.Label>Amount</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="text"
                        name="amount"
                        value={amountDisplay}
                        onChange={(event) => handleNumericInput('amount')(event.target.value)}
                        onBlur={() => {
                          const { normalized } = coerceAndFormatNumber(amountDisplay);
                          onChange?.({ target: { name: 'amount', value: normalized } });
                          setIsEditingAmount(false);
                        }}
                        placeholder="Enter amount"
                        autoComplete="off"
                        inputMode="decimal"
                        style={{ paddingRight: '2.5rem' }}
                        isInvalid={!!validationErrors.amount}
                      />
                      <InputClearButton
                        show={!!amountDisplay}
                        onClick={() => {
                          setAmountDisplay('');
                          onChange?.({ target: { name: 'amount', value: '' } });
                          setIsEditingAmount(false);
                        }}
                        title="Clear amount"
                        ariaLabel="Clear amount"
                        rightOffset="0.75rem"
                        iconSize={18}
                        colorClass="text-secondary"
                      />
                      {validationErrors.amount && (
                        <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                          {validationErrors.amount}
                        </Form.Control.Feedback>
                      )}
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="account">
                    <Form.Label>Account</Form.Label>
                    <SingleCategoryDropdown
                      selectedCategories={
                        transaction.accountName ? [transaction.accountName] : []
                      }
                      setSelectedCategories={handleAccountSelect}
                      categoryTree={resolvedAccountTree}
                      parentCategoryColors={resolvedAccountColors}
                      categoryIcons={accountIconsForDropdown}
                      allCategories={apiAccountOptions}
                      entityLabelSingular="account"
                      entityLabelPlural="accounts"
                      searchPlaceholder="Search account..."
                      clearSelectedLabel="Clear selection"
                    />
                    {validationErrors.account && (
                      <div className="invalid-feedback" style={{ display: 'block' }}>
                        {validationErrors.account}
                      </div>
                    )}
                  </Form.Group>
                </>
              )}

              {transaction.type !== 'Transfer' && (
                <Form.Group className="mb-3" controlId="category">
                  <Form.Label>Category</Form.Label>
                  <ChildCategorySelect
                    selectedCategories={
                      transaction.category ? [transaction.category] : []
                    }
                    setSelectedCategories={handleCategorySelect}
                    categoryTree={apiCategoryTree}
                    parentCategoryColors={apiCategoryColorsMap}
                    categoryIcons={categoryIconsForSelect}
                    allCategories={apiCategoryOptions}
                    entityLabelSingular="category"
                    entityLabelPlural="categories"
                    searchPlaceholder="Search category..."
                    clearSelectedLabel="Clear selection"
                    onDropdownOpen={() => {
                      void ensureCategoriesLoaded();
                    }}
                  />
                  {validationErrors.category && (
                    <div className="invalid-feedback" style={{ display: 'block' }}>
                      {validationErrors.category}
                    </div>
                  )}
                </Form.Group>
              )}

              <Form.Group className="mb-3" controlId="labels">
                <Form.Label>Labels</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    name="labels"
                    value={labelsInput}
                    onChange={(event) => {
                      setLabelsInput(event.target.value);
                      onChange?.(event);
                    }}
                    placeholder="Add labels (comma separated)"
                    autoComplete="off"
                    style={{ paddingRight: '2rem' }}
                  />
                  <InputClearButton
                    show={!!labelsInput}
                    onClick={() => {
                      setLabelsInput('');
                      onChange?.({ target: { name: 'labels', value: '' } });
                    }}
                    title="Clear labels"
                    ariaLabel="Clear labels"
                    rightOffset="0.75rem"
                    iconSize={18}
                    colorClass="text-muted"
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3" controlId="dateTime">
                <Form.Label>Date & Time</Form.Label>
                <Form.Control
                  type="datetime-local"
                  name="dateTime"
                  value={transaction.dateTime}
                  onChange={(event) => handleDateTimeChange(event.target.value)}
                  ref={dateTimeInputRef}
                  readOnly
                  inputMode="none"
                  onClick={openDateTimePicker}
                  
                />
              </Form.Group>

              <Form.Check
                type="checkbox"
                id="createTemplateFromRecord"
                label="Create template from this record"
                name="createTemplate"
                checked={!!transaction.createTemplate}
                onChange={handleCheckboxChange}
              />
            </Col>
            <Col lg={6}>
              <h6 className="fw-semibold mb-3">Other details</h6>
              <Form.Group className="mb-3" controlId="notes">
                <Form.Label>Note</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="notes"
                  value={transaction.notes}
                  onChange={(event) => onChange?.(event)}
                  placeholder="Describe your record"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="payer">
                <Form.Label>Payer</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    name="payer"
                    value={payerInput}
                    onChange={(event) => {
                      setPayerInput(event.target.value);
                      onChange?.(event);
                    }}
                    placeholder="Who paid?"
                    autoComplete="off"
                    style={{ paddingRight: '2rem' }}
                  />
                  <InputClearButton
                    show={!!payerInput}
                    onClick={() => {
                      setPayerInput('');
                      onChange?.({ target: { name: 'payer', value: '' } });
                    }}
                    title="Clear payer"
                    ariaLabel="Clear payer"
                    rightOffset="0.75rem"
                    iconSize={18}
                    colorClass="text-muted"
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3" controlId="paymentType">
                <Form.Label>Payment type</Form.Label>
                <Form.Select
                  name="paymentType"
                  value={transaction.paymentType}
                  onChange={(event) => onChange?.(event)}
                >
                  {PAYMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3" controlId="paymentStatus">
                <Form.Label>Payment status</Form.Label>
                <Form.Select
                  name="paymentStatus"
                  value={transaction.paymentStatus}
                  onChange={(event) => onChange?.(event)}
                >
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer className="flex-column flex-lg-row gap-2">
        <div className="d-flex flex-column flex-lg-row w-100 gap-2">
          <Button
            type="button"
            variant="success"
            className="w-100"
            onClick={() => handleSave(false)}
          >
            Add record
          </Button>
          <Button
            type="button"
            variant="outline-primary"
            className="w-100"
            onClick={() => handleSave(true)}
          >
            Add and create another
          </Button>
          <Button
            variant="outline-secondary"
            className="w-100 w-lg-auto"
            onClick={onHide}
          >
            Cancel
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
