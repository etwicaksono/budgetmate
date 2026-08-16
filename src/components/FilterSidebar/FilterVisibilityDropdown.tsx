import { useState } from 'react';
import { Dropdown, Form } from 'react-bootstrap';
import { RiListSettingsLine } from 'react-icons/ri';
import { renderIcon } from './FilterSidebar.utils';

export interface FilterVisibilityItem<K extends string = string> {
  /** Key stored in the visibility map */
  id: K;
  label: string;
}

interface FilterVisibilityDropdownProps<K extends string> {
  /** Filters this sidebar actually renders — only these are listed */
  items: ReadonlyArray<FilterVisibilityItem<K>>;
  visibility: Record<K, boolean>;
  onToggle: (id: K) => void;
}

/**
 * Gear dropdown listing which filters a sidebar shows.
 *
 * FilterHeader carries the equivalent control for the transactions sidebar, but
 * its checkbox list is hard-coded to that page's filters. This component takes
 * the list as a prop so sidebars with a different set of filters (analytics,
 * budgets) can offer the same behaviour without listing filters they lack.
 */
export function FilterVisibilityDropdown<K extends string>({
  items,
  visibility,
  onToggle,
}: FilterVisibilityDropdownProps<K>) {
  const [show, setShow] = useState(false);

  return (
    <Dropdown show={show} onToggle={(isOpen: boolean | null) => setShow(isOpen ?? false)}>
      <Dropdown.Toggle
        as="button"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor = '#f3f4f6';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label="Configure filters"
        title="Configure filters"
      >
        {renderIcon(RiListSettingsLine, { size: 20, color: '#6b7280' })}
      </Dropdown.Toggle>

      <Dropdown.Menu
        align="end"
        style={{
          minWidth: '280px',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e5e7eb',
          marginTop: '8px',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <h6 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            Filter Settings
          </h6>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
            Configure visible filters
          </p>
        </div>
        <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />
        <div>
          {items.map((item) => (
            <Form.Check
              key={item.id}
              type="checkbox"
              id={`filter-${item.id}`}
              label={item.label}
              checked={visibility[item.id]}
              onChange={() => onToggle(item.id)}
              style={{ marginBottom: '10px', fontSize: '14px' }}
              className="custom-widget-checkbox"
            />
          ))}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}
