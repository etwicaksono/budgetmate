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
import type { CategoryRecord, CategoryIconName } from './useCategoryData';
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
  account: string;
  toAccount?: string;
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

export interface TransactionModalProps {
  show: boolean;
  onHide: () => void;
  transaction: TransactionFormValues | null;
  onChange?: TransactionChangeHandler;
  onSave?: (createAnother: boolean) => void;
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

const mapApiCategoryToRecord = (
  item: ApiCategoryResponse
): CategoryRecord | null => {
  if (!item || item.id == null || !item.name) {
    return null;
  }

  return {
    id: item.id,
    parent_id: item.parent_id ?? null,
    name: item.name,
    icon: (item.icon ?? DEFAULT_CATEGORY_ICON) as CategoryRecord['icon'],
    color: item.color ?? DEFAULT_CATEGORY_COLOR,
    is_parent: item.is_parent ?? item.parent_id == null,
  };
};

const buildCategoryTreeFromRecords = (
  records: CategoryRecord[]
): CategoryTree => {
  const tree: CategoryTree = {};
  const parentNameById = new Map<number, string>();

  records.forEach((record) => {
    parentNameById.set(record.id, record.name);
    if (record.is_parent || record.parent_id == null) {
      if (!tree[record.name]) {
        tree[record.name] = [];
      }
    }
  });

  records.forEach((record) => {
    if (record.parent_id != null) {
      const parentName = parentNameById.get(record.parent_id);
      if (parentName) {
        if (!tree[parentName]) {
          tree[parentName] = [];
        }
        tree[parentName].push(record.name);
      } else if (!tree[record.name]) {
        tree[record.name] = [];
      }
    } else if (!record.is_parent && !tree[record.name]) {
      tree[record.name] = [];
    }
  });

  return tree;
};

const buildCategoryColorMapFromRecords = (
  records: CategoryRecord[]
): ColorMapping =>
  records.reduce<ColorMapping>((accumulator, record) => {
    accumulator[record.name] = record.color ?? DEFAULT_CATEGORY_COLOR;
    return accumulator;
  }, {});

const buildCategoryIconMapFromRecords = (
  records: CategoryRecord[]
): IconMapping =>
  records.reduce<IconMapping>((accumulator, record) => {
    const iconComponent = resolveIconComponent(record.icon);
    if (iconComponent) {
      accumulator[record.name] = iconComponent;
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
}: TransactionModalProps): JSX.Element | null {
  const [apiCategories, setApiCategories] = useState<CategoryRecord[]>([]);
  const [categoryFetchState, setCategoryFetchState] = useState<
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



  // Unified handler to update display and push normalized raw to parent
  const handleNumericInput = useCallback(
    (fieldName: 'amount' | 'toAmount') =>
      (next: string) => {
        const { display, normalized, deferCommit } = coerceAndFormatNumber(next);
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
    [onChange]
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

  const handleSave = useCallback(
    (createAnother: boolean) => {
      onSave?.(createAnother);
    },
    [onSave]
  );

  const accountOptions = useMemo(
    () =>
      (availableAccounts ?? []).filter(
        (accountOption) => accountOption && accountOption !== 'All'
      ),
    [availableAccounts]
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
    return buildCategoryTreeFromRecords(apiCategories);
  }, [apiCategories]);

  const apiCategoryColorsMap = useMemo<ColorMapping>(() => {
    if (apiCategories.length === 0) {
      return {};
    }
    return buildCategoryColorMapFromRecords(apiCategories);
  }, [apiCategories]);

  const apiCategoryIcons = useMemo<IconMapping>(() => {
    if (apiCategories.length === 0) {
      return {};
    }
    return buildCategoryIconMapFromRecords(apiCategories);
  }, [apiCategories]);

  const ensureCategoriesLoaded = useCallback(async () => {
    if (categoryFetchState === 'loading') {
      return;
    }
  
    try {
      setCategoryFetchState('loading');
      const response = await categoryService.fetchCategories();
      const mapped = response
        .map(mapApiCategoryToRecord)
        .filter((item): item is CategoryRecord => item !== null);
  
      setApiCategories(mapped);
  
      setCategoryFetchState('success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('TransactionModal: failed to fetch categories', error);
      setCategoryFetchState('error');
    }
  }, [categoryFetchState]);

  useEffect(() => {
    if (show) {
      void ensureCategoriesLoaded();
    }
  }, [show, ensureCategoriesLoaded]);

  const resolvedAccountTree = useMemo<CategoryTree>(() => {
    const source = accountTree ?? {};
    if (Object.keys(source).length > 0) {
      return source;
    }
    return Object.fromEntries(
      accountOptions.map((accountOption) => [accountOption, [] as string[]])
    );
  }, [accountTree, accountOptions]);

  const resolvedAccountColors = useMemo<ColorMapping>(() => {
    const source = accountColors ?? {};
    if (Object.keys(source).length > 0) {
      return source;
    }
    return {};
  }, [accountColors]);

  const resolvedAccountIcons = useMemo<IconMapping>(() => {
    const source = accountIcons ?? {};
    if (Object.keys(source).length > 0) {
      return source;
    }
    return {};
  }, [accountIcons]);

  const resolvedCategoryTree = useMemo<CategoryTree>(() => {
    if (categoryTree && Object.keys(categoryTree).length > 0) {
      return categoryTree;
    }
    if (Object.keys(apiCategoryTree).length > 0) {
      return apiCategoryTree;
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

  const createSingleSelectSetter = useCallback(
    (fieldName: 'account' | 'toAccount' | 'category') =>
      (nextSelection?: string[]) => {
        if (!transaction || !onChange) {
          return;
        }
        const normalized = Array.isArray(nextSelection) ? nextSelection : [];
        const sanitized = normalized.filter(
          (item): item is string => !!item && item !== 'All'
        );
        const nextValue = sanitized[sanitized.length - 1] ?? '';
        onChange({
          target: {
            name: fieldName,
            value: nextValue,
          },
        });
      },
    [transaction, onChange]
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
                            transaction.account ? [transaction.account] : []
                          }
                          setSelectedCategories={handleAccountSelect}
                          categoryTree={resolvedAccountTree}
                          parentCategoryColors={resolvedAccountColors}
                          categoryIcons={accountIconsForDropdown}
                          allCategories={accountOptions}
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
                            transaction.toAccount ? [transaction.toAccount] : []
                          }
                          setSelectedCategories={handleToAccountSelect}
                          categoryTree={resolvedAccountTree}
                          parentCategoryColors={resolvedAccountColors}
                          categoryIcons={accountIconsForDropdown}
                          allCategories={accountOptions}
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
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="account">
                    <Form.Label>Account</Form.Label>
                    <SingleCategoryDropdown
                      selectedCategories={
                        transaction.account ? [transaction.account] : []
                      }
                      setSelectedCategories={handleAccountSelect}
                      categoryTree={resolvedAccountTree}
                      parentCategoryColors={resolvedAccountColors}
                      categoryIcons={accountIconsForDropdown}
                      allCategories={accountOptions}
                      entityLabelSingular="account"
                      entityLabelPlural="accounts"
                      searchPlaceholder="Search account..."
                      clearSelectedLabel="Clear selection"
                    />
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
                    categoryTree={resolvedCategoryTree}
                    parentCategoryColors={resolvedCategoryColorsMap}
                    categoryIcons={categoryIconsForSelect}
                    allCategories={resolvedCategoryOptions}
                    entityLabelSingular="category"
                    entityLabelPlural="categories"
                    searchPlaceholder="Search category..."
                    clearSelectedLabel="Clear selection"
                    onDropdownOpen={() => {
                      void ensureCategoriesLoaded();
                    }}
                  />
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
