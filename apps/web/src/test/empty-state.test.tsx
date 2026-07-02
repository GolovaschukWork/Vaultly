import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/empty-state';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('EmptyState', () => {
  it('renders rooms variant', () => {
    render(<EmptyState variant="rooms" />);
    expect(screen.getByText('common:emptyRooms')).toBeInTheDocument();
    expect(screen.getByText('common:emptyRoomsDescription')).toBeInTheDocument();
  });

  it('renders folder variant with action', () => {
    render(<EmptyState variant="folder" action={<button>Create</button>} />);
    expect(screen.getByText('common:emptyFolder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});
