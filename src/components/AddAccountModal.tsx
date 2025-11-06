import React, { useMemo, useRef, useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Modal, Form, Button, Row, Col, InputGroup, OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';
import * as FaIcons from 'react-icons/fa';
import { FaWallet, FaMoneyBillWave, FaUniversity, FaInfoCircle,FaPiggyBank, FaCreditCard,FaGift,FaShieldAlt,FaChartLine,FaHandHoldingUsd,FaHome,FaExclamationTriangle} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { SingleCategoryDropdown } from '../views/Transactions/SingleCategoryDropdown';
import { formatNumberDisplayFromValue, coerceAndFormatNumber } from '../utils/numericInput';
import accountService, { CreateAccountRequest, UpdateAccountRequest } from '../services/accountService';

type UsabilityOption = 'USABLE' | 'PROTECTED';
const USABILITY_OPTIONS: readonly UsabilityOption[] = ['USABLE', 'PROTECTED'] as const;

interface AccountTypeMeta {
  value: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

const ACCOUNT_TYPES: AccountTypeMeta[] = [
  { value: 'General', label: 'General', icon: FaWallet as React.ComponentType<{ size?: number }> },
  { value: 'Cash', label: 'Cash', icon: FaMoneyBillWave as React.ComponentType<{ size?: number }> },
  { value: 'Checking account', label: 'Checking account', icon: FaUniversity as React.ComponentType<{ size?: number }> },
  { value: 'Credit account', label: 'Credit account', icon: FaCreditCard as React.ComponentType<{ size?: number }> },
  { value: 'Savings account', label: 'Savings account', icon: FaPiggyBank as React.ComponentType<{ size?: number }> },
  { value: 'Bonus', label: 'Bonus', icon: FaGift as React.ComponentType<{ size?: number }> },
  { value: 'Life insurance account', label: 'Life insurance account', icon: FaShieldAlt as React.ComponentType<{ size?: number }> },
  { value: 'Invesment account', label: 'Invesment account', icon: FaChartLine as React.ComponentType<{ size?: number }> },
  { value: 'Loan', label: 'Loan', icon: FaHandHoldingUsd as React.ComponentType<{ size?: number }> },
  { value: 'Mortgage', label: 'Mortgage', icon: FaHome as React.ComponentType<{ size?: number }> },
  { value: 'Overdraft account', label: 'Overdraft account', icon: FaExclamationTriangle as React.ComponentType<{ size?: number }> },
];

export interface NewAccountForm {
  name: string;
  color: string;
  accountType: string;
  initialAmount: string;
  currency: string;
  excludeFromStatistics: boolean;
  iconKey: string;
  isActive: boolean;
  usability: UsabilityOption;
}

const DEFAULT_ACCOUNT_ICON_KEY = 'FaWallet';
const ICON_EXCLUSIONS = new Set<string>(['IconContext']);

const createEmptyAccountForm = (): NewAccountForm => ({
  name: '',
  color: '#ce9600',
  accountType: 'General',
  initialAmount: '',
  currency: 'IDR',
  excludeFromStatistics: false,
  iconKey: DEFAULT_ACCOUNT_ICON_KEY,
  isActive: true,
  usability: 'USABLE',
});

export interface AddAccountModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (form: NewAccountForm) => void;
  title?: string;
  initialValue?: NewAccountForm;
  accountId?: string; // ID of the account to edit (if in edit mode)
  isEditMode?: boolean; // Flag to indicate if modal is in edit mode
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ show, onHide, onSubmit, title = 'Add Account', initialValue, accountId, isEditMode = false }) => {
  const [newAccountForm, setNewAccountForm] = useState<NewAccountForm>(() => initialValue || createEmptyAccountForm());
  const [colorHexInput, setColorHexInput] = useState<string>(() => initialValue?.color || createEmptyAccountForm().color);
  const [initialAmountDisplay, setInitialAmountDisplay] = useState<string>('');
  const [isEditingInitialAmount, setIsEditingInitialAmount] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const colorPickerInputRef = useRef<HTMLInputElement>(null);

  const availableIconKeys = useMemo<string[]>(
    () => (Object.keys(FaIcons) as string[]).filter((key) => key.startsWith('Fa') && !ICON_EXCLUSIONS.has(key)),
    []
  );

  const defaultIconKey = useMemo<string>(
    () => availableIconKeys.find((key) => key === DEFAULT_ACCOUNT_ICON_KEY) ?? DEFAULT_ACCOUNT_ICON_KEY,
    [availableIconKeys]
  );

  const iconDropdownIcons = useMemo<Record<string, IconType>>(() => {
    const lib = FaIcons as Record<string, IconType | undefined>;
    const map: Record<string, IconType> = {};
    availableIconKeys.forEach((key) => {
      const icon = lib[key];
      if (icon) {
        map[key] = icon;
      }
    });
    return map;
  }, [availableIconKeys]);

  const iconColorMap = useMemo<Record<string, string>>(
    () =>
      availableIconKeys.reduce<Record<string, string>>((acc, key) => {
        acc[key] = newAccountForm.color;
        return acc;
      }, {}),
    [availableIconKeys, newAccountForm.color]
  );

  const accountTypeTree = useMemo<Record<string, string[]>>(
    () =>
      ACCOUNT_TYPES.reduce<Record<string, string[]>>((acc, type) => {
        acc[type.value] = [];
        return acc;
      }, {}),
    []
  );

  const accountTypeColors = useMemo<Record<string, string>>(
    () =>
      ACCOUNT_TYPES.reduce<Record<string, string>>((acc, type) => {
        acc[type.value] = newAccountForm.color;
        return acc;
      }, {}),
    [newAccountForm.color]
  );

  const accountTypeIcons = useMemo<Record<string, IconType | undefined>>(
    () =>
      ACCOUNT_TYPES.reduce<Record<string, IconType | undefined>>((acc, type) => {
        acc[type.value] = type.icon as IconType;
        return acc;
      }, {}),
    []
  );

  const accountTypeOptions = useMemo<string[]>(
    () => ACCOUNT_TYPES.map((type) => type.value),
    []
  );


  // Reset form when modal opens with initialValue
  useEffect(() => {
    if (show && initialValue) {
      setNewAccountForm(initialValue);
      setColorHexInput(initialValue.color);
      setInitialAmountDisplay(formatNumberDisplayFromValue(initialValue.initialAmount));
      setIsEditingInitialAmount(false);
    } else if (show && !initialValue) {
      setNewAccountForm(createEmptyAccountForm());
      const emptyForm = createEmptyAccountForm();
      setColorHexInput(emptyForm.color);
      setInitialAmountDisplay('');
      setIsEditingInitialAmount(false);
    }
  }, [show, initialValue]);

  useEffect(() => {
    if (!isEditingInitialAmount) {
      setInitialAmountDisplay(formatNumberDisplayFromValue(newAccountForm.initialAmount));
    }
  }, [newAccountForm.initialAmount, isEditingInitialAmount]);

  const openColorPicker = (event?: React.MouseEvent): void => {
    const picker = colorPickerInputRef.current;
    if (!picker) return;
    if (event) event.preventDefault();
    picker.click();
  };

  const handleFormFieldChange = (field: keyof NewAccountForm) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { value } = event.target;
    setNewAccountForm((previous) => ({
      ...previous,
      [field]: value as never,
    }));
  };

  const handleColorTextChange = (event: ChangeEvent<HTMLInputElement>): void => {
    let value = event.target.value.replace(/[^#0-9a-fA-F]/g, '');
    if (!value.startsWith('#')) {
      value = `#${value}`;
    }
    value = value.slice(0, 7);
    setColorHexInput(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setNewAccountForm((previous) => ({
        ...previous,
        color: value,
      }));
    }
  };

  const handleColorPickerChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setColorHexInput(value);
    setNewAccountForm((previous) => ({
      ...previous,
      color: value,
    }));
  };

  const handleExcludeToggle = (event: ChangeEvent<HTMLInputElement>): void => {
    const { checked } = event.target;
    setNewAccountForm((previous) => ({
      ...previous,
      excludeFromStatistics: checked,
    }));
  };

  const handleInitialAmountInput = (next: string): void => {
    const { display, normalized, deferCommit } = coerceAndFormatNumber(next);
    setInitialAmountDisplay(display);
    setIsEditingInitialAmount(true);
    if (!deferCommit) {
      setNewAccountForm((prev) => ({ ...prev, initialAmount: normalized }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedName = newAccountForm.name.trim();
    if (!trimmedName) return;

    setError(null);
    setIsLoading(true);

    try {
      const initialAmount = parseFloat(newAccountForm.initialAmount) || 0;

      if (isEditMode && accountId) {
        // Update existing account
        const updatePayload: UpdateAccountRequest = {
          name: trimmedName,
          icon: newAccountForm.iconKey,
          color: newAccountForm.color,
          active: newAccountForm.isActive,
          account_type: newAccountForm.accountType,
          initial_amount: initialAmount,
          usability: newAccountForm.usability,
          group_id: null,
        };

        await accountService.updateAccount(accountId, updatePayload);
        onSubmit({ ...newAccountForm, name: trimmedName });
        onHide();
      } else {
        // Create new account
        const nextPersonalId = accountService.getNextPersonalId();
        const createPayload: CreateAccountRequest = {
          personal_id: nextPersonalId,
          name: trimmedName,
          icon: newAccountForm.iconKey,
          color: newAccountForm.color,
          active: newAccountForm.isActive,
          account_type: newAccountForm.accountType,
          initial_amount: initialAmount,
          usability: newAccountForm.usability,
          group_id: null,
        };

        await accountService.createAccount(createPayload);
        onSubmit({ ...newAccountForm, name: trimmedName });
        onHide();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : isEditMode ? 'Failed to update account' : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      className="add-account-modal"
    >
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}
          <Row className="g-3">
            <Col md={6}>
              <Form.Group controlId="addAccountName" className="mb-3 mb-md-0">
                <Form.Label>
                  Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Account name"
                  value={newAccountForm.name}
                  onChange={handleFormFieldChange('name')}
                  autoFocus
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="addAccountColor" className="mb-3 mb-md-0">
                <Form.Label>Color</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '50%',
                        backgroundColor: newAccountForm.color,
                        border: '1px solid #dee2e6',
                      }}
                    />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="#ce9600"
                    value={colorHexInput}
                    onChange={handleColorTextChange}
                    onClick={openColorPicker}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        openColorPicker();
                      }
                    }}
                  />
                  <Form.Control
                    ref={colorPickerInputRef}
                    type="color"
                    value={newAccountForm.color}
                    title="Pick a color"
                    onChange={handleColorPickerChange}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '8px',
                      width: '180px',
                      height: '42px',
                      padding: 0,
                      margin: 0,
                      opacity: 0,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onBlur={() => {
                      if (colorPickerInputRef.current) {
                        colorPickerInputRef.current.style.top = '8px';
                      }
                    }}
                    tabIndex={-1}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mt-1">
            <Col md={6}>
              <Form.Group controlId="addAccountType">
                <Form.Label>Account type</Form.Label>
                <SingleCategoryDropdown
                  selectedCategories={
                    newAccountForm.accountType ? [newAccountForm.accountType] : []
                  }
                  setSelectedCategories={(values?: string[]) => {
                    const nextValue = values?.[0] ?? ACCOUNT_TYPES[0].value;
                    setNewAccountForm((prev) => ({ ...prev, accountType: nextValue }));
                  }}
                  categoryTree={accountTypeTree}
                  parentCategoryColors={accountTypeColors}
                  categoryIcons={accountTypeIcons}
                  allCategories={accountTypeOptions}
                  entityLabelSingular="account type"
                  entityLabelPlural="account types"
                  searchPlaceholder="Search account type..."
                  clearSelectedLabel="Clear selection"
                  showClearButton={false}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="addAccountAmount">
                <Form.Label>Initial Amount</Form.Label>
                <InputGroup>
                  <InputGroup.Text>{newAccountForm.currency}</InputGroup.Text>
                  <Form.Control
                    type="text"
                    name="initialAmount"
                    value={initialAmountDisplay}
                    onChange={(event) => handleInitialAmountInput(event.target.value)}
                    onBlur={() => {
                      const { normalized } = coerceAndFormatNumber(initialAmountDisplay);
                      setNewAccountForm((prev) => ({ ...prev, initialAmount: normalized }));
                      setIsEditingInitialAmount(false);
                    }}
                    placeholder="Enter amount"
                    autoComplete="off"
                    inputMode="decimal"
                  />
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mt-1">
            <Col md={6}>
              <Form.Group className="mb-3" controlId="addAccountIcon">
                <Form.Label>Icon</Form.Label>
                <SingleCategoryDropdown
                  selectedCategories={
                    newAccountForm.iconKey ? [newAccountForm.iconKey] : [defaultIconKey]
                  }
                  setSelectedCategories={(values?: string[]) => {
                    const nextValue = values?.[0] ?? defaultIconKey;
                    setNewAccountForm((prev) => ({ ...prev, iconKey: nextValue }));
                  }}
                  categoryTree={{}}
                  parentCategoryColors={iconColorMap}
                  categoryIcons={iconDropdownIcons}
                  allCategories={availableIconKeys}
                  entityLabelSingular="icon"
                  entityLabelPlural="icons"
                  clearSelectedLabel="Clear icon"
                  searchPlaceholder="Search icons..."
                  showClearButton={false}
                  triggerAvatarSize={24}
                  triggerIconSize={14}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="addAccountUsability">
                <Form.Label>Usability</Form.Label>
                <Form.Select
                  value={newAccountForm.usability}
                  onChange={handleFormFieldChange('usability')}
                >
                  {USABILITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="addAccountActive">
            <Form.Label>Is Active</Form.Label>
            <Form.Check
              type="switch"
              id="addAccountActiveSwitch"
              label="Active"
              checked={newAccountForm.isActive}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setNewAccountForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
          </Form.Group>

          <div className="mt-3">
            <Form.Check
              type="switch"
              id="addAccountExclude"
              label={
                <span className="d-inline-flex align-items-center">
                  Exclude from statistics
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip id="exclude-tip">Excluded accounts will not affect totals.</Tooltip>}
                  >
                    <span
                      className="text-muted ms-2"
                      role="button"
                      tabIndex={0}
                      style={{ lineHeight: 0, cursor: 'pointer' }}
                    >
                      <FaInfoCircle />
                    </span>
                  </OverlayTrigger>
                </span>
              }
              checked={newAccountForm.excludeFromStatistics}
              onChange={handleExcludeToggle}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            disabled={!newAccountForm.name.trim() || isLoading}
          >
            {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update account' : 'Create account')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddAccountModal;