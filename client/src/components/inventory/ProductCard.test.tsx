import { fireEvent, render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import type { Product } from '../../types';

describe('ProductCard', () => {
  it('adjusts chip inventory inline using box and bucket controls', () => {
    const product: Product = {
      id: 'product-chip',
      name: 'Chip Blend',
      unitSize: 'chip',
      supplierType: 'OPEN_SOURCE',
      inventoryItems: [
        {
          id: 'item-chip',
          quantity: 4,
          status: 'OPEN',
          notes: '{"boxes":2,"buckets":2}',
          location: { id: 'loc-1', name: 'Trailer' },
        },
      ],
    };

    const onAdjustChipUnit = jest.fn();

    render(
      <ProductCard
        product={product}
        selectedLocation="loc-1"
        isEditable
        onAdjustChipUnit={onAdjustChipUnit}
      />
    );

    fireEvent.click(screen.getAllByText('+')[1]);

    expect(onAdjustChipUnit).toHaveBeenCalledWith(product, 'loc-1', 'BOX', 1);
  });

  it('adjusts inventory inline when an editable product is tapped in a specific location', () => {
    const product: Product = {
      id: 'product-1',
      name: 'Test Product',
      supplierType: 'OPEN_SOURCE',
      inventoryItems: [
        {
          id: 'item-1',
          quantity: 4,
          status: 'OPEN',
          location: { id: 'loc-1', name: 'Trailer' },
        },
      ],
    };

    const onIncrement = jest.fn();
    const onCardClick = jest.fn();

    render(
      <ProductCard
        product={product}
        selectedLocation="loc-1"
        isEditable
        onCardClick={onCardClick}
        onIncrement={onIncrement}
      />
    );

    fireEvent.click(screen.getByText('Test Product'));

    expect(onIncrement).toHaveBeenCalledWith(product, 'loc-1');
    expect(onCardClick).not.toHaveBeenCalled();
  });
});
