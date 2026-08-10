(function initCbvNavGeometry(global) {
  'use strict';

  function centerX(rect) {
    return (rect.left + rect.right) / 2;
  }

  function centerY(rect) {
    return (rect.top + rect.bottom) / 2;
  }

  function horizontalGap(buttonRect, counterRect, side) {
    return side === 'left'
      ? counterRect.left - buttonRect.right
      : buttonRect.left - counterRect.right;
  }

  function findPositionalBranchButtons(counterRect, buttons, options = {}) {
    const maxHorizontalGap = options.maxHorizontalGap ?? 96;
    const maxVerticalOffset = options.maxVerticalOffset
      ?? Math.max(16, (counterRect.bottom - counterRect.top) * 0.75);
    const counterCenterX = centerX(counterRect);
    const counterCenterY = centerY(counterRect);

    function nearestOnSide(side) {
      return buttons
        .map(entry => {
          const buttonCenterX = centerX(entry.rect);
          const verticalOffset = Math.abs(centerY(entry.rect) - counterCenterY);
          const gap = horizontalGap(entry.rect, counterRect, side);
          return { ...entry, buttonCenterX, verticalOffset, gap };
        })
        .filter(entry => {
          const isOnSide = side === 'left'
            ? entry.buttonCenterX < counterCenterX
            : entry.buttonCenterX > counterCenterX;
          return isOnSide
            && entry.verticalOffset <= maxVerticalOffset
            && entry.gap >= -4
            && entry.gap <= maxHorizontalGap;
        })
        .sort((a, b) => {
          if (a.gap !== b.gap) return a.gap - b.gap;
          return a.verticalOffset - b.verticalOffset;
        })[0] || null;
    }

    const left = nearestOnSide('left');
    const right = nearestOnSide('right');
    if (!left || !right || left.button === right.button) return null;

    return {
      prevBtn: left.button,
      nextBtn: right.button,
    };
  }

  global.cbvFindPositionalBranchButtons = findPositionalBranchButtons;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { findPositionalBranchButtons };
  }
})(globalThis);
