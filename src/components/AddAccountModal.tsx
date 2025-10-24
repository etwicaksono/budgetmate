import React, { useMemo, useRef, useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Modal, Form, Button, Row, Col, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import * as FaIcons from 'react-icons/fa';
import { FaWallet, FaMoneyBillWave, FaUniversity, FaInfoCircle } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { SingleCategoryDropdown } from '../features/transactions/SingleCategoryDropdown';
import { formatNumberDisplayFromValue, coerceAndFormatNumber } from '../utils/numericInput';

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
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ show, onHide, onSubmit, title = 'Add Account' }) => {
  const [newAccountForm, setNewAccountForm] = useState<NewAccountForm>(() => createEmptyAccountForm());
  const [colorHexInput, setColorHexInput] = useState<string>(() => createEmptyAccountForm().color);
  const [initialAmountDisplay, setInitialAmountDisplay] = useState<string>('');
  const [isEditingInitialAmount, setIsEditingInitialAmount] = useState<boolean>(false);

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

  const selectedAccountType: AccountTypeMeta =
    ACCOUNT_TYPES.find((type) => type.value === newAccountForm.accountType) ?? ACCOUNT_TYPES[0];
  const SelectedAccountTypeIcon = selectedAccountType.icon ?? FaWallet;

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedName = newAccountForm.name.trim();
    if (!trimmedName) return;
    onSubmit({ ...newAccountForm, name: trimmedName });
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
                <InputGroup>
                  <InputGroup.Text>
                    <SelectedAccountTypeIcon size={16} />
                  </InputGroup.Text>
                  <Form.Select
                    value={newAccountForm.accountType}
                    onChange={handleFormFieldChange('accountType')}
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Form.Select>
                </InputGroup>
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
          <Button variant="outline-secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={!newAccountForm.name.trim()}>
            Create account
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddAccountModal;